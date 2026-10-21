import assert from "node:assert/strict";
import test from "node:test";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const source = watchSource("MusicPlayerManager.swift");

test(
  "W06 binds resume position to the title and saves the old playlist before switching",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(`
import Foundation
struct Video { let id: String; var title: String?; var artist: String?; var durationMillis = 200000 }
struct ResumeState {
  let videoID: String; let title: String; let artist: String?; let playlistID: String?; let playlistTitle: String?; let index: Int; let position: Double; let updatedAt: Date
}
final class Preferences {
  var resumeState: ResumeState?
  func storeResumeState(_ state: ResumeState) { resumeState = state }
}
final class Event { func removeListener(_ object: AnyObject) {} }
final class Events {
  let currentItem = Event(); let fail = Event(); let stateChange = Event(); let secondElapse = Event(); let updateDuration = Event(); let seek = Event()
}
enum NowPlayingCenter { static func clear(player: Player?) {} }
final class Player {
  let event = Events()
  var remoteCommands: [Int] = []
  func clear() {}
  var seekPosition: Double?
  func pause() {}
  func seek(to seconds: Double) { seekPosition = seconds }
}
final class PlaylistManager {
  var videos: [Video]? = []
  var hasTitles: Bool { !(videos?.isEmpty ?? true) }
  func setPlaylist(_ playlist: Int?, videos: [Video]) { self.videos = videos }
}
enum PlayerType { case local, phone }
final class Probe {
  var type = PlayerType.local
  var player: Player? = Player()
  let preferences = Preferences()
  let playlistManager = PlaylistManager()
  var playerPlaylistItems = [Video(id: "old", title: "Old", artist: nil)]
  var currentTrackIndex = 0
  var currentVideo: Video? { playerPlaylistItems.indices.contains(currentTrackIndex) ? playerPlaylistItems[currentTrackIndex] : nil }
  var currentPlaylistID: String? = "old-playlist"
  var currentPlaylistTitle: String? = "Old playlist"
  var currentTime = 80.0
  var duration = 200.0
  var lastPersistedPosition = 0.0
  var sessionGeneration = 0
  var playbackRevision = 0
  var requestedStartVideoID: String?
  var waitingForVideoID: String?
  var wantsPlayback = true
  var trackIndex = 0
  var currentTitle = "Old"
  var currentArtist: String?
  var currentCover: Int?
  var isPlaying = true
  var isStalled = false
  var volumeObserver: NSKeyValueObservation?
  ${swiftMethod(source, "private struct PendingSeek")}
  private var pendingSeek: PendingSeek?
  var plays = 0
  func setupPlayer() -> Bool {
    playerPlaylistItems = playlistManager.videos ?? []
    guard !playerPlaylistItems.isEmpty else { return false }
    player = Player()
    return true
  }
  func playMusic() { plays += 1 }
  ${swiftMethod(source, "private func deinitPlayer()")}
  ${swiftMethod(source, "private func storeResumeState()")}
  ${swiftMethod(source, "private func pendingSeekPosition()")}
  ${swiftMethod(source, "private func applyPendingSeek()")}
  ${swiftMethod(source, "func updatePlaylist(newPlaylist:")}
  func run() {
    updatePlaylist(newPlaylist: [Video(id: "next", title: "Next", artist: nil)])
    precondition(preferences.resumeState?.videoID == "old")
    precondition(preferences.resumeState?.playlistID == "old-playlist")
    precondition(preferences.resumeState?.position == 80)
    pendingSeek = PendingSeek(videoID: "expired", position: 123)
    applyPendingSeek()
    precondition(player?.seekPosition == nil)
    pendingSeek = PendingSeek(videoID: "next", position: 123)
    applyPendingSeek()
    precondition(player?.seekPosition == 123)
    pendingSeek = PendingSeek(videoID: "next", position: 999)
    applyPendingSeek()
    precondition(player?.seekPosition == 200)
    pendingSeek = PendingSeek(videoID: "next", position: .infinity)
    applyPendingSeek()
    precondition(player?.seekPosition == 200)
    pendingSeek = PendingSeek(videoID: "next", position: 50)
    updatePlaylist(newPlaylist: [Video(id: "new", title: "New", artist: nil)])
    applyPendingSeek()
    precondition(player?.seekPosition == nil)
    let previousPlays = plays
    updatePlaylist(newPlaylist: [])
    precondition(player == nil && playerPlaylistItems.isEmpty)
    precondition(currentTitle == "Unknown Title" && currentArtist == nil && currentCover == nil)
    precondition(!isPlaying && !wantsPlayback && volumeObserver == nil && plays == previousPlays)
  }
}
@main struct Main { static func main() { Probe().run() } }
`);
  },
);

test("W07 releases the player and listeners and starts only a successfully built queue", () => {
  const teardown = swiftMethod(source, "private func deinitPlayer()");
  assert.match(teardown, /player = nil/);
  assert.match(teardown, /playerPlaylistItems.removeAll/);
  assert.match(teardown, /event.currentItem.removeListener/);
  assert.match(teardown, /NowPlayingCenter.clear/);
  assert.match(swiftMethod(source, "private func setupPlayer()"), /-> Bool/);
  assert.match(
    swiftMethod(source, "func updatePlaylist(newPlaylist:"),
    /if didSetup/,
  );
});
