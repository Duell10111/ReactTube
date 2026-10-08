//
//  RemoteLibraryCommands.swift
//  watch
//
//  Executes library commands sent by the iPhone and acknowledges each one.
//  Commands may be delivered more than once, so every command id is executed
//  only once and later duplicates get the stored result again.
//

import Foundation
import SwiftData

@MainActor
final class RemoteLibraryCommands {
  static let shared = RemoteLibraryCommands()

  private enum Key {
    static let processedCommands = "watchLibrary.processedCommands"
  }

  private static let maxProcessedCommands = 200

  private struct Outcome {
    var status: String
    var error: String?

    static let ok = Outcome(status: "ok")
    static func failed(_ error: String) -> Outcome { Outcome(status: "failed", error: error) }
    static func unsupported(_ error: String) -> Outcome { Outcome(status: "unsupported", error: error) }
  }

  private let defaults = UserDefaults.standard
  private var modelContext: ModelContext { DataController.shared.container.mainContext }

  private init() {}

  func handle(_ message: [String: Any]) async {
    guard let commandId = message["commandId"] as? String, !commandId.isEmpty else {
      WatchLog.shared.warning("Library", "Library command without commandId ignored")
      return
    }

    if let previous = processedOutcome(commandId) {
      sendResult(commandId: commandId, outcome: previous, revision: LibrarySync.shared.revision)
      return
    }

    let protocolVersion = message["protocolVersion"] as? Int ?? 0
    let op = message["op"] as? String ?? ""
    let args = message["args"] as? [String: Any] ?? [:]

    let outcome: Outcome
    if protocolVersion > WatchLibraryProtocol.version {
      outcome = .unsupported("Unsupported protocol version \(protocolVersion)")
    } else {
      outcome = execute(op: op, args: args)
    }
    if outcome.status != "ok" {
      WatchLog.shared.warning("Library", "Command \(op) \(outcome.status): \(outcome.error ?? "")")
    }

    await finish(commandId: commandId, outcome: outcome)
  }

  private func finish(commandId: String, outcome: Outcome) async {
    let revision = await LibrarySync.shared.flushRevision()
    remember(commandId, outcome: outcome)
    sendResult(commandId: commandId, outcome: outcome, revision: revision)
    if outcome.status == "ok" {
      LibrarySync.shared.scheduleSnapshot()
    }
  }

  /// Stores a video file transferred from the phone. The file was already moved
  /// into the download directory (`savedPath`); the metadata carries the command
  /// id the phone waits for. Transfers without command id (older phone app)
  /// are stored without acknowledgement.
  /// Stores a cover the phone had downloaded together with a video. Best
  /// effort: covers are not acknowledged, the list just shows a placeholder.
  func handleReceivedCover(id: String, savedPath: String?) {
    guard let savedPath else {
      WatchLog.shared.warning("Transfer", "Saving the transferred cover of \(id) failed")
      return
    }
    addDownloadData(modelContext, id: id, duration: 0, coverURL: savedPath)
    _ = save()
  }

  func handleReceivedVideoFile(metadata: [String: Any], savedPath: String?) async {
    let commandId = metadata["commandId"] as? String
    if let commandId, let previous = processedOutcome(commandId) {
      sendResult(commandId: commandId, outcome: previous, revision: LibrarySync.shared.revision)
      return
    }

    let outcome: Outcome
    if let id = metadata["id"] as? String, let savedPath {
      // Older phone apps sent the duration in seconds under "duration".
      let durationMillis = metadata["durationMillis"] as? Int ?? (metadata["duration"] as? Int).map { $0 * 1000 } ?? 0
      DownloadManager.shared.cancel(ids: [id])
      addDownloadData(
        modelContext,
        id: id,
        title: metadata["title"] as? String,
        artist: metadata["artist"] as? String,
        downloaded: true,
        duration: durationMillis,
        fileURL: savedPath
      )
      if let video = fetchVideo(id), video.coverURL == nil {
        video.coverURL = metadata["coverUrl"] as? String
      }
      outcome = save()
      WatchLog.shared.info("Transfer", "Received \(metadata["title"] as? String ?? id) from iPhone")
    } else {
      outcome = .failed("Saving the transferred file failed")
    }

    if let commandId {
      await finish(commandId: commandId, outcome: outcome)
    } else {
      LibrarySync.shared.scheduleSnapshot()
    }
  }

