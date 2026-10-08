//
//  WatchLibraryProtocol.swift
//  watch
//
//  Wire format for managing the watch library from the iPhone. Must stay in
//  sync with src/hooks/watchSync/WatchLibraryProtocol.ts.
//

import Foundation

enum WatchLibraryProtocol {
  static let version = 1

  static let snapshotType = "librarySnapshot"
  static let commandType = "libraryCommand"
  static let commandResultType = "libraryCommandResult"
  /// Watch -> phone: a linked playlist was edited on the watch.
  static let playlistChangedType = "playlistChanged"
  /// Watch -> phone: a linked playlist was deleted on the watch, ending the link.
  static let playlistDeletedType = "playlistDeleted"
  /// Key of the short status inside the watch -> phone application context.
  static let statusContextKey = "libraryStatus"

  /// Snapshots up to this size are sent inline via sendMessage while the phone
  /// is reachable; WatchConnectivity messages are limited to roughly 65 KB.
  static let maxInlineSnapshotBytes = 48_000
}

struct LibrarySnapshot: Codable {
  var protocolVersion: Int
  var revision: Int
  /// Milliseconds since 1970.
  var generatedAt: Int64
  var storage: LibraryStorage
  var videos: [LibrarySnapshotVideo]
  var playlists: [LibrarySnapshotPlaylist]
  var activeDownloads: [LibraryActiveDownload]
  var pendingDownloads: [String]
}

struct LibraryStorage: Codable {
  /// Bytes used by downloaded media of this app.
  var usedBytes: Int64
  /// Free bytes on the watch volume.
  var availableBytes: Int64
}

struct LibrarySnapshotVideo: Codable {
  var id: String
  var title: String?
  var artist: String?
  var durationMillis: Int
  var downloaded: Bool
  var sizeBytes: Int64?
  var coverUrl: String?
}

struct LibrarySnapshotPlaylist: Codable {
  var id: String
  var title: String?
  var videoIds: [String]
  var autoDownload: Bool
  var temp: Bool
  var linked: Bool
  var syncVersion: Int
}

struct LibraryActiveDownload: Codable {
  var id: String
  var progress: Double
}

struct LibraryStatus {
  var revision: Int
  var usedBytes: Int64
  var availableBytes: Int64
  var downloadedCount: Int

  var dictionary: [String: Any] {
    [
      "protocolVersion": WatchLibraryProtocol.version,
      "revision": revision,
      "usedBytes": usedBytes,
      "availableBytes": availableBytes,
      "downloadedCount": downloadedCount,
    ]
  }
}
