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
    "func deleteDownloadedVideo(",
  ]) {
    assert.match(swiftMethod(db, signature), /prepareForVideoDeletion/);
  }
  assert.match(swiftMethod(db, "func clearDatabase("), /cancelAll/);
  assert.doesNotMatch(
    swiftMethod(source, "private func receiveFileUpload("),
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
final class SDDownloadManager {
  static let shared = SDDownloadManager()
  var completions: [(Error?, URL?) -> Void] = []
  var cancelled: [String] = []
  func downloadFile(withRequest: URLRequest, shouldDownloadInBackground: Bool, onProgress: ((Float) -> Void)?, completion: @escaping (Error?, URL?) -> Void) -> String? {
    completions.append(completion)
    return String(completions.count)
  }
  func cancelDownload(forUniqueKey key: String) { cancelled.append(key) }
}
var savedFiles = 0
func saveDownloadFile(id: String, filePath: URL, fileExtension: String, fileName: String = "audio") -> String? { savedFiles += 1; return "saved" }
final class Probe {
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
  func receiveFileUpload(id: String, fileURL: String, duration: Int) { updates += 1 }
  func receiveFileUploadImage(id: String, coverURL: String, duration: Int) { updates += 1 }
  ${swiftMethod(source, "private func downloadVideo(")}
  ${swiftMethod(source, "func cancel(ids:")}
  func run() {
    precondition(downloadVideo(video: video!))
    let oldCallbacks = SDDownloadManager.shared.completions
    precondition(oldCallbacks.count == 2)
    cancel(ids: ["a"])
    precondition(Set(SDDownloadManager.shared.cancelled) == ["1", "2"])
    video = nil
    oldCallbacks.forEach { $0(nil, URL(fileURLWithPath: "/tmp/completed")) }
    precondition(savedFiles == 0 && updates == 0 && activeDownloads.isEmpty)
    video = Video()
    precondition(downloadVideo(video: video!))
    oldCallbacks.forEach { $0(nil, URL(fileURLWithPath: "/tmp/completed")) }
    precondition(savedFiles == 0 && updates == 0)
    SDDownloadManager.shared.completions.suffix(2).forEach { $0(nil, URL(fileURLWithPath: "/tmp/completed")) }
    precondition(savedFiles == 2 && updates == 2)
  }
}
@main struct Main { static func main() { Probe().run() } }
`);
  },
);
