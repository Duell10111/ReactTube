//
//  DownloadBatches.swift
//  watch
//

import Foundation

/// One download request: a playlist, a single title or a sync from the phone.
/// The outcome of the whole request is reported once every title has one.
struct DownloadBatch: Codable, Equatable, Identifiable {
  enum Kind: String, Codable {
    case playlist, video, phone
  }

  enum Outcome: String, Codable {
    case completed, failed, cancelled
  }

  let id: String
  let kind: Kind
  /// Playlist or title name from the library; it is never translated.
  let name: String?
  let videoIDs: [String]
  var outcomes: [String: Outcome] = [:]

  var isFinished: Bool { videoIDs.allSatisfy { outcomes[$0] != nil } }
  var completedCount: Int { videoIDs.filter { outcomes[$0] == .completed }.count }
  var failedIDs: [String] { videoIDs.filter { outcomes[$0] == .failed } }
  /// A request the user cancelled completely needs no report.
  var isCancelled: Bool { videoIDs.allSatisfy { outcomes[$0] == .cancelled } }
}

/// Open download batches. Free of SwiftData and UIKit so the bookkeeping can be
/// checked in isolation. A video can belong to several open batches.
struct DownloadBatches: Codable, Equatable {
  private(set) var open: [DownloadBatch] = []

  /// Video IDs that at least one open batch still waits for.
  var pendingIDs: Set<String> {
    Set(open.flatMap { batch in batch.videoIDs.filter { batch.outcomes[$0] == nil } })
  }

  /// Starts a batch for the given videos. Returns nil when there is nothing to track.
  @discardableResult
  mutating func add(kind: DownloadBatch.Kind, name: String?, videoIDs: [String], id: String = UUID().uuidString) -> DownloadBatch? {
    var seen: Set<String> = []
    let unique = videoIDs.filter { seen.insert($0).inserted }
    guard !unique.isEmpty else { return nil }
    let batch = DownloadBatch(id: id, kind: kind, name: name, videoIDs: unique)
    open.append(batch)
    return batch
  }

  /// Records the outcome in every open batch that still waits for the videos.
  /// An earlier outcome is kept, so dismissing a failure does not hide it.
  mutating func record(_ outcome: DownloadBatch.Outcome, for ids: Set<String>) {
    for index in open.indices {
      for id in open[index].videoIDs where ids.contains(id) && open[index].outcomes[id] == nil {
        open[index].outcomes[id] = outcome
      }
    }
  }

  /// Makes a retried video pending again in the unfinished batches that contain
  /// it. A finished batch is already being reported, so it is not reopened.
  /// Returns false when no unfinished batch contains the video.
  mutating func reopen(_ id: String) -> Bool {
    var reopened = false
    for index in open.indices where open[index].videoIDs.contains(id) && !open[index].isFinished {
      open[index].outcomes.removeValue(forKey: id)
      reopened = true
    }
    return reopened
  }

  /// Batches in which every video has an outcome. They stay stored until their
  /// report is delivered, so a process exit in between cannot lose it.
  var finished: [DownloadBatch] { open.filter(\.isFinished) }

  /// Removes a reported batch.
  mutating func remove(id: String) {
    open.removeAll { $0.id == id && $0.isFinished }
  }

  mutating func removeAll() {
    open.removeAll()
  }
}
