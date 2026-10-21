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
