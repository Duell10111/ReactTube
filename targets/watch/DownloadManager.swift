//
//  DownloadManager.swift
//  watch
//
//  Created by Konstantin Späth on 17.06.24.
//

import Foundation
import SwiftData

/// UI, model access and transfer reconciliation share the main actor.
@MainActor
@Observable
class DownloadManager {
  static let shared = DownloadManager()

  var activeDownloads : [ActiveDownload] = []
  var progressDownloads: [String: Double] = [:]

  var pendingDownloads: Set<Video> = []
  /// Video ids waiting for fresh stream metadata from the phone before they can be downloaded.
  var awaitingMetadata: Set<String> = []
  /// Failure reasons are persisted with the requested video IDs.
  var failedDownloads: [String: String] = [:]
  /// Durable task keys for running audio and artwork downloads.
  private var downloadKeys: [String: String] = [:]
  private var coverKeys: [String: String] = [:]
  private var generations: [String: UUID] = [:]
  /// Videos already restarted once after the OS lost their task.
  private var restartedIDs: Set<String> = []
  /// Requests whose combined outcome is reported once every title has one.
  private var batches = DownloadBatches()
  /// Reports of finished batches that are still being handed to the system.
  private var reports: [String: Task<Void, Never>] = [:]
  private let notifications = DownloadNotifications.shared

  private let transport = WatchDownloadTransport()
  private var requestedIDs: Set<String> = []
  private var restored = false
  private var restoring = false
  private var refreshing = false

  private struct QueueState: Codable {
    var requestedIDs: Set<String>
    var failures: [String: String]
    /// Optional so queue files written before this field still decode.
    var restartedIDs: Set<String>?
    var batches: DownloadBatches?
  }

  private init() {
    let queueFile = transport.stagingDirectory.appendingPathComponent("queue.json")
    if let data = try? Data(contentsOf: queueFile), let state = try? JSONDecoder().decode(QueueState.self, from: data) {
      requestedIDs.formUnion(state.requestedIDs)
      failedDownloads.merge(state.failures, uniquingKeysWith: { current, _ in current })
      restartedIDs.formUnion(state.restartedIDs ?? [])
      batches = state.batches ?? DownloadBatches()
    }

    transport.onProgress = { [weak self] job, progress in
      guard let self, self.generations[job.videoID] == job.generation, job.kind == "audio" else { return }
      self.progressDownloads[job.videoID] = progress
      self.notifyProgress()
    }
    transport.onCompletion = { [weak self] job, file, error in
      self?.complete(job: job, file: file, error: error) ?? false
    }
  }

  private func persistQueue() {
    do {
      let state = QueueState(requestedIDs: requestedIDs, failures: failedDownloads, restartedIDs: restartedIDs, batches: batches)
      try JSONEncoder().encode(state).write(to: transport.stagingDirectory.appendingPathComponent("queue.json"), options: .atomic)
    } catch {
      WatchLog.shared.error("Download", "Could not persist download queue: \(error.localizedDescription)")
    }
  }

  func restore() async {
    guard !restored, !restoring, let context = DataController.shared.container?.mainContext else { return }
    restoring = true
    for video in (try? context.fetch(FetchDescriptor<Video>())) ?? [] where video.downloaded {
      if video.fileURL.map({ FileManager.default.fileExists(atPath: getDownloadDirectory().appendingPathComponent($0).path) }) != true {
        // Only reset the state; downloading again is left to the user.
        video.downloaded = false
        video.fileURL = nil
      }
    }
    do { if context.hasChanges { try context.save() } }
    catch { WatchLog.shared.error("Download", "Could not reconcile local files: \(error.localizedDescription)") }
    for job in transport.jobs.values {
      generations[job.videoID] = job.generation
      if job.kind == "audio" {
        downloadKeys[job.videoID] = job.id
        activeDownloads.append(ActiveDownload(id: job.videoID))
        requestedIDs.insert(job.videoID)
      } else { coverKeys[job.videoID] = job.id }
    }
    await transport.reconcile()
    for id in Array(requestedIDs) where !failedDownloads.keys.contains(id) && downloadKeys[id] == nil {
      if let video = existingVideo(id: id), !video.downloaded { enqueue(video) }
      else { requestedIDs.remove(id) }
    }
    // Batch titles nothing works on anymore get the outcome they ended with,
    // so a batch cannot stay open forever after an interrupted process.
    let untracked = batches.pendingIDs.subtracting(requestedIDs)
    let completed = untracked.filter { existingVideo(id: $0)?.downloaded == true }
    batches.record(.completed, for: completed)
    batches.record(.failed, for: untracked.filter { failedDownloads[$0] != nil })
    batches.record(.cancelled, for: untracked)
    finishBatches()
    restoring = false
    restored = true
    persistQueue()
    checkDownloads()
    notifyProgress()
  }

