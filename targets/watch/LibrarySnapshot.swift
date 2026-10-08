//
//  LibrarySnapshot.swift
//  watch
//
//  Reports the watch library (downloads, playlists, storage) to the iPhone.
//  The watch stays the source of truth; the phone only caches the snapshot.
//

import Foundation
import SwiftData
import WatchConnectivity

enum LibrarySnapshotBuilder {
  @MainActor
  static func build(_ modelContext: ModelContext, revision: Int, downloadManager: DownloadManager = .shared) throws -> LibrarySnapshot {
    let playlists = try modelContext.fetch(FetchDescriptor<Playlist>())
    let videos = try modelContext.fetch(FetchDescriptor<Video>())
    let sizes = downloadSizes()

    let pendingIds = Set(downloadManager.pendingDownloads.map(\.id)).union(downloadManager.awaitingMetadata)
    let activeIds = Set(downloadManager.activeDownloads.map(\.id))
    // Home feed entries (temp) are a cache, not part of the user's library.
    let libraryPlaylists = playlists.filter { $0.temp != true }
    let playlistVideoIds = Set(libraryPlaylists.flatMap(\.videoIDs))

    let snapshotVideos = videos
      .filter { video in
        video.downloaded
          || playlistVideoIds.contains(video.id)
          || pendingIds.contains(video.id)
          || activeIds.contains(video.id)
      }
      .map { video in
        LibrarySnapshotVideo(
          id: video.id,
          title: video.title,
          artist: video.artist,
          durationMillis: video.durationMillis,
          downloaded: video.downloaded,
          sizeBytes: sizes[video.id],
          coverUrl: remoteURL(video.coverURL),
          downloadedAt: video.downloaded ? downloadDate(video) : nil
        )
      }

    let snapshotPlaylists = libraryPlaylists.map { playlist in
      LibrarySnapshotPlaylist(
        id: playlist.id,
        title: playlist.title,
        videoIds: playlist.videoIDs,
        autoDownload: playlist.download,
        temp: playlist.temp ?? false,
        linked: playlist.linked,
        syncVersion: playlist.syncVersion
      )
    }

    let activeDownloads = downloadManager.activeDownloads.map { download in
      LibraryActiveDownload(id: download.id, progress: downloadManager.progressDownloads[download.id] ?? 0)
    }

    return LibrarySnapshot(
      protocolVersion: WatchLibraryProtocol.version,
      revision: revision,
      generatedAt: Int64(Date().timeIntervalSince1970 * 1000),
      storage: LibraryStorage(usedBytes: sizes.values.reduce(0, +), availableBytes: availableBytes()),
      videos: snapshotVideos,
      playlists: snapshotPlaylists,
      activeDownloads: activeDownloads,
      pendingDownloads: pendingIds.sorted()
    )
  }

