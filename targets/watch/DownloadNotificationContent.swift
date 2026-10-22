//
//  DownloadNotificationContent.swift
//  watch
//

import Foundation

/// Text of the notification that summarizes a finished download batch.
struct DownloadNotificationContent: Equatable {
  let title: String
  let body: String

  /// Nil when nothing is worth reporting, e.g. the user cancelled every title.
  init?(batch: DownloadBatch, language: String? = nil) {
    let completed = batch.completedCount
    let failed = batch.failedIDs.count
    let total = completed + failed
    guard total > 0 else { return nil }

    title = batch.name ?? WatchStabilityCopy.text(Self.fallbackTitle(batch.kind), language: language)
    if total == 1 && batch.kind != .playlist {
      // The title already names the song, so the body only states the result.
      body = WatchStabilityCopy.text(failed == 0 ? .batchSingleDownloaded : .batchSingleFailed, language: language)
    } else if failed == 0 {
      body = WatchStabilityCopy.plural(completed, one: .batchDownloadedOne, other: .batchDownloadedOther, language: language)
    } else if completed == 0 {
      body = WatchStabilityCopy.plural(failed, one: .batchFailedOne, other: .batchFailedOther, language: language)
    } else {
      body = WatchStabilityCopy.format(.batchPartial, completed, total, failed, language: language)
    }
  }

  private static func fallbackTitle(_ kind: DownloadBatch.Kind) -> WatchStabilityCopy.Key {
    switch kind {
    case .phone: return .batchTitlePhone
    case .playlist: return .batchTitlePlaylist
    case .video: return .batchTitleVideo
    }
  }
}
