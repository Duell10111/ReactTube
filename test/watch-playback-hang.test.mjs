import assert from "node:assert/strict";
import test from "node:test";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const player = watchSource("MusicPlayerManager.swift");

test("P01 routes the iPhone application context through the player check", () => {
  const handler = swiftMethod(
    watchSource("SessionSync.swift"),
    "func session(_ session: WCSession, didReceiveApplicationContext",
  );
  assert.match(handler, /phoneContextReceived\(/);
  assert.doesNotMatch(handler, /applyPhonePlaybackState/);
  assert.match(player, /private func applyPhonePlaybackState\(/);
});

test(
  "P01 keeps a local start when the iPhone context arrives before it plays",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(`
import Foundation
final class WatchLog {
  static let shared = WatchLog()
  var infos = 0
  func info(_ category: String, _ message: String) { infos += 1 }
  func warning(_ category: String, _ message: String) {}
}
final class Player {}
enum NowPlayingCenter { static func clear(player: Player?) {} }
enum PlayerType { case local, phone }
@MainActor
final class Probe {
  var type = PlayerType.local
  var player: Player? = Player()
  var playbackRevision = 0
  var wantsPlayback = false
  var isPlaying = false
  var currentTitle = "Local"
  var currentArtist: String? = "Artist"
  var currentTime = 12.0
  var duration = 100.0
  ${swiftMethod(player, "func phoneContextReceived(")}
  ${swiftMethod(player, "private func applyPhonePlaybackState(")}
  func run() {
    // A local start waits for the audio session: isPlaying is still false.
    wantsPlayback = true
    phoneContextReceived(title: "Phone", isPlaying: false)
    precondition(type == .local && playbackRevision == 0 && currentTitle == "Local")
    precondition(WatchLog.shared.infos == 1)

    // Local playback is running.
    isPlaying = true
    phoneContextReceived(title: "Phone", isPlaying: true)
    precondition(type == .local && playbackRevision == 0)

    // Idle watch: the iPhone takes over synchronously.
    wantsPlayback = false
    isPlaying = false
    phoneContextReceived(title: "Phone", isPlaying: true)
    precondition(type == .phone && playbackRevision == 1)
    precondition(currentTitle == "Phone" && currentArtist == nil && isPlaying)
    precondition(currentTime == 0 && duration == 0)

    // In phone mode every update is mirrored.
    phoneContextReceived(title: "Next", isPlaying: false)
    precondition(currentTitle == "Next" && !isPlaying && playbackRevision == 2)
  }
}
@main struct Main {
  @MainActor static func main() { Probe().run() }
}
`);
  },
);

test("P01 stops counting a finished queue as local playback", () => {
  const setup = swiftMethod(player, "private func setupPlayer()");
  assert.match(setup, /if state == \.ended \{ self\.wantsPlayback = false \}/);
});

test("P02 never replaces a known duration with a missing one", () => {
  const add = swiftMethod(
    watchSource("DBUtils.swift"),
    "func addDownloadData(",
  );
  const fileBlock = add.slice(
    add.indexOf("if let fURL = fileURL"),
    add.indexOf("if duration > 0"),
  );
  assert.doesNotMatch(fileBlock, /durationMillis/);
  assert.match(add, /if duration > 0 \{\s*video\.durationMillis = duration/);
});

test("P02 crops downloads only when their duration is known", () => {
  const item = swiftMethod(
    watchSource("PlaylistManager.swift"),
    "private func getPlayerItem(",
  );
  assert.match(item, /video\.durationMillis > 0\s*\?\s*TrackEndtime\(/);
  assert.match(item, /: Track\(url: uri, artworkUrl: coverURL\)/);
  assert.match(
    item,
    /CMTime\(value: Int64\(video\.durationMillis\), timescale: 1000\)/,
  );
});