  @MainActor
  static func status(_ modelContext: ModelContext, revision: Int) -> LibraryStatus {
    let downloadedCount = (try? modelContext.fetchCount(FetchDescriptor<Video>(predicate: #Predicate { $0.downloaded }))) ?? 0
    return LibraryStatus(
      revision: revision,
      usedBytes: downloadSizes().values.reduce(0, +),
      availableBytes: availableBytes(),
      downloadedCount: downloadedCount
    )
  }

  /// Size on disk per video id, based on `downloads/<id>/`.
  static func downloadSizes() -> [String: Int64] {
    let fileManager = FileManager.default
    let downloadDirectory = getDownloadDirectory()
    guard let entries = try? fileManager.contentsOfDirectory(at: downloadDirectory, includingPropertiesForKeys: nil) else {
      return [:]
    }
    var sizes: [String: Int64] = [:]
    for entry in entries {
      sizes[entry.lastPathComponent] = directorySize(entry)
    }
    return sizes
  }

  private static func directorySize(_ url: URL) -> Int64 {
    let keys: [URLResourceKey] = [.isRegularFileKey, .totalFileAllocatedSizeKey, .fileSizeKey]
    guard let enumerator = FileManager.default.enumerator(at: url, includingPropertiesForKeys: keys) else {
      return 0
    }
    var total: Int64 = 0
    for case let fileURL as URL in enumerator {
      guard let values = try? fileURL.resourceValues(forKeys: Set(keys)), values.isRegularFile == true else {
        continue
      }
      total += Int64(values.totalFileAllocatedSize ?? values.fileSize ?? 0)
    }
    return total
  }

  /// Creation date of the downloaded audio file. Derived from the file system,
  /// so it also exists for downloads made before the date was reported.
  private static func downloadDate(_ video: Video) -> Int64? {
    guard let fileURL = video.fileURL, !fileURL.isEmpty else { return nil }
    let url = getDownloadDirectory().appending(path: fileURL)
    guard let values = try? url.resourceValues(forKeys: [.creationDateKey, .contentModificationDateKey]),
          let date = values.creationDate ?? values.contentModificationDate else {
      return nil
    }
    return Int64(date.timeIntervalSince1970 * 1000)
  }

  static func availableBytes() -> Int64 {
    // volumeAvailableCapacityForImportantUsageKey is unavailable on watchOS.
    let attributes = try? FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory())
    return (attributes?[.systemFreeSize] as? NSNumber)?.int64Value ?? 0
  }

  /// Downloaded covers are stored as local file paths, which are useless on the phone.
  private static func remoteURL(_ value: String?) -> String? {
    guard let value, value.hasPrefix("http://") || value.hasPrefix("https://") else {
      return nil
    }
    return value
  }
}

@MainActor
final class LibrarySync {
  static let shared = LibrarySync()

  private enum Key {
    static let revision = "watchLibrary.revision"
    static let lastSentSnapshotRevision = "watchLibrary.lastSentSnapshotRevision"
  }

  private let defaults = UserDefaults.standard
  private var saveObserver: NSObjectProtocol?
  private var revisionTask: Task<Void, Never>?
  private var snapshotTask: Task<Void, Never>?
  private var playlistChangeTasks: [String: Task<Void, Never>] = [:]
  private var progressTask: Task<Void, Never>?
  private var lastProgressSentAt = Date.distantPast

  private var session: WCSession { WCSession.default }
  private var modelContext: ModelContext { DataController.shared.container.mainContext }

  private init() {}

  var revision: Int { defaults.integer(forKey: Key.revision) }

  /// Bumps the revision centrally on every SwiftData save instead of at each call site.
  func start() {
    guard saveObserver == nil else { return }
    saveObserver = NotificationCenter.default.addObserver(forName: ModelContext.didSave, object: nil, queue: .main) { _ in
      MainActor.assumeIsolated {
        LibrarySync.shared.scheduleRevisionBump()
      }
    }
  }

  private func scheduleRevisionBump() {
    // Debounce bursts of saves (e.g. a playlist with many videos) into one revision.
    revisionTask?.cancel()
    revisionTask = Task { @MainActor in
      try? await Task.sleep(for: .seconds(2))
      guard !Task.isCancelled else { return }
      self.revisionTask = nil
      self.bumpRevision()
    }
  }

  private func bumpRevision() {
    defaults.set(revision + 1, forKey: Key.revision)
    publishStatus()
  }

  /// Commits a pending debounced revision immediately and returns the current
  /// revision. Command results report it, so the phone can tell which snapshot
  /// already contains the change.
  func flushRevision() async -> Int {
    // didSave notifications are delivered through the main queue; let them arrive first.
    try? await Task.sleep(for: .milliseconds(100))
    if let revisionTask {
      revisionTask.cancel()
      self.revisionTask = nil
      bumpRevision()
    }
    return revision
  }

  /// Sends the progress of running downloads to the phone, at most once per
  /// second. Only while the phone is reachable; otherwise the snapshot is enough.
  func downloadProgressChanged() {
    guard progressTask == nil else { return }
    let delay = max(0, 1 - Date().timeIntervalSince(lastProgressSentAt))
    progressTask = Task { @MainActor in
      if delay > 0 {
        try? await Task.sleep(for: .seconds(delay))
      }
      self.progressTask = nil
      self.sendDownloadProgress()
    }
  }

  private func sendDownloadProgress() {
    guard WCSession.isSupported(), session.activationState == .activated, session.isReachable else { return }
    lastProgressSentAt = Date()
    let manager = DownloadManager.shared
    let downloads: [[String: Any]] = manager.activeDownloads.map { download in
      ["id": download.id, "progress": manager.progressDownloads[download.id] ?? 0]
    }
    session.sendMessage([
      "type": WatchLibraryProtocol.downloadProgressType,
      "protocolVersion": WatchLibraryProtocol.version,
      "downloads": downloads,
    ], replyHandler: nil) { error in
      // Progress is best effort; the next snapshot carries the real state.
      print("Sending download progress failed: \(error.localizedDescription)")
    }
  }

  /// Reports an edit made on the watch to a linked playlist. Always sends the
  /// complete ordered list; the phone merges it against the last synced state.
  func playlistEditedLocally(_ playlist: Playlist) {
    guard playlist.linked else { return }
    let id = playlist.id
    // Batch quick successive edits (e.g. several swipes) into one message.
    playlistChangeTasks[id]?.cancel()
    playlistChangeTasks[id] = Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(500))
      guard !Task.isCancelled else { return }
      self.playlistChangeTasks[id] = nil
      let descriptor = FetchDescriptor<Playlist>(predicate: #Predicate { $0.id == id })
      guard let playlist = try? self.modelContext.fetch(descriptor).first, playlist.linked else { return }
      send([
        "type": WatchLibraryProtocol.playlistChangedType,
        "protocolVersion": WatchLibraryProtocol.version,
        "id": id,
        "title": playlist.title ?? "",
        "videoIds": playlist.videoIDs,
        "baseSyncVersion": playlist.syncVersion,
      ], as: .guaranteed)
    }
  }

  /// Ends the link on the phone; the phone playlist itself stays.
  func linkedPlaylistDeletedLocally(id: String) {
    playlistChangeTasks.removeValue(forKey: id)?.cancel()
    send([
      "type": WatchLibraryProtocol.playlistDeletedType,
      "protocolVersion": WatchLibraryProtocol.version,
      "id": id,
    ], as: .guaranteed)
  }

  /// Sends a snapshot shortly after a change; bursts of commands produce one snapshot.
  func scheduleSnapshot() {
    snapshotTask?.cancel()
    snapshotTask = Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(500))
      guard !Task.isCancelled else { return }
      self.snapshotTask = nil
      self.sendSnapshot()
    }
  }

  /// Publishes the short status through the application context. Only the latest
  /// value matters, so this is cheap and safe to call often.
  func publishStatus() {
    guard WCSession.isSupported(), session.activationState == .activated else { return }
    let status = LibrarySnapshotBuilder.status(modelContext, revision: revision)
    do {
      try session.updateApplicationContext([WatchLibraryProtocol.statusContextKey: status.dictionary])
    } catch {
      WatchLog.shared.warning("Library", "Publishing library status failed: \(error.localizedDescription)")
    }
  }

  func sendSnapshotIfOutdated() {
    if defaults.object(forKey: Key.lastSentSnapshotRevision) as? Int != revision {
      sendSnapshot()
    }
  }

  func sendSnapshot() {
    guard WCSession.isSupported(), session.activationState == .activated else { return }
    do {
      let snapshot = try LibrarySnapshotBuilder.build(modelContext, revision: revision)
      let data = try JSONEncoder().encode(snapshot)
      defaults.set(snapshot.revision, forKey: Key.lastSentSnapshotRevision)

      if session.isReachable, data.count <= WatchLibraryProtocol.maxInlineSnapshotBytes, let json = String(data: data, encoding: .utf8) {
        let message: [String: Any] = [
          "type": WatchLibraryProtocol.snapshotType,
          "revision": snapshot.revision,
          "json": json,
        ]
        session.sendMessage(message, replyHandler: nil) { error in
          WatchLog.shared.warning("Library", "Inline snapshot failed, transferring file: \(error.localizedDescription)")
          Task { @MainActor in
            LibrarySync.shared.transferSnapshotFile(data, revision: snapshot.revision)
          }
        }
      } else {
        transferSnapshotFile(data, revision: snapshot.revision)
      }
    } catch {
      WatchLog.shared.error("Library", "Building library snapshot failed: \(error.localizedDescription)")
    }
  }

  private func transferSnapshotFile(_ data: Data, revision: Int) {
    // Only the newest snapshot is relevant; drop queued older ones.
    for transfer in session.outstandingFileTransfers where Self.isSnapshotTransfer(transfer) {
      transfer.cancel()
    }

    do {
      let directory = try snapshotDirectory()
      removeStaleSnapshotFiles(in: directory)
      let fileURL = directory.appendingPathComponent("snapshot-\(revision)-\(UUID().uuidString).json")
      try data.write(to: fileURL, options: .atomic)
      session.transferFile(fileURL, metadata: [
        "type": WatchLibraryProtocol.snapshotType,
        "protocolVersion": WatchLibraryProtocol.version,
        "revision": revision,
      ])
    } catch {
      WatchLog.shared.error("Library", "Transferring library snapshot failed: \(error.localizedDescription)")
    }
  }

  /// Returns true if the finished transfer was a snapshot and has been cleaned up.
  nonisolated static func handleFinishedTransfer(_ transfer: WCSessionFileTransfer, error: Error?) -> Bool {
    guard isSnapshotTransfer(transfer) else { return false }
    if let error {
      print("Library snapshot transfer finished with error: \(error.localizedDescription)")
    }
    try? FileManager.default.removeItem(at: transfer.file.fileURL)
    return true
  }

  nonisolated private static func isSnapshotTransfer(_ transfer: WCSessionFileTransfer) -> Bool {
    transfer.file.metadata?["type"] as? String == WatchLibraryProtocol.snapshotType
  }

  private func snapshotDirectory() throws -> URL {
    let caches = try FileManager.default.url(for: .cachesDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    let directory = caches.appendingPathComponent("library-snapshots", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory
  }

  private func removeStaleSnapshotFiles(in directory: URL) {
    let outstanding = Set(session.outstandingFileTransfers.map { $0.file.fileURL.standardizedFileURL })
    let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
    for file in files where !outstanding.contains(file.standardizedFileURL) {
      try? FileManager.default.removeItem(at: file)
    }
  }
}