  private func execute(op: String, args: [String: Any]) -> Outcome {
    let videoIds = (args["videoIds"] as? [Any])?.compactMap { $0 as? String } ?? []

    switch op {
    case "requestSnapshot":
      return .ok
    case "downloadVideos":
      guard !videoIds.isEmpty else { return .failed("No videoIds") }
      return downloadVideos(videoIds, metadata: args["videos"] as? [[String: Any]] ?? [])
    case "cancelDownloads":
      guard !videoIds.isEmpty else { return .failed("No videoIds") }
      DownloadManager.shared.cancel(ids: Set(videoIds))
      return .ok
    case "deleteDownload":
      guard !videoIds.isEmpty else { return .failed("No videoIds") }
      DownloadManager.shared.cancel(ids: Set(videoIds))
      for id in videoIds {
        deleteDownloadedVideo(modelContext, id: id)
      }
      return save()
    case "removeVideos":
      guard !videoIds.isEmpty else { return .failed("No videoIds") }
      return removeVideos(videoIds)
    case "clearAllDownloads":
      clearDownloads(modelContext: modelContext)
      return save()
    case "upsertPlaylist":
      return upsertPlaylist(args)
    case "deletePlaylist":
      return deletePlaylist(args)
    case "setPlaylistAutoDownload":
      return setPlaylistAutoDownload(args)
    default:
      return .unsupported("Unsupported operation \(op)")
    }
  }

  private func downloadVideos(_ ids: [String], metadata: [[String: Any]]) -> Outcome {
    let metadataById = Dictionary(
      metadata.compactMap { entry in (entry["id"] as? String).map { ($0, entry) } },
      uniquingKeysWith: { first, _ in first }
    )
    var videos: [Video] = []
    for id in ids {
      if let video = fetchVideo(id) {
        videos.append(video)
        continue
      }
      // Unknown videos get a placeholder; the metadata request fills in the rest.
      let entry = metadataById[id]
      let video = Video(id: id, durationMillis: entry?["durationMillis"] as? Int ?? 0, title: entry?["title"] as? String)
      video.artist = entry?["artist"] as? String
      video.coverURL = entry?["coverUrl"] as? String
      modelContext.insert(video)
      videos.append(video)
    }

    let saved = save()
    guard saved.status == "ok" else { return saved }
    videos.forEach { DownloadManager.shared.enqueue($0) }
    DownloadManager.shared.checkDownloads()
    return .ok
  }

  private func removeVideos(_ ids: [String]) -> Outcome {
    DownloadManager.shared.cancel(ids: Set(ids))
    let playlists = (try? modelContext.fetch(FetchDescriptor<Playlist>())) ?? []
    for id in ids {
      deleteDownloadedVideo(modelContext, id: id)
      // Videos that still belong to a playlist keep their entry, only the download goes.
      let referenced = playlists.contains { $0.videoIDs.contains(id) }
      if !referenced, let video = fetchVideo(id) {
        modelContext.delete(video)
      }
    }
    return save()
  }

