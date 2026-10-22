import assert from "node:assert/strict";
import test from "node:test";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const source = watchSource("DownloadManager.swift");

test("W04 cancels audio, cover and metadata before deleting library entries", () => {
  const cancel = swiftMethod(source, "func cancel(ids:");
  assert.match(cancel, /generations.removeValue/);
  assert.match(cancel, /coverKeys.removeValue/);
  assert.match(cancel, /VideoMetadataRequests.shared.cancel/);
  const db = watchSource("DBUtils.swift");
  for (const signature of [
    "func removeVideoFromPlaylist(",
    "func deleteDownloadedPlaylist(",
  ]) {
    assert.match(swiftMethod(db, signature), /prepareForVideoDeletion/);
  }
  // Freeing a download keeps the title: cancel, drop the file item, delete, re-add.
  assert.match(
    swiftMethod(db, "func deleteDownloadedVideo("),
    /DownloadManager.shared.cancel\(ids: \[id\]\)[\s\S]*?prepareForDownloadRemoval[\s\S]*?deleteDownloadedVideoFile[\s\S]*?downloadRemoved/,
  );
  assert.match(swiftMethod(db, "func clearDatabase("), /cancelAll/);
  assert.doesNotMatch(
    swiftMethod(source, "private func complete("),
    /addDownloadData/,
  );
});

test(
  "W04 late audio and cover callbacks cannot save files or revive a deleted title",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(`
import Foundation
final class Video: Hashable {
  let id = "a"
  var downloaded = false
  var fileURL: String?
  var durationMillis = 1000
  var title: String? = "Title"
  var downloadURL: String? = "https://example.test/audio"
  var validUntil: Date? = Date().addingTimeInterval(100)
  var coverURL: String? = "https://example.test/cover"
  static func == (lhs: Video, rhs: Video) -> Bool { lhs === rhs }
  func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
struct ActiveDownload { var id: String }
final class WatchLog {
  static let shared = WatchLog()
  func error(_ category: String, _ message: String) {}
}
enum DownloadMessages { static let unavailable = "unavailable"; static let saveFailed = "save"; static let startFailed = "start" }
final class VideoMetadataRequests {
  static let shared = VideoMetadataRequests()
  func cancel(ids: Set<String>) {}
}
struct WatchDownloadJob {
  let id: String
  let videoID: String
  let kind: String
  let generation: UUID
  let duration: Int
}
final class Transport {
  var jobs: [WatchDownloadJob] = []
  var cancelled: [String] = []
  func start(videoID: String, kind: String, generation: UUID, duration: Int, url: URL) -> String? {
    let key = String(jobs.count + 1)
    jobs.append(WatchDownloadJob(id: key, videoID: videoID, kind: kind, generation: generation, duration: duration))
    return key
  }
  func cancel(key: String) { cancelled.append(key) }
}
final class Context { func save() throws {} }
final class DataController {
  static let shared = DataController()
  let container: Container? = Container()
}
final class Container { let mainContext = Context() }
let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
func getDownloadVideoDirectory(id: String) -> URL { directory.appendingPathComponent(id) }
final class Probe {
  let transport = Transport()
  var requestedIDs: Set<String> = []
  func persistQueue() {}
  var pendingDownloads: Set<Video> = []
  var awaitingMetadata: Set<String> = []
  var failedDownloads: [String: String] = [:]
  var activeDownloads: [ActiveDownload] = []
  var progressDownloads: [String: Double] = [:]
  var downloadKeys: [String: String] = [:]
  var coverKeys: [String: String] = [:]
  var generations: [String: UUID] = [:]
  var video: Video? = Video()
  var updates = 0
  func notifyProgress() {}
  func checkDownloads() {}
  func existingVideo(id: String) -> Video? { video }

  ${swiftMethod(source, "private func downloadVideo(")}
  ${swiftMethod(source, "func cancel(ids:")}
  ${swiftMethod(source, "private func complete(")}
  func run() throws {
    defer { try? FileManager.default.removeItem(at: directory) }
    precondition(downloadVideo(video: video!))
    let oldJobs = transport.jobs
    precondition(oldJobs.count == 2)
    cancel(ids: ["a"])
    precondition(Set(transport.cancelled) == ["1", "2"])
    video = nil
    oldJobs.forEach { precondition(complete(job: $0, file: URL(fileURLWithPath: "/tmp/missing"), error: nil)) }
    precondition(!FileManager.default.fileExists(atPath: directory.path) && activeDownloads.isEmpty)
    video = Video()
    precondition(downloadVideo(video: video!))
    oldJobs.forEach { precondition(complete(job: $0, file: URL(fileURLWithPath: "/tmp/missing"), error: nil)) }
    precondition(!FileManager.default.fileExists(atPath: directory.path))
    let input = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try Data("audio".utf8).write(to: input)
    defer { try? FileManager.default.removeItem(at: input) }
    transport.jobs.suffix(2).forEach { precondition(complete(job: $0, file: input, error: nil)) }
    precondition(video!.downloaded && video!.fileURL == "a/audio.mp4" && video!.coverURL == "a/cover.png")
    precondition(FileManager.default.fileExists(atPath: directory.appendingPathComponent("a/audio.mp4").path))
  }
}
@main struct Main { static func main() throws { try Probe().run() } }
`);
  },
);
