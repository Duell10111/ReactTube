import assert from "node:assert/strict";
import test from "node:test";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const source = watchSource("MusicPlayerManager.swift");

test("W01 confines model access and player control to the main actor", () => {
  assert.match(source, /@MainActor\s+@Observable\s+class MusicPlayerManager/);
  assert.doesNotMatch(source, /queue\.async/);
  assert.doesNotMatch(watchSource("DBUtils.swift"), /queue\.async/);
  assert.match(
    watchSource("PlaylistManager.swift"),
    /@MainActor\s+class PlaylistManager/,
  );
});

test(
  "W01 ignores delayed activation after pause or a new session",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(`
import Foundation
final class WatchLog {
  static let shared = WatchLog()
  func info(_ category: String, _ message: String) {}
  func warning(_ category: String, _ message: String) {}
}
final class Player {
  var items = [1]
  var currentItem: Item? = nil
  var playerState = 0
  var plays = 0
  func play() { plays += 1 }
  func pause() {}
}
final class Item {
  func getTitle() -> String? { nil }
  func getArtist() -> String? { nil }
}
final class AVAudioSession {
  static let instance = AVAudioSession()
  static func sharedInstance() -> AVAudioSession { instance }
  enum Category { case playback }
  enum Mode { case \`default\` }
  enum Policy { case longFormAudio }
  var completion: ((Bool, Error?) -> Void)?
  func setCategory(_ category: Category, mode: Mode, policy: Policy, options: [Int]) throws {}
  func setActive(_ active: Bool) throws {}
  func activate(_ completion: @escaping (Bool, Error?) -> Void) { self.completion = completion }
}
enum NowPlayingCenter {
  static func applyPlaybackValues(player: Player?, currentTime: Double, isPlaying: Bool) {}
}
enum PlayerType { case local, phone }
func pausePlayOnPhone() {}
@MainActor
final class Probe {
  var type = PlayerType.local
  var player: Player? = Player()
  var sessionGeneration = 0
  var playbackRevision = 0
  var wantsPlayback = false
  func validateCurrentStream() -> Bool { true }
  var isPlaying = false
  var isStalled = false
  var currentTitle = ""
  var currentArtist: String?
  var currentTime = 0.0
  func storeResumeState() {}
  ${swiftMethod(source, "nonisolated private func onMain(")}
  ${swiftMethod(source, "func playMusic()")}
  ${swiftMethod(source, "func pauseMusic()")}
  func run() async {
    playMusic()
    let callback = AVAudioSession.instance.completion!
    pauseMusic()
    callback(true, nil)
    try? await Task.sleep(for: .milliseconds(20))
    precondition(player!.plays == 0)
    playMusic()
    let old = AVAudioSession.instance.completion!
    sessionGeneration += 1
    old(true, nil)
    try? await Task.sleep(for: .milliseconds(20))
    precondition(player!.plays == 0)
    playMusic()
    AVAudioSession.instance.completion!(true, nil)
    try? await Task.sleep(for: .milliseconds(20))
    precondition(player!.plays == 1)
  }
}
@main struct Main {
  @MainActor static func main() async { await Probe().run() }
}
`);
  },
);

test("W02 refreshes queue entries and revalidates streams before playback", () => {
  assert.match(
    watchSource("YoutubeAPI.swift"),
    /MusicPlayerManager.shared.videoMetadataUpdated/,
  );
  assert.match(swiftMethod(source, "func videoMetadataUpdated("), /orderedIDs/);
  assert.match(
    swiftMethod(source, "func videoMetadataUpdated("),
    /if wantsPlayback && !isPlaying/,
  );
  assert.match(
    swiftMethod(source, "func playMusic()"),
    /guard validateCurrentStream/,
  );
  assert.match(
    watchSource("PlaylistManager.swift"),
    /IndexSet\(videos.indices\)/,
  );
  assert.doesNotMatch(
    swiftMethod(watchSource("PlaylistManager.swift"), "func getVideos("),
    /let playerItem = playlistItems/,
  );
});

