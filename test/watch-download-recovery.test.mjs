import assert from "node:assert/strict";
import test from "node:test";
import {URL, fileURLToPath} from "node:url";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const source = watchSource("DownloadManager.swift");
const batchesFile = fileURLToPath(
  new URL("../targets/watch/DownloadBatches.swift", import.meta.url),
);

test(
  "W05 restores staged files and missing task failures from the durable journal",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(`
import Foundation
func getDocumentsDirectory() -> URL { FileManager.default.temporaryDirectory }
final class WatchLog {
  static let shared = WatchLog()
  func error(_ category: String, _ message: String) {}
  func warning(_ category: String, _ message: String) {}
}
${swiftMethod(source, "enum WatchDownloadError")}
${swiftMethod(source, "struct WatchDownloadJob:")}
@MainActor
${swiftMethod(source, "final class WatchDownloadTransport:")}
@main struct Main {
  @MainActor static func main() async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let audio = WatchDownloadJob(id: "audio", videoID: "a", kind: "audio", generation: UUID(), duration: 1000)
    let lost = WatchDownloadJob(id: "lost", videoID: "b", kind: "audio", generation: UUID(), duration: 1000)
    let journal = directory.appendingPathComponent("jobs.json")
    try JSONEncoder().encode([audio.id: audio, lost.id: lost]).write(to: journal)
    let staged = directory.appendingPathComponent("audio.complete")
    try Data("download".utf8).write(to: staged)
    let first = WatchDownloadTransport(directory: directory, background: false)
    var missing = 0
    first.onCompletion = { job, file, error in
      if job.id == "lost" { precondition(error as? WatchDownloadError == .taskMissing); missing += 1; return true }
      precondition(file == staged && error == nil)
      return false
    }
    await first.reconcile()
    precondition(missing == 1 && first.jobs.count == 1)
    precondition(FileManager.default.fileExists(atPath: staged.path))
    let relaunched = WatchDownloadTransport(directory: directory, background: false)
    var recovered = 0
    relaunched.onCompletion = { job, file, error in
      precondition(job.videoID == "a" && error == nil)
      precondition((try? Data(contentsOf: file!)) == Data("download".utf8))
      recovered += 1
      return true
    }
    await relaunched.reconcile()
    precondition(recovered == 1 && relaunched.jobs.isEmpty)
    precondition(!FileManager.default.fileExists(atPath: staged.path))
    let finalJobs = try JSONDecoder().decode([String: WatchDownloadJob].self, from: Data(contentsOf: journal))
    precondition(finalJobs.isEmpty)
    // A delegate completion for a cancelled job must discard the staged file.
    let session = URLSession(configuration: .ephemeral)
    let task = session.downloadTask(with: URL(string: "https://example.test/audio")!)
    task.taskDescription = "cancelled"
    let temporary = directory.appendingPathComponent("temporary")
    try Data("late".utf8).write(to: temporary)
    relaunched.urlSession(session, downloadTask: task, didFinishDownloadingTo: temporary)
    try? await Task.sleep(for: .milliseconds(30))
    precondition(recovered == 1)
    precondition(!FileManager.default.fileExists(atPath: directory.appendingPathComponent("cancelled.complete").path))
    let waiter = Task { await relaunched.waitForBackgroundEvents(identifier: WatchDownloadTransport.sessionIdentifier) }
    try? await Task.sleep(for: .milliseconds(10))
    relaunched.urlSessionDidFinishEvents(forBackgroundURLSession: session)
    await waiter.value
    // Without a finish callback the timeout still ends the background handler.
    await relaunched.waitForBackgroundEvents(identifier: WatchDownloadTransport.sessionIdentifier, timeout: .milliseconds(20))
    session.invalidateAndCancel()
  }
}
`);
  },
);

