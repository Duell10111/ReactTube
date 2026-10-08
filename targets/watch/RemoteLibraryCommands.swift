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

    let revision = await LibrarySync.shared.flushRevision()
    remember(commandId, outcome: outcome)
    sendResult(commandId: commandId, outcome: outcome, revision: revision)
    if outcome.status == "ok" {
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