test(
  "W02 adds fresh titles in order without resuming a paused or replaced playlist",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(`
import Foundation
struct Video { let id: String }
struct Item { let id: String }
enum PlayerType { case local, phone }
final class WatchLog {
  static let shared = WatchLog()
  func error(_ category: String, _ message: String) {}
}
final class PlaylistManager {
  var videos: [Video]? = [Video(id: "a"), Video(id: "b"), Video(id: "c")]
  var orderedVideoIDs: [String] { videos?.map(\\.id) ?? [] }
  func contains(id: String) -> Bool { orderedVideoIDs.contains(id) }
  var ready = Set(["b"])
  func checkForNewVideos() -> [(Video, Item)] { (videos ?? []).filter { ready.contains($0.id) }.map { ($0, Item(id: $0.id)) } }
}
final class Player {
  var items = [Item(id: "b")]
  var currentIndex = 0
  func add(items: [Item], at index: Int) throws {
    if !self.items.isEmpty && index <= currentIndex { currentIndex += items.count }
    self.items.insert(contentsOf: items, at: index)
  }
  func load(item: Item, playWhenReady: Bool) { items[currentIndex] = item }
}
final class Probe {
  var type = PlayerType.local
  var playlistManager = PlaylistManager()
  var player: Player? = Player()
  var playerPlaylistItems = [Video(id: "b")]
  var currentTrackIndex = 0
  var trackIndex = 0
  var waitingForVideoID: String?
  var requestedStartVideoID: String?
  var wantsPlayback = true
  var isPlaying = true
  var plays = 0
  func setupPlayer() { player = Player() }
  func jumpToIndex(_ index: Int) { player?.currentIndex = index }
  func updateNowPlayingMetadata() {}
  func playMusic() { plays += 1 }
  ${swiftMethod(source, "func videoMetadataUpdated(")}
  func run() {
    playlistManager.ready = ["a", "b", "c"]
    videoMetadataUpdated(id: "c")
    precondition(playerPlaylistItems.map(\\.id) == ["a", "b", "c"])
    precondition(player!.currentIndex == 1 && plays == 0)
    wantsPlayback = false
    isPlaying = false
    videoMetadataUpdated(id: "a")
    precondition(plays == 0 && player!.items.count == 3)
    playlistManager.videos = [Video(id: "other")]
    videoMetadataUpdated(id: "a")
    precondition(plays == 0 && player!.items.count == 3)
    playlistManager.videos = [Video(id: "a")]
    playerPlaylistItems = []
    player!.items = []
    player!.currentIndex = 0
    wantsPlayback = true
    videoMetadataUpdated(id: "a")
    precondition(plays == 1 && playerPlaylistItems.map(\\.id) == ["a"])
  }
}
@main struct Main { static func main() { Probe().run() } }
`);
  },
);

test(
  "W02 includes titles whose models arrive after the playlist was selected",
  {skip: process.platform !== "darwin"},
  () => {
    const playlistSource = watchSource("PlaylistManager.swift");
    const implementation = swiftMethod(
      playlistSource,
      "class PlaylistManager",
    ).replace(
      swiftMethod(playlistSource, "private func getPlayerItem("),
      "private func getPlayerItem(_ video: Video) -> AudioItem? { video.ready ? AudioItem(id: video.id) : nil }",
    );
    runSwift(`
import Foundation
struct AudioItem { let id: String }
struct Video { let id: String; var ready = true }
final class Playlist {
  var videoIDs = ["a", "b", "c"]
  var orderedVideos = [Video(id: "b")]
}
var requests: [String] = []
func requestVideo(id: String) { requests.append(id) }
${implementation}
@main struct Main {
  static func main() {
    let playlist = Playlist()
    let manager = PlaylistManager()
    manager.setPlaylist(playlist)
    precondition(manager.hasTitles && manager.contains(id: "a"))
    precondition(manager.getFirstBatchOfAvailable().map { $0.0.id } == ["b"])
    precondition(requests == ["a", "c"])
    playlist.orderedVideos += [Video(id: "c"), Video(id: "a")]
    precondition(manager.checkForNewVideos().map { $0.0.id } == ["a", "b", "c"])
    manager.setPlaylist(playlist, shuffle: true)
    let order = manager.orderedVideoIDs
    playlist.orderedVideos = [Video(id: "c")]
    manager.setPlaylist(playlist, shuffle: true)
    let selectedOrder = manager.orderedVideoIDs
    playlist.orderedVideos += [Video(id: "b"), Video(id: "a")]
    precondition(manager.checkForNewVideos().map { $0.0.id } == selectedOrder)
    precondition(Set(order) == Set(selectedOrder))
    playlist.orderedVideos = []
    manager.setPlaylist(playlist)
    requests = []
    precondition(manager.hasTitles && manager.getFirstBatchOfAvailable().isEmpty)
    precondition(requests == ["a", "b", "c"])
    playlist.orderedVideos = [Video(id: "c"), Video(id: "a"), Video(id: "b")]
    precondition(manager.checkForNewVideos().map { $0.0.id } == ["a", "b", "c"])
  }
}
`);
  },
);
