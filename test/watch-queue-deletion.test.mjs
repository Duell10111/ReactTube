import test from "node:test";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const source = watchSource("MusicPlayerManager.swift");
const playlistSource = watchSource("PlaylistManager.swift");

const probe = run => `
import Foundation
struct Video { let id: String }
struct ResumeState { let videoID: String }
final class Preferences {
  var resumeState: ResumeState?
  func clearResumeState() { resumeState = nil }
}
final class WatchLog {
  static let shared = WatchLog()
  func error(_ category: String, _ message: String) {}
}
/// Mirrors the index handling of SwiftAudioEx's QueueManager.removeItem(at:).
final class Player {
  var ids: [String]
  var currentIndex: Int
  init(_ ids: [String], current: Int) { self.ids = ids; currentIndex = current }
  func clear() { ids.removeAll(); currentIndex = -1 }
  func removeItem(at index: Int) throws {
    ids.remove(at: index)
    if index == currentIndex {
      currentIndex = ids.count > 0 ? currentIndex % ids.count : -1
    } else if index < currentIndex {
      currentIndex -= 1
    }
  }
}
final class PlaylistManager {
  private(set) var orderedVideoIDs: [String] = []
  var videos: [Video]? = []
  var playable: Set<String> = []
  func contains(id: String) -> Bool { orderedVideoIDs.contains(id) }
  func isPlayable(_ video: Video) -> Bool { playable.contains(video.id) }
  func setPlaylist(_ playlist: Int?, videos: [Video]) {
    orderedVideoIDs = videos.map(\\.id)
    self.videos = videos
  }
  ${swiftMethod(playlistSource, "func remove(ids:")}
}
var requested: [String] = []
func requestVideo(id: String) { requested.append(id) }
final class Probe {
  struct PendingSeek { let videoID: String; let position: Double }
  var player: Player?
  var playerPlaylistItems: [Video] = []
  let playlistManager = PlaylistManager()
  let preferences = Preferences()
  var currentTrackIndex = 0
  var trackIndex = 0
  var currentTime = 0.0
  var currentVideo: Video? { playerPlaylistItems.indices.contains(currentTrackIndex) ? playerPlaylistItems[currentTrackIndex] : nil }
  var currentPlaylistID: String? = "playlist"
  var currentPlaylistTitle: String? = "Playlist"
  var wantsPlayback = true
  var isStalled = false
  var pendingSeek: PendingSeek?
  var requestedStartVideoID: String?
  var waitingForVideoID: String?
  var pauses = 0
  var teardowns = 0
  var refreshed: [String] = []
  func pauseMusic() { pauses += 1; wantsPlayback = false }
  func deinitPlayer() { teardowns += 1 }
  func updateNowPlayingMetadata() {}
  func videoMetadataUpdated(id: String) { refreshed.append(id) }
  func load(_ ids: [String], current: Int) {
    playlistManager.setPlaylist(nil, videos: ids.map(Video.init))
    playerPlaylistItems = ids.map(Video.init)
    player = Player(ids, current: current)
    currentTrackIndex = current
    currentTime = 42
    currentPlaylistID = "playlist"
    wantsPlayback = true
    pauses = 0
    teardowns = 0
  }
  func queue() -> [String] { playerPlaylistItems.map(\\.id) }
  ${swiftMethod(source, "func prepareForLibraryDeletion(")}
  ${swiftMethod(source, "func prepareForDownloadRemoval(")}
  ${swiftMethod(source, "func downloadRemoved(")}
  ${swiftMethod(source, "private func removeFromQueue(")}
  ${swiftMethod(source, "private func stopForLibraryDeletion(")}
${run}
}
@main struct Main { static func main() { Probe().run() } }
`;

test(
  "deleting a queued title keeps playing the rest of the queue",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(
      probe(`  func run() {
    // A title after the current one leaves only the queue and the playlist.
    load(["a", "b", "c"], current: 1)
    preferences.resumeState = ResumeState(videoID: "b")
    prepareForLibraryDeletion(ids: ["c"])
    precondition(queue() == ["a", "b"] && player?.ids == ["a", "b"] && player?.currentIndex == 1)
    precondition(!playlistManager.contains(id: "c") && currentVideo?.id == "b" && currentTime == 42)
    precondition(pauses == 0 && teardowns == 0 && wantsPlayback && preferences.resumeState?.videoID == "b")
    // A title before the current one keeps the current title selected.
    load(["a", "b", "c"], current: 1)
    prepareForLibraryDeletion(ids: ["a"])
    precondition(queue() == ["b", "c"] && player?.currentIndex == 0 && currentVideo?.id == "b")
    // Deleting the current title continues with the next one from its start.
    load(["a", "b", "c"], current: 1)
    preferences.resumeState = ResumeState(videoID: "b")
    pendingSeek = PendingSeek(videoID: "b", position: 30)
    prepareForLibraryDeletion(ids: ["b"])
    precondition(queue() == ["a", "c"] && currentVideo?.id == "c" && currentTime == 0)
    precondition(pauses == 0 && teardowns == 0 && preferences.resumeState == nil && pendingSeek == nil)
    // Deleting the last current title stops at the start instead of replaying it.
    load(["a", "b"], current: 1)
    prepareForLibraryDeletion(ids: ["b"])
    precondition(queue() == ["a"] && currentVideo?.id == "a" && pauses == 1 && teardowns == 0)
  }`),
    );
  },
);

test(
  "deleting the current playlist or every title stops playback",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(
      probe(`  func run() {
    load(["a", "b"], current: 0)
    prepareForLibraryDeletion(ids: [], playlistID: "playlist")
    precondition(teardowns == 1 && player == nil && queue().isEmpty && !playlistManager.contains(id: "a"))
    load(["a", "b"], current: 0)
    prepareForLibraryDeletion(ids: ["a", "b"])
    precondition(teardowns == 1 && player == nil && currentPlaylistID == nil)
    // A queue still waiting for metadata has no player yet but stops as well.
    load(["a"], current: 0)
    player = nil
    playerPlaylistItems = []
    prepareForLibraryDeletion(ids: ["a"])
    precondition(teardowns == 1 && currentPlaylistID == nil && !playlistManager.contains(id: "a"))
    // Unrelated deletions leave the player alone.
    load(["a", "b"], current: 0)
    prepareForLibraryDeletion(ids: ["x"], playlistID: "other")
    precondition(teardowns == 0 && queue() == ["a", "b"])
  }`),
    );
  },
);

test(
  "freeing a download replaces its queued file item with a stream",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(
      probe(`  func run() {
    load(["a", "b", "c"], current: 0)
    prepareForDownloadRemoval(ids: ["c"])
    // The title stays in the playlist, so it can return as a stream.
    precondition(queue() == ["a", "b"] && playlistManager.contains(id: "c") && teardowns == 0)
    playlistManager.playable = ["c"]
    downloadRemoved(ids: ["c"])
    precondition(refreshed == ["c"] && requested.isEmpty)
    // Without a valid stream link a fresh one is requested instead.
    load(["a", "b", "c"], current: 0)
    prepareForDownloadRemoval(ids: ["b"])
    playlistManager.playable = []
    downloadRemoved(ids: ["b"])
    precondition(requested == ["b"])
    // Freeing the only queued title stops, but keeps the resume state.
    load(["a"], current: 0)
    preferences.resumeState = ResumeState(videoID: "a")
    prepareForDownloadRemoval(ids: ["a"])
    precondition(teardowns == 1 && player == nil && preferences.resumeState?.videoID == "a")
  }`),
    );
  },
);
