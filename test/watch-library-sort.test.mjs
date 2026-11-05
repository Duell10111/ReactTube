import test from "node:test";
import {runSwift, watchSource, swiftMethod} from "./helpers/watchNative.mjs";

test("watch sorting, persistence and stream availability", () => {
  runSwift(`${watchSource("LibrarySort.swift")}
  struct Row { let id: String; var title: String?; var value: Double? }
  @main struct Probe {
    static func main() {
      let rows = [Row(id: "b", title: "Track 10", value: 10), Row(id: "a", title: "track 2", value: 2), Row(id: "c", title: "  ", value: nil)]
      for language in ["en", "de"] {
        for descending in [false, true] {
          let selection = LibrarySortSelection(criterion: "title", descending: descending)
          let result = LibrarySorter.ordered(rows, selection: selection, locale: Locale(identifier: language), id: { $0.id }, text: { $0.title }, number: { $0.value })
          precondition(result.map(\\.id) == (descending ? ["b", "a", "c"] : ["a", "b", "c"]))
          let duration = LibrarySorter.ordered(rows, selection: LibrarySortSelection(criterion: "duration", descending: descending), locale: Locale(identifier: language), id: { $0.id }, text: { $0.title }, number: { $0.value })
          precondition(duration.map(\\.id) == result.map(\\.id))
        }
        let ties = [Row(id: "b", title: "Äpfel", value: 1), Row(id: "a", title: "äPFEL", value: 1)]
        let sorted = LibrarySorter.ordered(ties, selection: LibrarySortSelection(descending: true), locale: Locale(identifier: language), id: { $0.id }, text: { $0.title }, number: { $0.value })
        precondition(sorted.map(\\.id) == ["a", "b"])
      }
      let name = "watch-sort-test-" + UUID().uuidString
      let defaults = UserDefaults(suiteName: name)!
      defer { defaults.removePersistentDomain(forName: name) }
      let preferences = LibrarySortPreferences(defaults: defaults)
      precondition(preferences.selection(.downloaded) == LibrarySortSelection())
      preferences.set(LibrarySortSelection(criterion: "duration", descending: true), for: .videos)
      preferences.set(LibrarySortSelection(criterion: "validity"), for: .downloaded)
      let reopened = LibrarySortPreferences(defaults: defaults)
      precondition(reopened.selection(.videos).descending)
      precondition(reopened.selection(.downloaded).criterion == "title")
      defaults.set(Data("invalid".utf8), forKey: "sort.available")
      precondition(LibrarySortPreferences(defaults: defaults).selection(.available).criterion == "title")
      let now = Date()
      func available(_ downloaded: Bool = false, _ file: String? = nil, _ stream: String? = "https://example.com", _ until: Date? = nil) -> Bool {
        LibrarySorter.streamAvailable(downloaded: downloaded, file: file, stream: stream, until: until, now: now)
      }
      precondition(available(false, nil, "url", now.addingTimeInterval(1)))
      precondition(!available(true, nil, "url", now.addingTimeInterval(1)))
      precondition(!available(false, "file", "url", now.addingTimeInterval(1)))
      precondition(!available(false, nil, nil, now.addingTimeInterval(1)))
      precondition(!available(false, nil, "url", now))
      precondition(!available())
    }
  }`);
});

test("library queue starts by playable ID and preserves playback on unavailable selection", () => {
  runSwift(`import Foundation
  struct Video { let id: String; let playable: Bool }
  struct Manager { func isPlayable(_ video: Video) -> Bool { video.playable } }
  class Player {
    let playlistManager = Manager()
    var queue: [Video] = [Video(id: "existing", playable: true)]
    func updatePlaylist(newPlaylist: [Video]) { queue = newPlaylist }
    ${swiftMethod(watchSource("MusicPlayerManager.swift"), "func startLibraryQueue(")}
  }
  @main struct Probe {
    static func main() {
      let player = Player()
      let videos = [Video(id: "missing", playable: false), Video(id: "selected", playable: true), Video(id: "next", playable: true)]
      precondition(!player.startLibraryQueue(videos, selectedID: "missing"))
      precondition(player.queue.map(\\.id) == ["existing"])
      precondition(!player.startLibraryQueue([], selectedID: "absent"))
      precondition(player.startLibraryQueue(videos, selectedID: "selected"))
      precondition(player.queue.map(\\.id) == ["selected", "next"])
    }
  }`);
});

test("watch library catalog has matching English and German resources", async () => {
  const {readFileSync} = await import("node:fs");
  const assert = await import("node:assert/strict");
  const catalog = JSON.parse(
    readFileSync(
      new URL("../targets/watch/Library.xcstrings", import.meta.url),
      "utf8",
    ),
  );
  for (const [key, entry] of Object.entries(catalog.strings)) {
    const en = entry.localizations.en.stringUnit.value;
    const de = entry.localizations.de.stringUnit.value;
    assert.ok(en && de, key);
    assert.deepEqual(en.match(/%@/g), de.match(/%@/g), key);
  }
});
