import {mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import test from "node:test";

import {runSwift, watchSource, swiftMethod} from "./helpers/watchNative.mjs";

test("playlist detail and historical sort options", () => {
  runSwift(`${watchSource("LibrarySort.swift")}
  struct Row { let id: String; var title: String?; var date: Double? }
  @main struct Probe {
    static func main() {
      let rows = [Row(id: "c", title: "B", date: nil), Row(id: "a", title: "C", date: 1), Row(id: "b", title: "A", date: 3)]
      let order = LibrarySorter.ordered(rows, selection: LibrarySortSelection(criterion: "order"), locale: Locale(identifier: "en"), id: { $0.id }, text: { $0.title }, number: { $0.date })
      precondition(order.map(\\.id) == ["c", "a", "b"])
      precondition(!LibrarySortSelection(criterion: "order", descending: true).descending)
      precondition(!LibrarySortSelection(criterion: "order").hasDirection)

      for criterion in ["added", "downloaded", "lastPlayed"] {
        precondition(LibrarySortSelection(criterion: criterion).descending)
        let newest = LibrarySorter.ordered(rows, selection: LibrarySortSelection(criterion: criterion), locale: Locale(identifier: "de"), id: { $0.id }, text: { $0.title }, number: { $0.date })
        precondition(newest.map(\\.id) == ["b", "a", "c"])
        let oldest = LibrarySorter.ordered(rows, selection: LibrarySortSelection(criterion: criterion, descending: false), locale: Locale(identifier: "de"), id: { $0.id }, text: { $0.title }, number: { $0.date })
        precondition(oldest.map(\\.id) == ["a", "b", "c"])
      }

      precondition(LibrarySortScope.playlists.criteria == ["title", "count", "lastPlayed", "added"])
      precondition(LibrarySortScope.videos.criteria == ["title", "artist", "duration", "added"])
      precondition(LibrarySortScope.downloaded.criteria == ["title", "artist", "duration", "downloaded"])
      precondition(LibrarySortScope.available.criteria == ["title", "artist", "validity"])
      precondition(LibrarySortScope.playlistDetail.criteria == ["order", "title", "artist", "duration"])

      let name = "watch-sort-detail-test-" + UUID().uuidString
      let defaults = UserDefaults(suiteName: name)!
      defer { defaults.removePersistentDomain(forName: name) }
      // Settings stored before the historical criteria existed keep their value.
      defaults.set(try! JSONEncoder().encode(LibrarySortSelection(criterion: "duration")), forKey: "sort.downloaded")
      let preferences = LibrarySortPreferences(defaults: defaults)
      precondition(preferences.selection(.downloaded).criterion == "duration")
      precondition(preferences.selection(.videos).criterion == "title")
      precondition(preferences.selection(.playlistDetail, playlistID: "p1").criterion == "order")
      preferences.set(LibrarySortSelection(criterion: "artist", descending: true), for: .playlistDetail, playlistID: "p1")
      preferences.set(LibrarySortSelection(criterion: "duration"), for: .playlistDetail, playlistID: "p2")
      preferences.set(LibrarySortSelection(criterion: "count"), for: .playlistDetail, playlistID: "p3")
      preferences.set(LibrarySortSelection(criterion: "title"), for: .playlistDetail)
      preferences.set(LibrarySortSelection(criterion: "added"), for: .videos)

      let reopened = LibrarySortPreferences(defaults: defaults)
      precondition(reopened.selection(.playlistDetail, playlistID: "p1") == LibrarySortSelection(criterion: "artist", descending: true))
      precondition(reopened.selection(.playlistDetail, playlistID: "p2").criterion == "duration")
      precondition(reopened.selection(.playlistDetail, playlistID: "p3").criterion == "order")
      precondition(reopened.selection(.playlistDetail).criterion == "order")
      precondition(reopened.selection(.videos) == LibrarySortSelection(criterion: "added", descending: true))
      reopened.removePlaylist(id: "p1")
      precondition(LibrarySortPreferences(defaults: defaults).selection(.playlistDetail, playlistID: "p1").criterion == "order")
      precondition(LibrarySortPreferences(defaults: defaults).selection(.playlistDetail, playlistID: "p2").criterion == "duration")
      reopened.removeAllPlaylists()
      precondition(LibrarySortPreferences(defaults: defaults).selection(.playlistDetail, playlistID: "p2").criterion == "order")

      // An unknown stored criterion falls back for that playlist only.
      let raw = #"{"p4":{"criterion":"validity","descending":false},"p5":{"criterion":"title","descending":true}}"#
      defaults.set(Data(raw.utf8), forKey: "sort.playlistDetails")
      let mixed = LibrarySortPreferences(defaults: defaults)
      precondition(mixed.selection(.playlistDetail, playlistID: "p4").criterion == "order")
      precondition(mixed.selection(.playlistDetail, playlistID: "p5") == LibrarySortSelection(criterion: "title", descending: true))
    }
  }`);
});

test("queue start and resume are resolved by video ID", () => {
  runSwift(`${watchSource("LibrarySort.swift")}
  @main struct Probe {
    static func main() {
      // An unplayable title before the selection must not shift the start.
      precondition(QueueOrder.startIndex(playable: ["a", "c", "d"], selectedID: "c") == 1)
      precondition(QueueOrder.startIndex(playable: ["a", "c"], selectedID: "b") == nil)
      precondition(QueueOrder.startIndex(playable: [], selectedID: "a") == nil)

      let current = ["a", "b", "c", "d", "e"]
      precondition(QueueOrder.resumed(stored: ["d", "a", "c", "b", "e"], current: current) == ["d", "a", "c", "b", "e"])
      // Deleted neighbors are skipped, new playlist titles are not inserted.
      precondition(QueueOrder.resumed(stored: ["d", "x", "a"], current: current) == ["d", "a"])
      // Resume data from older versions uses the current playlist order.
      precondition(QueueOrder.resumed(stored: nil, current: ["b", "a", "b"]) == ["b", "a"])
      precondition(QueueOrder.unique(["a", "a", "b"]) == ["a", "b"])
    }
  }`);
});

test("playlist manager keeps the playlist reference with a sorted order", () => {
  const manager = watchSource("PlaylistManager.swift");
  runSwift(`${watchSource("LibrarySort.swift")}
  struct Video { let id: String }
  final class Playlist {
    var videoIDs: [String]
    var orderedVideos: [Video]
    init(_ ids: [String], loaded: [String]) { videoIDs = ids; orderedVideos = loaded.map(Video.init) }
  }
  final class Manager {
    var playlist: Playlist?
    var videos: [Video]?
    var orderedVideoIDs: [String] = []
    ${swiftMethod(manager, "func setPlaylist(")}
    ${swiftMethod(manager, "private func refreshModels(")}
  }
  @main struct Probe {
    static func main() {
      let playlist = Playlist(["a", "b", "missing", "c"], loaded: ["a", "b", "c"])
      let manager = Manager()
      manager.setPlaylist(playlist)
      precondition(manager.orderedVideoIDs == ["a", "b", "missing", "c"])
      manager.setPlaylist(playlist, videos: [Video(id: "c"), Video(id: "a"), Video(id: "b")])
      precondition(manager.playlist === playlist)
      precondition(manager.orderedVideoIDs == ["c", "a", "b"])
      precondition(manager.videos?.map(\\.id) == ["c", "a", "b"])
      precondition(playlist.videoIDs == ["a", "b", "missing", "c"])
      manager.setPlaylist(playlist, orderedIDs: ["b", "c", "a"])
      precondition(manager.videos?.map(\\.id) == ["b", "c", "a"])
      manager.setPlaylist(nil, videos: [Video(id: "x"), Video(id: "y")])
      precondition(manager.orderedVideoIDs == ["x", "y"])
    }
  }`);
});

test("resume state stays readable and keeps the queue order", () => {
  runSwift(`import Foundation
  final class WatchLog {
    static let shared = WatchLog()
    func warning(_ category: String, _ message: String) {}
  }
  ${watchSource("PlayerPreferences.swift")}
  @main struct Probe {
    static func main() {
      let old = #"{"videoID":"b","title":"B","playlistID":"p","index":4,"position":12.5,"updatedAt":0}"#
      let decoded = try! JSONDecoder().decode(ResumeState.self, from: Data(old.utf8))
      precondition(decoded.videoID == "b" && decoded.queueVideoIDs == nil)

      let name = "watch-resume-test-" + UUID().uuidString
      let defaults = UserDefaults(suiteName: name)!
      defer { defaults.removePersistentDomain(forName: name) }
      defaults.set(Data(old.utf8), forKey: "player.resumeState")
      precondition(PlayerPreferences(defaults: defaults).resumeState?.playlistID == "p")

      let preferences = PlayerPreferences(defaults: defaults)
      preferences.storeResumeState(ResumeState(videoID: "c", title: "C", playlistID: "p", index: 0, position: 3, updatedAt: Date(), queueVideoIDs: ["d", "c", "a"]))
      preferences.updateResumePosition(9)
      let reopened = PlayerPreferences(defaults: defaults).resumeState
      precondition(reopened?.queueVideoIDs == ["d", "c", "a"] && reopened?.position == 9)
    }
  }`);
});

test("SwiftData store from before the date fields migrates and records dates", () => {
  const dir = mkdtempSync(join(tmpdir(), "reacttube-watch-store-"));
  const store = join(dir, "default.store");
  try {
    // Video and Playlist exactly as stored before the historical sort fields.
    runSwift(`import Foundation
    import SwiftData
    @Model final class Video {
      @Attribute(.unique) var id: String
      var title: String?
      var artist: String?
      var downloaded: Bool
      var durationMillis: Int
      var streamURL: String?
      var downloadURL: String?
      var validUntil: Date?
      var fileURL: String?
      var coverURL: String?
      var temp: Bool?
      var loudnessDb: Double?
      init(id: String, durationMillis: Int, title: String? = nil, downloaded: Bool = false) {
        self.id = id; self.durationMillis = durationMillis; self.title = title; self.downloaded = downloaded
      }
    }
    @Model final class Playlist {
      @Attribute(.unique) var id: String
      var title: String?
      var coverURL: String?
      var videoIDs: [String] = []
      var videos = [Video]()
      var temp: Bool?
      var download: Bool = false
      var linked: Bool = false
      var syncVersion: Int = 0
      init(id: String, title: String? = nil) { self.id = id; self.title = title }
    }
    @main struct Probe {
      @MainActor static func main() throws {
        let container = try ModelContainer(for: Video.self, Playlist.self, configurations: ModelConfiguration(url: URL(fileURLWithPath: ${JSON.stringify(store)})))
        let video = Video(id: "old", durationMillis: 1000, title: "Old", downloaded: true)
        let playlist = Playlist(id: "list", title: "List")
        playlist.videoIDs = ["old"]
        playlist.videos = [video]
        container.mainContext.insert(playlist)
        try container.mainContext.save()
      }
    }`);

    const dbUtils = watchSource("DBUtils.swift");
    runSwift(`import Foundation
    import SwiftData
    ${watchSource("DBData.swift")}
    func shouldReplaceCover(_ current: String?, with new: String) -> Bool { current == nil }
    ${swiftMethod(dbUtils, "func addDownloadData(")}
    @main struct Probe {
      @MainActor static func main() throws {
        let container = try ModelContainer(for: Video.self, Playlist.self, HomeScreenSection.self, HomeScreenElement.self, configurations: ModelConfiguration(url: URL(fileURLWithPath: ${JSON.stringify(store)})))
        let context = container.mainContext
        let old = try context.fetch(FetchDescriptor<Video>()).first!
        let playlist = try context.fetch(FetchDescriptor<Playlist>()).first!
        // Existing entries are kept and their history stays unknown.
        precondition(old.id == "old" && old.title == "Old" && old.downloaded)
        precondition(old.addedAt == nil && old.downloadedAt == nil)
        precondition(playlist.videoIDs == ["old"] && playlist.videos.count == 1)
        precondition(playlist.addedAt == nil && playlist.lastPlayedAt == nil)
        // Setting downloaded again does not invent a download date.
        old.setDownloaded(true)
        precondition(old.downloadedAt == nil)

        addDownloadData(context, id: "new", title: "New", duration: 2000)
        let created = try context.fetch(FetchDescriptor<Video>(predicate: #Predicate { $0.id == "new" })).first!
        let added = created.addedAt!
        precondition(created.downloadedAt == nil)
        addDownloadData(context, id: "new", title: "Refreshed", duration: 3000, streamURL: "https://example.com", validUntil: Date().addingTimeInterval(60), refreshStreamData: true)
        precondition(created.title == "Refreshed" && created.addedAt == added)

        let first = Date(timeIntervalSince1970: 100)
        created.setDownloaded(true, at: first)
        created.setDownloaded(true, at: Date(timeIntervalSince1970: 200))
        precondition(created.downloadedAt == first)
        created.setDownloaded(false)
        precondition(created.downloadedAt == nil)
        created.setDownloaded(true, at: Date(timeIntervalSince1970: 300))
        precondition(created.downloadedAt == Date(timeIntervalSince1970: 300))
        precondition(Playlist(id: "fresh").addedAt != nil)
        try context.save()
      }
    }`);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test("a library list under a pushed screen ignores row updates", async () => {
  const assert = await import("node:assert/strict");
  const source = watchSource("LibrarySnapshotList.swift");
  // Reacting while hidden made the navigation stack re-render the pushed
  // playlist endlessly (100 % CPU after opening a playlist).
  assert.match(
    source,
    /onPreferenceChange\(LibraryRowPositions\.self\) \{ positions in\s+guard visible else \{ return \}/,
  );
  assert.match(source, /onDisappear \{\s+visible = false/);
  assert.doesNotMatch(source, /@State private var pending: Task/);
});
