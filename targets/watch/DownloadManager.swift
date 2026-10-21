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

  private let transport = WatchDownloadTransport()
  private var requestedIDs: Set<String> = []
  private var restored = false
  private var restoring = false

  private struct QueueState: Codable {
    var requestedIDs: Set<String>
    var failures: [String: String]
  }

  private init() {
    let queueFile = transport.stagingDirectory.appendingPathComponent("queue.json")
    if let data = try? Data(contentsOf: queueFile), let state = try? JSONDecoder().decode(QueueState.self, from: data) {
      requestedIDs.formUnion(state.requestedIDs)
      failedDownloads.merge(state.failures, uniquingKeysWith: { current, _ in current })
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
      let state = QueueState(requestedIDs: requestedIDs, failures: failedDownloads)
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
    restoring = false
    restored = true
    persistQueue()
    checkDownloads()
    notifyProgress()
  }

  func handleBackgroundEvents(identifier: String) async {
    await restore()
    await transport.waitForBackgroundEvents(identifier: identifier)
  }

  /// Queues a download. Videos without a valid download URL request fresh
  /// metadata first; `videoMetadataUpdated` continues once it arrives.
  func enqueue(_ video: Video) {
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
    let descriptor = FetchDescriptor<Video>(predicate: #Predicate { $0.id == id })
    if let video = try? DataController.shared.container?.mainContext.fetch(descriptor).first, !video.downloaded {
      guard video.downloadURL != nil, let expiry = video.validUntil, expiry > Date() else {
        failedDownloads[id] = DownloadMessages.unavailable
        persistQueue()
        notifyProgress()
        return
      }
      pendingDownloads.insert(video)
      checkDownloads()
    }
  }

  func videoMetadataFailed(id: String) {
    guard awaitingMetadata.remove(id) != nil else { return }
    failedDownloads[id] = WatchStatus.shared.isReachable ? DownloadMessages.metadataFailed : DownloadMessages.connectionFailed
    persistQueue()
    notifyProgress()
  }

  /// Removes the videos from all queues and cancels running downloads.
  func cancel(ids: Set<String>) {
    pendingDownloads = pendingDownloads.filter { !ids.contains($0.id) }
    awaitingMetadata.subtract(ids)
    requestedIDs.subtract(ids)
    VideoMetadataRequests.shared.cancel(ids: ids)
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
      return
    }
    cancel(ids: [id])
    enqueue(video)
    checkDownloads()
  }

  private func notifyProgress() {
    Task { @MainActor in
      LibrarySync.shared.downloadProgressChanged()
    }
  }

  func cancelAll() {
    VideoMetadataRequests.shared.cancel(ids: awaitingMetadata)
    generations.removeAll()
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
    playlist.videos.filter { video in
      video.downloaded == false
    }.forEach { video in
      enqueue(video)
    }
    checkDownloads()
  }

  /// Starts the transfer right away. Callers go through `enqueue` so the
  /// parallel limit and the metadata refresh apply.
  @discardableResult
  private func downloadVideo(video: Video) -> Bool {
    let id = video.id
    let duration = video.durationMillis
    guard let streamURL = video.downloadURL, let expiry = video.validUntil, expiry > Date(), let uri = URL(string: streamURL) else {
      failedDownloads[id] = DownloadMessages.unavailable
      return false
    }
    let generation = UUID()
    generations[id] = generation
    let key = transport.start(videoID: id, kind: "audio", generation: generation, duration: duration, url: uri)
    guard let key else {
      generations.removeValue(forKey: id)
      failedDownloads[id] = DownloadMessages.startFailed
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
      persistQueue()
      return true
    }
    defer { persistQueue(); notifyProgress(); checkDownloads() }
    if let error {
      if job.kind == "audio" { failedDownloads[id] = error.localizedDescription }
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
        if isAudio { requestedIDs.remove(id); failedDownloads.removeValue(forKey: id) }
      } catch {
        failedDownloads[id] = DownloadMessages.saveFailed
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
}

/// Typed native copy for stability and recovery UI. This preference is separate
/// from the language sent to YouTube and can be selected before the store opens.
enum WatchStabilityCopy {
  enum Key: CaseIterable {
    case downloadSaveFailed, downloadStartFailed, downloadUnavailable
    case downloadMetadataFailed, downloadConnectionFailed
    case recoveryLoading, recoveryTitle, recoveryExplanation, recoveryRetry
    case recoveryRebuild, recoveryCancel, recoveryConfirmation, recoveryBackup
    case appLanguage, switchLanguage
  }

  static func text(_ key: Key, language: String? = nil) -> String {
    let value: (en: String, de: String)
    switch key {
    case .downloadSaveFailed: value = ("The downloaded file could not be saved.", "Die heruntergeladene Datei konnte nicht gespeichert werden.")
    case .downloadStartFailed: value = ("The download could not be started.", "Der Download konnte nicht gestartet werden.")
    case .downloadUnavailable: value = ("No download URL available.", "Kein Download-Link verfügbar.")
    case .downloadMetadataFailed: value = ("The iPhone could not load download information. Please try again.", "Das iPhone konnte die Downloadinformationen nicht laden. Bitte erneut versuchen.")
    case .downloadConnectionFailed: value = ("Download information timed out. Reconnect the iPhone and try again.", "Zeitüberschreitung beim Laden der Downloadinformationen. Das iPhone erneut verbinden und noch einmal versuchen.")
    case .recoveryLoading: value = ("Opening library…", "Bibliothek wird geöffnet …")
    case .recoveryTitle: value = ("Library unavailable", "Bibliothek nicht verfügbar")
    case .recoveryExplanation: value = ("The library could not be opened. Retry, or back it up and create an empty library.", "Die Bibliothek konnte nicht geöffnet werden. Erneut versuchen oder nach einer Sicherung eine leere Bibliothek anlegen.")
    case .recoveryRetry: value = ("Try again", "Erneut versuchen")
    case .recoveryRebuild: value = ("Back up and reset library", "Bibliothek sichern und zurücksetzen")
    case .recoveryCancel: value = ("Cancel", "Abbrechen")
    case .recoveryConfirmation: value = ("Your playlists and library entries will be reset. The existing database will be backed up first. Downloaded files will be kept.", "Playlists und Bibliothekseinträge werden zurückgesetzt. Die bisherige Datenbank wird vorher gesichert. Heruntergeladene Dateien bleiben erhalten.")
    case .recoveryBackup: value = ("Database backup:", "Datenbanksicherung:")
    case .appLanguage: value = ("App language", "App-Sprache")
    case .switchLanguage: value = ("Deutsch", "English")
    }
    let selected = language ?? UserDefaults.standard.string(forKey: "uiLanguage")
      ?? Locale.current.language.languageCode?.identifier ?? "en"
    return selected == "de" ? value.de : value.en
  }
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
    let queue = OperationQueue()
    queue.maxConcurrentOperationCount = 1
    return URLSession(configuration: configuration, delegate: self, delegateQueue: queue)
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
    let taskKeys = Set(tasks.compactMap(\.taskDescription))
    for task in tasks where task.taskDescription.flatMap({ jobs[$0] }) == nil { task.cancel() }
    for key in Array(jobs.keys) {
      let staged = stagedFile(key)
      if FileManager.default.fileExists(atPath: staged.path) {
        deliver(key: key, file: staged, error: nil)
      } else if !taskKeys.contains(key) {
        deliver(key: key, file: nil, error: URLError(.networkConnectionLost))
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

  func waitForBackgroundEvents(identifier: String) async {
    guard identifier == Self.sessionIdentifier else { return }
    _ = session
    if finishedEvents { finishedEvents = false; return }
    let id = UUID()
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
        throw URLError(.badServerResponse)
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
