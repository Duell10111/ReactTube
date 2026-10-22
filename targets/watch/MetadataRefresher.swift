//
//  MetadataRefresher.swift
//  watch
//
//  Re-requests the YouTube metadata of titles through the iPhone. Downloads
//  made by older app versions and titles synced without full metadata lack
//  fields such as the artist, the cover or the loudness offset; the regular
//  video response fills them in.
//

import Foundation
import Observation

@MainActor
@Observable
final class MetadataRefresher {
  static let shared = MetadataRefresher()

  /// Pause between two requests of a bulk refresh. Every request makes the
  /// phone resolve the whole video, so they must not arrive all at once.
  private static let requestInterval: Duration = .seconds(2)

  /// Requests still waiting to be sent by the running bulk refresh.
  private(set) var remaining = 0
  private var task: Task<Void, Never>?

  var isRunning: Bool { task != nil }

  private init() {}

  /// Whether a title misses metadata that a refresh can provide. The loudness
  /// offset only counts for downloads; streams receive it when they start.
  static func isIncomplete(_ video: Video) -> Bool {
    video.title == nil
      || video.artist == nil
      || !isCoverUsable(video.coverURL)
      || video.durationMillis <= 0
      || (video.downloaded && video.loudnessDb == nil)
  }

  /// Refreshes a single title. Queued by Watch Connectivity if the phone is
  /// currently not reachable.
  func refresh(_ video: Video) {
    WatchLog.shared.info("Metadata", "Refreshing metadata of \(video.title ?? video.id)")
    requestVideo(id: video.id)
  }

  /// Refreshes every incomplete title one after another. Requires a
  /// reachable phone so a bulk refresh does not pile up in the transfer queue,
  /// and stops early once the phone becomes unreachable.
  func refreshIncomplete(_ videos: [Video]) {
    guard task == nil else { return }
    let ids = videos.filter(Self.isIncomplete).map(\.id)
    guard !ids.isEmpty else { return }
    guard WatchStatus.shared.isReachable else {
      WatchStatus.shared.reportError("The iPhone is currently not reachable.")
      return
    }

    WatchLog.shared.info("Metadata", "Refreshing metadata of \(ids.count) titles")
    remaining = ids.count
    task = Task { [weak self] in
      for id in ids {
        guard !Task.isCancelled, WatchStatus.shared.isReachable else {
          WatchLog.shared.warning("Metadata", "Metadata refresh stopped early")
          break
        }
        requestVideo(id: id)
        self?.remaining -= 1
        try? await Task.sleep(for: Self.requestInterval)
      }
      self?.remaining = 0
      self?.task = nil
    }
  }

  func cancel() {
    task?.cancel()
  }
}
