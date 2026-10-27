import assert from "node:assert/strict";
import test from "node:test";
import {fileURLToPath, URL} from "node:url";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const controller = watchSource("DataController.swift");

test(
  "W09 retries without deleting the store and backs up every SQLite file before reset",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(
      `
import Foundation
import Observation
import SwiftData
final class WatchLog {
  static let shared = WatchLog()
  func error(_ category: String, _ message: String) {}
}
${swiftMethod(watchSource("DBUtils.swift"), "func repairHomeScreenCache(")}
@MainActor
@Observable
${swiftMethod(controller, "final class DataController")}
@main struct Main {
  @MainActor static func main() throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: root) }
    let store = root.appendingPathComponent("library.store")
    for suffix in ["", "-wal", "-shm"] {
      try Data(("original" + suffix).utf8).write(to: URL(fileURLWithPath: store.path + suffix))
    }
    var attempts = 0
    let data = DataController(storeURL: store, openContainer: { _ in
      attempts += 1
      if attempts < 3 { throw NSError(domain: "test", code: 1) }
      return try ModelContainer(for: Video.self, Playlist.self, HomeScreenSection.self, HomeScreenElement.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
    })
    precondition(data.state == .failed && data.container == nil && data.failure != nil)
    data.retry()
    precondition(data.state == .failed && data.lastBackupURL == nil)
    precondition((try? Data(contentsOf: store)) == Data("original".utf8))
    data.rebuildStore()
    precondition(data.state == .ready && data.container != nil && attempts == 3)
    for suffix in ["", "-wal", "-shm"] {
      let backupFile = data.lastBackupURL!.appendingPathComponent("library.store" + suffix)
      precondition((try? Data(contentsOf: backupFile)) == Data(("original" + suffix).utf8))
    }
    let inMemory = DataController(inMemory: true)
    precondition(inMemory.state == .ready && inMemory.container != nil)
    // Opening an existing persistent store keeps library data and relationships.
    let existingURL = root.appendingPathComponent("existing.store")
    do {
      let old = try ModelContainer(for: Video.self, Playlist.self, HomeScreenSection.self, HomeScreenElement.self, configurations: ModelConfiguration(url: existingURL))
      let video = Video(id: "saved", durationMillis: 1000, title: "Saved", downloaded: true)
      video.fileURL = "saved/audio.mp4"
      let playlist = Playlist(id: "playlist", title: "Playlist")
      playlist.videoIDs = ["saved"]
      playlist.videos = [video]
      old.mainContext.insert(video)
      old.mainContext.insert(playlist)
      try old.mainContext.save()
    }
    let reopened = DataController(storeURL: existingURL)
    precondition(reopened.state == .ready)
    let videos = try reopened.container!.mainContext.fetch(FetchDescriptor<Video>())
    let playlists = try reopened.container!.mainContext.fetch(FetchDescriptor<Playlist>())
    precondition(videos.count == 1 && videos[0].downloaded && videos[0].fileURL == "saved/audio.mp4")
    precondition(playlists.count == 1 && playlists[0].orderedVideos.map(\\.id) == ["saved"])
  }
}
`,
      [
        fileURLToPath(
          new URL("../targets/watch/DBData.swift", import.meta.url),
        ),
      ],
    );
  },
);

test("W09 exposes recovery before model views and keeps background files when the store is unavailable", () => {
  const app = watchSource("watchApp.swift");
  assert.match(app, /if let container = dataController.container/);
  assert.match(app, /DatabaseRecoveryView\(controller: dataController\)/);
  assert.match(app, /\.alert\(DatabaseRecoveryCopy.rebuild/);
  assert.doesNotMatch(controller, /fatalError/);
  // A failing home-cache repair must not turn an opened store into a failure.
  assert.match(
    swiftMethod(controller, "func retry()"),
    /do \{\s*try repairHomeScreenCache\(opened.mainContext\)\s*\} catch \{/,
  );
  assert.match(
    watchSource("DownloadManager.swift"),
    /guard let context = DataController.shared.container\?\.mainContext else \{ return false \}/,
  );
});

test(
  "W09 provides matching native English/German copy and an independent persisted UI language",
  {skip: process.platform !== "darwin"},
  () => {
    const copy = swiftMethod(
      watchSource("WatchStabilityCopy.swift"),
      "enum WatchStabilityCopy",
    );
    runSwift(`
import Foundation
${copy}
@main struct Main {
  static func main() {
    for key in WatchStabilityCopy.Key.allCases {
      let english = WatchStabilityCopy.text(key, language: "en")
      let german = WatchStabilityCopy.text(key, language: "de")
      precondition(!english.isEmpty && !german.isEmpty && english != german)
    }
    precondition(WatchStabilityCopy.text(.recoveryRetry, language: "fr") == "Try again")
  }
}
`);
    assert.match(watchSource("watchApp.swift"), /@AppStorage\("uiLanguage"\)/);
    assert.doesNotMatch(copy, /languageSelected/);
  },
);