  /// Reconciles again when the app returns to the foreground, so a task the OS
  /// dropped while the app was suspended does not stay visible as running.
  func refresh() async {
    guard restored, !restoring, !refreshing, DataController.shared.container != nil else { return }
    refreshing = true
    await transport.reconcile()
    refreshing = false
    checkDownloads()
  }

  func handleBackgroundEvents(identifier: String) async {
    await restore()
    await transport.waitForBackgroundEvents(identifier: identifier)
    await waitForReports()
  }

  /// Background handlers wait for this, so a notification is scheduled before
  /// the system suspends the app again.
  func waitForReports() async {
    while let report = reports.values.first {
      await report.value
    }
  }

  /// Queues the videos as one batch so their outcome can be reported together.
  /// Videos that are already downloaded are not part of the batch.
  func download(_ videos: [Video], as kind: DownloadBatch.Kind, name: String?) {
    let missing = videos.filter { !$0.downloaded }
    if !missing.isEmpty { notifications.requestAuthorizationIfNeeded() }
    // The batch exists before queueing, so an immediate failure is recorded.
    batches.add(kind: kind, name: name, videoIDs: missing.map(\.id))
    missing.forEach { enqueue($0) }
    persistQueue()
    checkDownloads()
  }

  /// Queues a download. Videos without a valid download URL request fresh
  /// metadata first; `videoMetadataUpdated` continues once it arrives.
  private func enqueue(_ video: Video) {
    guard !video.downloaded, !awaitingMetadata.contains(video.id), !pendingDownloads.contains(video), !activeDownloads.contains(where: { $0.id == video.id }) else { return }
    requestedIDs.insert(video.id)
    failedDownloads.removeValue(forKey: video.id)
    defer { persistQueue() }
    if video.downloadURL != nil, let validUntil = video.validUntil, validUntil > Date() {
      pendingDownloads.insert(video)
    } else {
      awaitingMetadata.insert(video.id)
      requestVideo(id: video.id)
    }
  }

  func videoMetadataUpdated(id: String) {
    guard awaitingMetadata.remove(id) != nil else { return }
    guard let video = existingVideo(id: id), !video.downloaded else {
      // Deleted or downloaded in the meantime; its batches must not wait for it.
      requestedIDs.remove(id)
      record(existingVideo(id: id) == nil ? .cancelled : .completed, for: [id])
      persistQueue()
      return
    }
    guard video.downloadURL != nil, let expiry = video.validUntil, expiry > Date() else {
      fail(id, DownloadMessages.unavailable)
      persistQueue()
      notifyProgress()
      return
    }
    pendingDownloads.insert(video)
    checkDownloads()
  }

  func videoMetadataFailed(id: String) {
    guard awaitingMetadata.remove(id) != nil else { return }
    fail(id, WatchStatus.shared.isReachable ? DownloadMessages.metadataFailed : DownloadMessages.connectionFailed)
    persistQueue()
    notifyProgress()
  }

  /// Removes the videos from all queues and cancels running downloads.
  func cancel(ids: Set<String>) {
    record(.cancelled, for: ids)
    discard(ids: ids)
  }

  /// Stops all work for the videos without recording a batch outcome.
  private func discard(ids: Set<String>) {
    pendingDownloads = pendingDownloads.filter { !ids.contains($0.id) }
    awaitingMetadata.subtract(ids)
    requestedIDs.subtract(ids)
    VideoMetadataRequests.shared.cancel(ids: ids)
    restartedIDs.subtract(ids)
    for id in ids {
      generations.removeValue(forKey: id)
      if let key = coverKeys.removeValue(forKey: id) {
        transport.cancel(key: key)
      }
      failedDownloads.removeValue(forKey: id)
      // Cancellation invalidates callbacks before the asynchronous OS cancellation.
      if let key = downloadKeys.removeValue(forKey: id) {
        transport.cancel(key: key)
      }
      progressDownloads.removeValue(forKey: id)
    }
    activeDownloads.removeAll { ids.contains($0.id) }
    persistQueue()
    notifyProgress()
    checkDownloads()
  }

