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

    let pendingIds = Set(downloadManager.pendingDownloads.map(\.id))
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
          coverUrl: remoteURL(video.coverURL)
        )
      }

    let snapshotPlaylists = libraryPlaylists.map { playlist in
      LibrarySnapshotPlaylist(
        id: playlist.id,
        title: playlist.title,
        videoIds: playlist.videoIDs,
        autoDownload: playlist.download,
        temp: playlist.temp ?? false,
        // Playlist linking is introduced together with the sync engine.
        linked: false,
        syncVersion: 0
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
      self.defaults.set(self.revision + 1, forKey: Key.revision)
      self.publishStatus()
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

  // MARK: Commands

  /// Minimal command entry point. Only `requestSnapshot` is handled for now;
  /// every other operation is acknowledged as `unsupported`.
  func handleCommand(_ message: [String: Any]) {
    guard let commandId = message["commandId"] as? String else {
      WatchLog.shared.warning("Library", "Library command without commandId ignored")
      return
    }
    let protocolVersion = message["protocolVersion"] as? Int ?? 0
    let op = message["op"] as? String

    if protocolVersion > WatchLibraryProtocol.version {
      sendCommandResult(commandId: commandId, status: "unsupported", error: "Unsupported protocol version \(protocolVersion)")
      return
    }

    switch op {
    case "requestSnapshot":
      sendSnapshot()
      sendCommandResult(commandId: commandId, status: "ok")
    default:
      sendCommandResult(commandId: commandId, status: "unsupported", error: "Unsupported operation \(op ?? "nil")")
    }
  }

  private func sendCommandResult(commandId: String, status: String, error: String? = nil) {
    var result: [String: Any] = [
      "type": WatchLibraryProtocol.commandResultType,
      "protocolVersion": WatchLibraryProtocol.version,
      "commandId": commandId,
      "status": status,
      "revision": revision,
    ]
    if let error {
      result["error"] = error
    }
    send(result, as: .guaranteed)
  }
}
