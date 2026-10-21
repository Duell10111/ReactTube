import assert from "node:assert/strict";
import test from "node:test";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const source = watchSource("DownloadManager.swift");

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
}
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
      if job.id == "lost" { precondition(error != nil); missing += 1; return true }
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
    session.invalidateAndCancel()
  }
}
`);
  },
);

test("W05 wires startup and background events to recovery and persists queue intent", () => {
  assert.match(
    watchSource("watchApp.swift"),
    /await downloadManager.handleBackgroundEvents/,
  );
  assert.match(watchSource("watchApp.swift"), /await downloadManager.restore/);
  assert.match(source, /struct QueueState: Codable/);
  assert.match(source, /task.taskDescription = id/);
  assert.doesNotMatch(source, /SDDownloadManager/);
});