test(
  "W05 restarts a lost task once and maps transfer errors to localized reasons",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(
      `
import Foundation
final class Video: Hashable {
  let id = "a"
  var downloaded = false
  var fileURL: String?
  var durationMillis = 1000
  var downloadURL: String? = "https://example.test/audio"
  var validUntil: Date? = Date().addingTimeInterval(100)
  var coverURL: String?
  static func == (lhs: Video, rhs: Video) -> Bool { lhs === rhs }
  func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
struct ActiveDownload { var id: String }
${swiftMethod(source, "enum DownloadMessages")}
${swiftMethod(watchSource("WatchStabilityCopy.swift"), "enum WatchStabilityCopy")}
${swiftMethod(source, "enum WatchDownloadError")}
${swiftMethod(source, "private struct QueueState")}
struct WatchDownloadJob {
  let id: String
  let videoID: String
  let kind: String
  let generation: UUID
  let duration: Int
}
final class Context { func save() throws {} }
final class DataController {
  static let shared = DataController()
  let container: Container? = Container()
}
final class Container { let mainContext = Context() }
func getDownloadVideoDirectory(id: String) -> URL { FileManager.default.temporaryDirectory }
final class Probe {
  var requestedIDs: Set<String> = ["a"]
  var failedDownloads: [String: String] = [:]
  var activeDownloads: [ActiveDownload] = []
  var progressDownloads: [String: Double] = [:]
  var downloadKeys: [String: String] = [:]
  var coverKeys: [String: String] = [:]
  var generations: [String: UUID] = [:]
  var restartedIDs: Set<String> = []
  let video = Video()
  var enqueued = 0
  func persistQueue() {}
  func notifyProgress() {}
  func checkDownloads() {}
  func fail(_ id: String, _ reason: String) { failedDownloads[id] = reason }
  func record(_ outcome: DownloadBatch.Outcome, for ids: Set<String>) {}
  func existingVideo(id: String) -> Video? { video }
  func enqueue(_ video: Video) {
    precondition(!activeDownloads.contains { $0.id == video.id })
    enqueued += 1
  }
  func start() -> WatchDownloadJob {
    let job = WatchDownloadJob(id: UUID().uuidString, videoID: "a", kind: "audio", generation: UUID(), duration: 1000)
    generations["a"] = job.generation
    downloadKeys["a"] = job.id
    activeDownloads = [ActiveDownload(id: "a")]
    return job
  }

  ${swiftMethod(source, "private func complete(")}
  func run() throws {
    UserDefaults.standard.set("en", forKey: "uiLanguage")
    precondition(complete(job: start(), file: nil, error: WatchDownloadError.taskMissing))
    precondition(enqueued == 1 && failedDownloads.isEmpty && activeDownloads.isEmpty && restartedIDs == ["a"])
    precondition(complete(job: start(), file: nil, error: WatchDownloadError.taskMissing))
    precondition(enqueued == 1 && failedDownloads["a"] == "The system stopped the download.")
    precondition(complete(job: start(), file: nil, error: WatchDownloadError.httpStatus(403)))
    precondition(failedDownloads["a"]!.contains("expired") && video.downloadURL == nil)
    precondition(DownloadMessages.reason(for: WatchDownloadError.httpStatus(500)) == "The server rejected the download (HTTP 500).")
    precondition(DownloadMessages.reason(for: URLError(.timedOut)) == "The connection was lost during the download.")
    precondition(DownloadMessages.reason(for: CocoaError(.fileNoSuchFile)) == "The download failed.")
    precondition(WatchStabilityCopy.text(.downloadServerError, language: "de").contains("%d"))
    // Queue files written before restartedIDs existed still decode.
    let old = try JSONDecoder().decode(QueueState.self, from: Data(#"{"requestedIDs":["a"],"failures":{}}"#.utf8))
    precondition(old.requestedIDs == ["a"] && old.restartedIDs == nil)
  }
}
@main struct Main { static func main() throws { try Probe().run() } }
`,
      [batchesFile],
    );
  },
);

test("W05 wires startup and background events to recovery and persists queue intent", () => {
  assert.match(
    watchSource("watchApp.swift"),
    /await downloadManager.handleBackgroundEvents/,
  );
  assert.match(watchSource("watchApp.swift"), /await downloadManager.restore/);
  // Background launches without UI still restore before starting queued downloads.
  assert.match(
    watchSource("watchApp.swift"),
    /backgroundTask\(\.watchConnectivity\) \{[\s\S]*?await downloadManager.restore\(\)/,
  );
  assert.match(
    swiftMethod(source, "func checkDownloads()"),
    /guard self.restored else \{[\s\S]*?await self.restore\(\)/,
  );
  assert.match(source, /struct QueueState: Codable/);
  // Missing local files only reset the download state; nothing is re-queued.
  assert.doesNotMatch(
    swiftMethod(source, "func restore()"),
    /video.fileURL = nil\s*requestedIDs.insert/,
  );
  assert.match(source, /task.taskDescription = id/);
  // Returning to the foreground reconciles transfers the OS may have dropped.
  assert.match(
    watchSource("watchApp.swift"),
    /onChange\(of: scenePhase\)[\s\S]*?await downloadManager.refresh\(\)/,
  );
  assert.doesNotMatch(source, /SDDownloadManager/);
  // The developer exit used for device checks never ships in release builds.
  assert.match(
    watchSource("DevTests.swift"),
    /#if DEBUG[\s\S]*?exit\(0\)[\s\S]*?#endif/,
  );
});