  /// Queues a failed download again; expired metadata is re-requested first.
  func retry(id: String) {
    let descriptor = FetchDescriptor<Video>(predicate: #Predicate { $0.id == id })
    guard let video = try? DataController.shared.container?.mainContext.fetch(descriptor).first else {
      failedDownloads.removeValue(forKey: id)
      record(.cancelled, for: [id])
      persistQueue()
      return
    }
    discard(ids: [id])
    // A retry belongs to the request it failed in while that is still open.
    if !batches.reopen(id) {
      batches.add(kind: .video, name: video.title, videoIDs: [id])
    }
    if video.downloaded {
      record(.completed, for: [id])
      persistQueue()
    } else {
      enqueue(video)
    }
    checkDownloads()
  }

  private func fail(_ id: String, _ reason: String) {
    failedDownloads[id] = reason
    record(.failed, for: [id])
  }

  private func record(_ outcome: DownloadBatch.Outcome, for ids: Set<String>) {
    batches.record(outcome, for: ids)
    finishBatches()
  }

  private func finishBatches() {
    for batch in batches.finished where reports[batch.id] == nil {
      guard let content = DownloadNotificationContent(batch: batch) else {
        batches.remove(id: batch.id)
        continue
      }
      // The batch is removed only after the system has the notification.
      reports[batch.id] = Task {
        await notifications.post(content, id: batch.id)
        batches.remove(id: batch.id)
        reports.removeValue(forKey: batch.id)
        persistQueue()
      }
    }
  }

  private func notifyProgress() {
    Task { @MainActor in
      LibrarySync.shared.downloadProgressChanged()
    }
  }

  func cancelAll() {
    VideoMetadataRequests.shared.cancel(ids: awaitingMetadata)
    generations.removeAll()
    restartedIDs.removeAll()
    // Reports already being scheduled finish on their own.
    batches.removeAll()
    coverKeys.removeAll()
    transport.cancelAll()
    requestedIDs.removeAll()
    pendingDownloads.removeAll()
    awaitingMetadata.removeAll()
    failedDownloads.removeAll()
    downloadKeys.removeAll()
    progressDownloads.removeAll()
    activeDownloads.removeAll()
    persistQueue()
    notifyProgress()
  }

  func downloadPlaylist(_ playlist: Playlist) {
    print("Downloading playlist \(playlist.id)")
    playlist.download = true
    download(playlist.orderedVideos, as: .playlist, name: playlist.title)
  }

  /// Starts the transfer right away. Callers go through `enqueue` so the
  /// parallel limit and the metadata refresh apply.
  @discardableResult
  private func downloadVideo(video: Video) -> Bool {
    let id = video.id
    let duration = video.durationMillis
    guard let streamURL = video.downloadURL, let expiry = video.validUntil, expiry > Date(), let uri = URL(string: streamURL) else {
      fail(id, DownloadMessages.unavailable)
      return false
    }
    let generation = UUID()
    generations[id] = generation
    let key = transport.start(videoID: id, kind: "audio", generation: generation, duration: duration, url: uri)
    guard let key else {
      generations.removeValue(forKey: id)
      fail(id, DownloadMessages.startFailed)
      return false
    }
    downloadKeys[id] = key
    activeDownloads.append(ActiveDownload(id: id))
    notifyProgress()

    if let coverURL = video.coverURL, let uri = URL(string: coverURL), uri.scheme == "https" || uri.scheme == "http" {
      coverKeys[id] = transport.start(videoID: id, kind: "cover", generation: generation, duration: duration, url: uri)
    }
    return true
  }

  /// Keeps the staging copy until both the final file and SwiftData are saved.
  private func complete(job: WatchDownloadJob, file: URL?, error: Error?) -> Bool {
    guard let context = DataController.shared.container?.mainContext else { return false }
    let id = job.videoID
    guard generations[id] == job.generation else { return true }
    guard let video = existingVideo(id: id) else {
      activeDownloads.removeAll { $0.id == id }
      requestedIDs.remove(id)
      record(.cancelled, for: [id])
      persistQueue()
      return true
    }
    defer { persistQueue(); notifyProgress(); checkDownloads() }
    var restart = false
    if let error, job.kind == "audio" {
      if case .taskMissing? = error as? WatchDownloadError, !restartedIDs.contains(id) {
        // The OS can drop a background task without a callback. Start over once
        // before reporting it; the generation ignores the old task's callbacks.
        restartedIDs.insert(id)
        restart = true
      } else {
        fail(id, DownloadMessages.reason(for: error))
        if DownloadMessages.isExpiredLink(error) {
          // A retry must request a fresh link instead of reusing the rejected one.
          video.downloadURL = nil
          try? context.save()
        }
      }
    } else if let file {
      let isAudio = job.kind == "audio"
      let directory = getDownloadVideoDirectory(id: id)
      let destination = directory.appendingPathComponent(isAudio ? "audio.mp4" : "cover.png")
      do {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        if FileManager.default.fileExists(atPath: destination.path) { try FileManager.default.removeItem(at: destination) }
        try FileManager.default.copyItem(at: file, to: destination)
        let relativePath = id + (isAudio ? "/audio.mp4" : "/cover.png")
        if isAudio { video.downloaded = true; video.fileURL = relativePath }
        else { video.coverURL = relativePath }
        try context.save()
        if isAudio {
          requestedIDs.remove(id)
          restartedIDs.remove(id)
          failedDownloads.removeValue(forKey: id)
          record(.completed, for: [id])
        }
      } catch {
        fail(id, DownloadMessages.saveFailed)
        activeDownloads.removeAll { $0.id == id }
        progressDownloads.removeValue(forKey: id)
        // Recovery can retry this staged file even if the process exits now.
        return false
      }
    }
    if job.kind == "audio" {
      activeDownloads.removeAll { $0.id == id }
      downloadKeys.removeValue(forKey: id)
      progressDownloads.removeValue(forKey: id)
    } else { coverKeys.removeValue(forKey: id) }
    if restart { enqueue(video) }
    return true
  }

  func checkDownloads() {
    // Deferred so callers can finish their own bookkeeping first. The task
    // inherits the main actor, so the queues are never mutated concurrently.
    Task {
      guard self.restored else {
        // A background launch can enqueue before any view has run the restore.
        // Restoring checks the queue again once it has finished.
        await self.restore()
        return
      }
      print("Checking downloads...")

      // Iterate over a snapshot so attempted downloads can be
      // removed from the pending set without mutating the collection being
      // enumerated.
      for video in Array(pendingDownloads) {
        if activeDownloads.count >= 4 {
          print("More than 4 downloads active. Exiting loop for now...")
          break
        }
        // A video that cannot start is recorded in `failedDownloads` and
        // leaves the queue, otherwise every check would retry it silently.
        downloadVideo(video: video)
        pendingDownloads.remove(video)
      }
      persistQueue()
    }
  }

  private func existingVideo(id: String) -> Video? {
    let descriptor = FetchDescriptor<Video>(predicate: #Predicate { $0.id == id })
    return try? DataController.shared.container?.mainContext.fetch(descriptor).first
  }


}

struct ActiveDownload {
  var id: String
  var image: Bool = false
  //var session: URLSessionDownloadTask
}

enum DownloadMessages {
  static var saveFailed: String { WatchStabilityCopy.text(.downloadSaveFailed) }
  static var startFailed: String { WatchStabilityCopy.text(.downloadStartFailed) }
  static var unavailable: String { WatchStabilityCopy.text(.downloadUnavailable) }
  static var metadataFailed: String { WatchStabilityCopy.text(.downloadMetadataFailed) }
  static var connectionFailed: String { WatchStabilityCopy.text(.downloadConnectionFailed) }

  /// Maps transfer errors to localized reasons instead of system descriptions.
  static func reason(for error: Error) -> String {
    if isExpiredLink(error) { return WatchStabilityCopy.text(.downloadLinkExpired) }
    switch error {
    case WatchDownloadError.httpStatus(let status):
      return String(format: WatchStabilityCopy.text(.downloadServerError), status)
    case WatchDownloadError.taskMissing:
      return WatchStabilityCopy.text(.downloadInterrupted)
    case let error as URLError where networkErrors.contains(error.code):
      return WatchStabilityCopy.text(.downloadNetworkFailed)
    default:
      return WatchStabilityCopy.text(.downloadFailed)
    }
  }

  /// Stream links are signed and time limited; YouTube rejects expired ones with 403.
  static func isExpiredLink(_ error: Error) -> Bool {
    guard case WatchDownloadError.httpStatus(let status) = error else { return false }
    return status == 403 || status == 410
  }

  private static let networkErrors: Set<URLError.Code> = [
    .notConnectedToInternet, .networkConnectionLost, .timedOut, .cannotConnectToHost,
    .cannotFindHost, .dnsLookupFailed, .dataNotAllowed, .internationalRoamingOff,
  ]
}

enum WatchDownloadError: Error, Equatable {
  /// The journal knows the job, but the session no longer has its task.
  case taskMissing
  case httpStatus(Int)
}

struct WatchDownloadJob: Codable {
  let id: String
  let videoID: String
  let kind: String
  let generation: UUID
  let duration: Int
}

/// The task description and journal survive process termination. The delegate
/// stages temporary files synchronously, before URLSession discards them.
@MainActor
final class WatchDownloadTransport: NSObject, URLSessionDownloadDelegate {
  static let sessionIdentifier = "com.duell10111.reacttube.watch.downloads.v2"
  nonisolated let stagingDirectory: URL
  private let background: Bool
  private let delegateQueue = OperationQueue()
  private(set) var jobs: [String: WatchDownloadJob] = [:]
  private var waiters: [UUID: CheckedContinuation<Void, Never>] = [:]
  private var finishedEvents = false
  var onProgress: ((WatchDownloadJob, Double) -> Void)?
  var onCompletion: ((WatchDownloadJob, URL?, Error?) -> Bool)?

  private lazy var session: URLSession = {
    let configuration = background
      ? URLSessionConfiguration.background(withIdentifier: Self.sessionIdentifier)
      : URLSessionConfiguration.ephemeral
    configuration.sessionSendsLaunchEvents = background
    configuration.waitsForConnectivity = true
    delegateQueue.maxConcurrentOperationCount = 1
    return URLSession(configuration: configuration, delegate: self, delegateQueue: delegateQueue)
  }()

  init(directory: URL = getDocumentsDirectory().appendingPathComponent("download-transfers"), background: Bool = true) {
    stagingDirectory = directory
    self.background = background
    super.init()
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      let journal = directory.appendingPathComponent("jobs.json")
      if FileManager.default.fileExists(atPath: journal.path) {
        jobs = try JSONDecoder().decode([String: WatchDownloadJob].self, from: Data(contentsOf: journal))
      }
    } catch {
      WatchLog.shared.error("Download", "Could not restore download journal: \(error.localizedDescription)")
    }
  }

  private func persist() throws {
    try JSONEncoder().encode(jobs).write(to: stagingDirectory.appendingPathComponent("jobs.json"), options: .atomic)
  }

  func start(videoID: String, kind: String, generation: UUID, duration: Int, url: URL) -> String? {
    let id = UUID().uuidString
    let task = session.downloadTask(with: url)
    task.taskDescription = id
    jobs[id] = WatchDownloadJob(id: id, videoID: videoID, kind: kind, generation: generation, duration: duration)
    do {
      try persist()
      task.resume()
      return id
    } catch {
      jobs.removeValue(forKey: id)
      task.cancel()
      WatchLog.shared.error("Download", "Could not persist download: \(error.localizedDescription)")
      return nil
    }
  }

  func cancel(key: String) {
    jobs.removeValue(forKey: key)
    try? persist()
    try? FileManager.default.removeItem(at: stagedFile(key))
    session.getAllTasks { tasks in
      tasks.filter { $0.taskDescription == key }.forEach { $0.cancel() }
    }
  }

  func cancelAll() {
    for key in Array(jobs.keys) { cancel(key: key) }
  }

  nonisolated private func stagedFile(_ key: String) -> URL {
    stagingDirectory.appendingPathComponent(key + ".complete")
  }

  /// Processes staged files first, then reconciles persisted jobs with OS tasks.
  func reconcile() async {
    let tasks = await session.allTasks
    // A task can leave the session before its delegate callback is delivered.
    // Draining the delegate queue first keeps such a task from counting as lost.
    await withCheckedContinuation { continuation in
      delegateQueue.addOperation { DispatchQueue.main.async { continuation.resume() } }
    }
    let taskKeys = Set(tasks.compactMap(\.taskDescription))
    for task in tasks where task.taskDescription.flatMap({ jobs[$0] }) == nil { task.cancel() }
    for key in Array(jobs.keys) {
      let staged = stagedFile(key)
      if FileManager.default.fileExists(atPath: staged.path) {
        deliver(key: key, file: staged, error: nil)
      } else if !taskKeys.contains(key) {
        deliver(key: key, file: nil, error: WatchDownloadError.taskMissing)
      }
    }
    // A cancelled task may have staged a file just before its cancellation.
    let files = (try? FileManager.default.contentsOfDirectory(at: stagingDirectory, includingPropertiesForKeys: nil)) ?? []
    for file in files where file.pathExtension == "complete" && jobs[file.deletingPathExtension().lastPathComponent] == nil {
      try? FileManager.default.removeItem(at: file)
    }
  }

  private func deliver(key: String, file: URL?, error: Error?) {
    guard let job = jobs[key] else {
      if let file { try? FileManager.default.removeItem(at: file) }
      return
    }
    guard onCompletion?(job, file, error) == true else { return }
    jobs.removeValue(forKey: key)
    do {
      try persist()
      if let file { try? FileManager.default.removeItem(at: file) }
    } catch {
      // Keep the staged copy until the journal records successful processing.
      jobs[key] = job
      WatchLog.shared.error("Download", "Could not finish download journal: \(error.localizedDescription)")
    }
  }

  /// Waits until URLSession reports the background events as finished. The
  /// timeout only guards against a missing callback; the system also ends the
  /// background task, which cancels the wait.
  func waitForBackgroundEvents(identifier: String, timeout: Duration = .seconds(20)) async {
    guard identifier == Self.sessionIdentifier else { return }
    _ = session
    if finishedEvents { finishedEvents = false; return }
    let id = UUID()
    let timer = Task {
      try? await Task.sleep(for: timeout)
      guard !Task.isCancelled, let waiter = waiters.removeValue(forKey: id) else { return }
      WatchLog.shared.warning("Download", "Background session events did not finish in time")
      waiter.resume()
    }
    defer { timer.cancel() }
    await withTaskCancellationHandler {
      await withCheckedContinuation { continuation in
        if Task.isCancelled { continuation.resume() } else { waiters[id] = continuation }
      }
    } onCancel: {
      Task { @MainActor in self.waiters.removeValue(forKey: id)?.resume() }
    }
  }

  nonisolated func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
    guard let key = downloadTask.taskDescription else { return }
    do {
      if let response = downloadTask.response as? HTTPURLResponse, !(200..<300).contains(response.statusCode) {
        throw WatchDownloadError.httpStatus(response.statusCode)
      }
      let staged = stagedFile(key)
      try FileManager.default.moveItem(at: location, to: staged)
      // Delegate callbacks use a serial queue. Dispatching to the main queue
      // preserves their order, including urlSessionDidFinishEvents.
      DispatchQueue.main.async { self.deliver(key: key, file: staged, error: nil) }
    } catch {
      DispatchQueue.main.async { self.deliver(key: key, file: nil, error: error) }
    }
  }

  nonisolated func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    guard let error, let key = task.taskDescription else { return }
    DispatchQueue.main.async { self.deliver(key: key, file: nil, error: error) }
  }

  nonisolated func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64, totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
    guard let key = downloadTask.taskDescription, totalBytesExpectedToWrite > 0 else { return }
    let progress = Double(totalBytesWritten) / Double(totalBytesExpectedToWrite)
    DispatchQueue.main.async {
      if let job = self.jobs[key] { self.onProgress?(job, progress) }
    }
  }

  nonisolated func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
    DispatchQueue.main.async {
      self.finishedEvents = self.waiters.isEmpty
      let continuations = Array(self.waiters.values)
      self.waiters.removeAll()
      continuations.forEach { $0.resume() }
    }
  }
}