  /// Replaces a linked playlist with the state merged on the phone. The order
  /// comes from `videoIds`; missing videos are created from the sent metadata.
  private func upsertPlaylist(_ args: [String: Any]) -> Outcome {
    guard let id = args["id"] as? String, !id.isEmpty else { return .failed("No playlist id") }
    let videoIds = (args["videoIds"] as? [Any])?.compactMap { $0 as? String } ?? []
    let syncVersion = args["syncVersion"] as? Int ?? 0

    let playlist: Playlist
    if let existing = fetchPlaylist(id) {
      // Commands arrive in order, but never let an older state win.
      if existing.linked && syncVersion < existing.syncVersion {
        return .ok
      }
      playlist = existing
    } else {
      playlist = Playlist(id: id, title: args["title"] as? String)
      modelContext.insert(playlist)
    }

    let metadataById = Dictionary(
      (args["videos"] as? [[String: Any]] ?? []).compactMap { entry in (entry["id"] as? String).map { ($0, entry) } },
      uniquingKeysWith: { first, _ in first }
    )
    var videosById = Dictionary(
      ((try? modelContext.fetch(FetchDescriptor<Video>(predicate: #Predicate { videoIds.contains($0.id) }))) ?? []).map { ($0.id, $0) },
      uniquingKeysWith: { first, _ in first }
    )
    for videoId in videoIds {
      let entry = metadataById[videoId]
      if let video = videosById[videoId] {
        // Fill in what the watch did not know yet, never overwrite.
        if video.title == nil { video.title = entry?["title"] as? String }
        if video.artist == nil { video.artist = entry?["artist"] as? String }
        if video.coverURL == nil { video.coverURL = entry?["coverUrl"] as? String }
        video.temp = false
      } else {
        let video = Video(id: videoId, durationMillis: entry?["durationMillis"] as? Int ?? 0, title: entry?["title"] as? String)
        video.artist = entry?["artist"] as? String
        video.coverURL = entry?["coverUrl"] as? String
        video.temp = false
        modelContext.insert(video)
        videosById[videoId] = video
      }
    }

    let removedIds = Set(playlist.videoIDs).subtracting(videoIds)
    if let title = args["title"] as? String { playlist.title = title }
    if let coverURL = args["coverUrl"] as? String { playlist.coverURL = coverURL }
    playlist.videoIDs = videoIds
    playlist.videos = videoIds.compactMap { videosById[$0] }
    playlist.temp = false
    playlist.linked = true
    playlist.syncVersion = syncVersion
    if let autoDownload = args["autoDownload"] as? Bool {
      playlist.download = autoDownload
    }

    // With automatic downloads, titles leaving the playlist are freed again
    // unless another playlist still needs them.
    if playlist.download && !removedIds.isEmpty {
      freeVideos(removedIds)
    }

    let saved = save()
    guard saved.status == "ok" else { return saved }
    if playlist.download {
      enqueueMissingDownloads(playlist)
    }
    return .ok
  }

  private func deletePlaylist(_ args: [String: Any]) -> Outcome {
    guard let id = args["id"] as? String, !id.isEmpty else { return .failed("No playlist id") }
    guard let playlist = fetchPlaylist(id) else { return .ok }
    if args["deleteDownloads"] as? Bool == true {
      let otherPlaylists = ((try? modelContext.fetch(FetchDescriptor<Playlist>())) ?? []).filter { $0.id != id }
      let exclusiveIds = playlist.videoIDs.filter { videoId in
        !otherPlaylists.contains { $0.videoIDs.contains(videoId) }
      }
      DownloadManager.shared.cancel(ids: Set(exclusiveIds))
      // Deletes the playlist and all videos that are in no other playlist.
      deleteDownloadedPlaylist(modelContext, playlist: playlist)
    } else {
      modelContext.delete(playlist)
    }
    return save()
  }

  private func setPlaylistAutoDownload(_ args: [String: Any]) -> Outcome {
    guard let id = args["id"] as? String, let playlist = fetchPlaylist(id) else {
      return .failed("Unknown playlist")
    }
    playlist.download = args["enabled"] as? Bool ?? false
    let saved = save()
    guard saved.status == "ok" else { return saved }
    if playlist.download {
      enqueueMissingDownloads(playlist)
    }
    return .ok
  }

  private func enqueueMissingDownloads(_ playlist: Playlist) {
    playlist.orderedVideos.filter { !$0.downloaded }.forEach { DownloadManager.shared.enqueue($0) }
    DownloadManager.shared.checkDownloads()
  }

  /// Deletes downloads and entries of videos no playlist references anymore.
  private func freeVideos(_ ids: Set<String>) {
    let playlists = (try? modelContext.fetch(FetchDescriptor<Playlist>())) ?? []
    let orphaned = ids.filter { id in !playlists.contains { $0.videoIDs.contains(id) } }
    DownloadManager.shared.cancel(ids: Set(orphaned))
    for id in orphaned {
      deleteDownloadedVideo(modelContext, id: id)
      if let video = fetchVideo(id) {
        modelContext.delete(video)
      }
    }
  }

  private func fetchPlaylist(_ id: String) -> Playlist? {
    let descriptor = FetchDescriptor<Playlist>(predicate: #Predicate { $0.id == id })
    return try? modelContext.fetch(descriptor).first
  }

  private func fetchVideo(_ id: String) -> Video? {
    let descriptor = FetchDescriptor<Video>(predicate: #Predicate { $0.id == id })
    return try? modelContext.fetch(descriptor).first
  }

  private func save() -> Outcome {
    do {
      if modelContext.hasChanges {
        try modelContext.save()
      }
      return .ok
    } catch {
      return .failed(error.localizedDescription)
    }
  }

  // MARK: Idempotency

  private func processedOutcome(_ commandId: String) -> Outcome? {
    let entries = defaults.array(forKey: Key.processedCommands) as? [[String: String]] ?? []
    guard let entry = entries.first(where: { $0["commandId"] == commandId }), let status = entry["status"] else {
      return nil
    }
    return Outcome(status: status, error: entry["error"])
  }

  private func remember(_ commandId: String, outcome: Outcome) {
    var entries = defaults.array(forKey: Key.processedCommands) as? [[String: String]] ?? []
    var entry = ["commandId": commandId, "status": outcome.status]
    entry["error"] = outcome.error
    entries.append(entry)
    if entries.count > Self.maxProcessedCommands {
      entries.removeFirst(entries.count - Self.maxProcessedCommands)
    }
    defaults.set(entries, forKey: Key.processedCommands)
  }

  private func sendResult(commandId: String, outcome: Outcome, revision: Int) {
    var result: [String: Any] = [
      "type": WatchLibraryProtocol.commandResultType,
      "protocolVersion": WatchLibraryProtocol.version,
      "commandId": commandId,
      "status": outcome.status,
      "revision": revision,
    ]
    result["error"] = outcome.error
    send(result, as: .guaranteed)
  }
}
