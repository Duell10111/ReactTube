import assert from "node:assert/strict";
import test from "node:test";
import {URL, fileURLToPath} from "node:url";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const source = watchSource("DownloadManager.swift");
const watchFile = name =>
  fileURLToPath(new URL(`../targets/watch/${name}`, import.meta.url));
const batchesFile = watchFile("DownloadBatches.swift");
const notificationFiles = [
  batchesFile,
  watchFile("WatchStabilityCopy.swift"),
  watchFile("DownloadNotificationContent.swift"),
];

test(
  "download batches track shared titles, retries and their persisted state",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(
      `
import Foundation
@main struct Main {
  static func main() throws {
    var batches = DownloadBatches()
    precondition(batches.add(kind: .phone, name: nil, videoIDs: []) == nil)
    let playlist = batches.add(kind: .playlist, name: "Run", videoIDs: ["a", "b", "c", "a"])!
    precondition(playlist.videoIDs == ["a", "b", "c"])
    batches.add(kind: .video, name: "B", videoIDs: ["b"])
    precondition(batches.pendingIDs == ["a", "b", "c"])

    // A title shared by two requests completes both.
    batches.record(.completed, for: ["b"])
    let single = batches.finished
    precondition(single.count == 1 && single[0].kind == .video && single[0].completedCount == 1)
    // A finished batch stays stored until its report was delivered.
    batches.remove(id: single[0].id)
    precondition(batches.open.count == 1 && batches.pendingIDs == ["a", "c"])

    // Dismissing a failure keeps it; a retry makes the title pending again.
    batches.record(.failed, for: ["a"])
    batches.record(.cancelled, for: ["a"])
    precondition(batches.open[0].failedIDs == ["a"])
    precondition(batches.reopen("a") && batches.pendingIDs == ["a", "c"])
    precondition(!batches.reopen("unknown"))
    // Unfinished batches cannot be removed by a stale report.
    batches.remove(id: playlist.id)
    precondition(batches.open.count == 1)

    let encoded = try JSONEncoder().encode(batches)
    let decoded = try JSONDecoder().decode(DownloadBatches.self, from: encoded)
    precondition(decoded == batches)

    batches.record(.failed, for: ["a", "c"])
    let finished = batches.finished
    precondition(finished.map(\\.id) == [playlist.id] && finished[0].failedIDs == ["a", "c"])
    precondition(finished[0].completedCount == 1 && !finished[0].isCancelled)
    // A finished batch that is being reported is not reopened by a retry.
    precondition(!batches.reopen("a"))
    batches.remove(id: playlist.id)
    precondition(batches.open.isEmpty)

    batches.add(kind: .playlist, name: nil, videoIDs: ["d", "e"])
    batches.record(.cancelled, for: ["d", "e"])
    precondition(batches.finished[0].isCancelled)
  }
}
`,
      [batchesFile],
    );
  },
);

test(
  "the download manager records batch outcomes and reports finished batches once",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(
      `
import Foundation
final class Video: Hashable {
  let id: String
  var downloaded = false
  var fileURL: String?
  var durationMillis = 1000
  var title: String?
  var downloadURL: String? = "https://example.test/audio"
  var validUntil: Date? = Date().addingTimeInterval(100)
  var coverURL: String?
  init(id: String) { self.id = id; title = id.uppercased() }
  static func == (lhs: Video, rhs: Video) -> Bool { lhs === rhs }
  func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
struct ActiveDownload { var id: String }
final class WatchLog {
  static let shared = WatchLog()
  func error(_ category: String, _ message: String) {}
}
/// Records posted summaries; a report completes once the test releases it.
@MainActor
final class Notifications {
  var posted: [(id: String, body: String)] = []
  var permissionRequests = 0
  var hold = false
  private var held: [CheckedContinuation<Void, Never>] = []
  func requestAuthorizationIfNeeded() { permissionRequests += 1 }
  func post(_ content: DownloadNotificationContent, id: String) async {
    posted.append((id, content.body))
    if hold { await withCheckedContinuation { held.append($0) } }
  }
  func release() { held.forEach { $0.resume() }; held.removeAll(); hold = false }
}
${swiftMethod(source, "enum DownloadMessages")}
${swiftMethod(source, "enum WatchDownloadError")}
${swiftMethod(source, "private struct QueueState")}
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
  func start(videoID: String, kind: String, generation: UUID, duration: Int, url: URL) -> String? {
    let key = String(jobs.count + 1)
    jobs.append(WatchDownloadJob(id: key, videoID: videoID, kind: kind, generation: generation, duration: duration))
    return key
  }
  func cancel(key: String) {}
}
final class Context { func save() throws {} }
final class DataController {
  static let shared = DataController()
  let container: Container? = Container()
}
final class Container { let mainContext = Context() }
let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
func getDownloadVideoDirectory(id: String) -> URL { directory.appendingPathComponent(id) }
@MainActor
final class Probe {
  let transport = Transport()
  let notifications = Notifications()
  var reports: [String: Task<Void, Never>] = [:]
  var persisted = 0
  var batches = DownloadBatches()
  var requestedIDs: Set<String> = []
  var pendingDownloads: Set<Video> = []
  var awaitingMetadata: Set<String> = []
  var failedDownloads: [String: String] = [:]
  var activeDownloads: [ActiveDownload] = []
  var progressDownloads: [String: Double] = [:]
  var downloadKeys: [String: String] = [:]
  var coverKeys: [String: String] = [:]
  var generations: [String: UUID] = [:]
  var restartedIDs: Set<String> = []
  var videos: [String: Video] = [:]
  var enqueued: [String] = []
  func persistQueue() { persisted += 1 }
  func notifyProgress() {}
  func checkDownloads() {}
  func existingVideo(id: String) -> Video? { videos[id] }
  func enqueue(_ video: Video) { enqueued.append(video.id); requestedIDs.insert(video.id) }

  ${swiftMethod(source, "func download(_ videos:")}
  ${swiftMethod(source, "func cancel(ids:")}
  ${swiftMethod(source, "private func discard(")}
  ${swiftMethod(source, "private func fail(")}
  ${swiftMethod(source, "private func record(")}
  ${swiftMethod(source, "private func finishBatches(")}
  ${swiftMethod(source, "func waitForReports(")}
  ${swiftMethod(source, "private func downloadVideo(")}
  ${swiftMethod(source, "private func complete(")}

  func job(_ id: String) -> WatchDownloadJob { transport.jobs.last { $0.videoID == id }! }

  func run() async throws {
    defer { try? FileManager.default.removeItem(at: directory) }
    UserDefaults.standard.set("en", forKey: "uiLanguage")
    let done = Video(id: "done")
    done.downloaded = true
    ["a", "b", "c"].forEach { videos[$0] = Video(id: $0) }
    videos["done"] = done

    // Downloaded titles are not part of the batch and are not queued again.
    download([videos["a"]!, videos["b"]!, done], as: .playlist, name: "Run")
    precondition(enqueued == ["a", "b"] && batches.open.first?.videoIDs == ["a", "b"])
    precondition(notifications.permissionRequests == 1)
    precondition(downloadVideo(video: videos["a"]!) && downloadVideo(video: videos["b"]!))

    let input = directory.appendingPathComponent("input")
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    try Data("audio".utf8).write(to: input)
    precondition(complete(job: job("a"), file: input, error: nil))
    precondition(reports.isEmpty && batches.pendingIDs == ["b"])

    // The finished batch stays stored until the notification is scheduled.
    notifications.hold = true
    precondition(complete(job: job("b"), file: nil, error: WatchDownloadError.httpStatus(500)))
    for _ in 0..<100 where notifications.posted.isEmpty { await Task.yield() }
    precondition(notifications.posted.map(\\.body) == ["1 of 2 titles downloaded, 1 failed"])
    precondition(batches.open.count == 1 && reports.count == 1)
    // Finishing again while the report is pending does not post twice.
    cancel(ids: ["b"])
    precondition(notifications.posted.count == 1)
    let before = persisted
    notifications.release()
    await waitForReports()
    precondition(batches.open.isEmpty && reports.isEmpty && persisted > before)

    // A request the user cancels completely is not reported.
    download([videos["c"]!], as: .video, name: "C")
    cancel(ids: ["c"])
    await waitForReports()
    precondition(notifications.posted.count == 1 && batches.open.isEmpty)

    // A failure before the transfer starts finishes the batch as well.
    videos["c"]!.downloadURL = nil
    download([videos["c"]!], as: .phone, name: "C")
    precondition(!downloadVideo(video: videos["c"]!))
    await waitForReports()
    precondition(notifications.posted.last?.body == "Could not be downloaded")
    precondition(notifications.posted.last?.id != notifications.posted.first?.id)

    // Queue files written before batches existed still decode.
    let old = try JSONDecoder().decode(QueueState.self, from: Data(#"{"requestedIDs":[],"failures":{}}"#.utf8))
    precondition(old.batches == nil)
  }
}
@main struct Main { @MainActor static func main() async throws { try await Probe().run() } }
`,
      notificationFiles,
    );
  },
);

test(
  "download notifications summarize batches in English and German",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(
      `
import Foundation
func batch(_ kind: DownloadBatch.Kind, _ name: String?, _ outcomes: [DownloadBatch.Outcome]) -> DownloadBatch {
  let ids = outcomes.indices.map { "v\\($0)" }
  var batch = DownloadBatch(id: "b", kind: kind, name: name, videoIDs: ids)
  for (id, outcome) in zip(ids, outcomes) { batch.outcomes[id] = outcome }
  return batch
}
func text(_ batch: DownloadBatch, _ language: String) -> String {
  let content = DownloadNotificationContent(batch: batch, language: language)!
  return content.title + " | " + content.body
}
@main struct Main {
  static func main() {
    let all = batch(.playlist, "Laufen", Array(repeating: .completed, count: 15))
    precondition(text(all, "en") == "Laufen | 15 titles downloaded")
    precondition(text(all, "de") == "Laufen | 15 Titel heruntergeladen")
    let partial = batch(.playlist, "Laufen", Array(repeating: .completed, count: 12) + Array(repeating: .failed, count: 3) + [.cancelled])
    precondition(text(partial, "en") == "Laufen | 12 of 15 titles downloaded, 3 failed")
    precondition(text(partial, "de") == "Laufen | 12 von 15 Titeln geladen, 3 fehlgeschlagen")
    let one = batch(.playlist, nil, [.completed])
    precondition(text(one, "en") == "Playlist download | 1 title downloaded")
    precondition(text(one, "de") == "Playlist-Download | 1 Titel heruntergeladen")
    let failedOne = batch(.phone, nil, [.failed, .failed])
    precondition(text(failedOne, "en") == "Downloads from iPhone | 2 titles could not be downloaded")
    precondition(text(failedOne, "de") == "Downloads vom iPhone | 2 Titel konnten nicht geladen werden")
    precondition(text(batch(.phone, nil, [.failed]), "de") == "Downloads vom iPhone | Konnte nicht geladen werden")
    precondition(text(batch(.video, "Song", [.failed]), "de") == "Song | Konnte nicht geladen werden")
    precondition(text(batch(.video, "Song", [.completed]), "en") == "Song | Downloaded")
    precondition(text(batch(.video, nil, [.completed]), "en") == "Download finished | Downloaded")
    // Numbers follow the UI language.
    let many = batch(.phone, nil, Array(repeating: .completed, count: 1000))
    precondition(text(many, "en") == "Downloads from iPhone | 1,000 titles downloaded")
    precondition(text(many, "de") == "Downloads vom iPhone | 1.000 Titel heruntergeladen")
    precondition(DownloadNotificationContent(batch: batch(.playlist, "X", [.cancelled, .cancelled])) == nil)
  }
}
`,
      notificationFiles,
    );
  },
);

test("download notifications are wired to launch, background work and settings", () => {
  const app = watchSource("watchApp.swift");
  assert.match(app, /init\(\) \{\s*DownloadNotifications.shared.activate\(\)/);
  assert.match(
    app,
    /navigationDestination\(isPresented: \$downloadsNavigation.isPresented\)/,
  );
  assert.match(
    app,
    /backgroundTask\(\.watchConnectivity\) \{[\s\S]*?await downloadManager.waitForReports\(\)/,
  );
  assert.match(
    swiftMethod(source, "func handleBackgroundEvents("),
    /waitForBackgroundEvents[\s\S]*?await waitForReports\(\)/,
  );
  const notifications = watchSource("DownloadNotifications.swift");
  // Permission is requested in context, never at launch.
  assert.doesNotMatch(
    swiftMethod(notifications, "func activate("),
    /requestAuthorization/,
  );
  assert.match(
    swiftMethod(notifications, "func requestAuthorizationIfNeeded("),
    /applicationState == \.active/,
  );
  assert.match(swiftMethod(notifications, "willPresent notification"), /\[\]/);
  assert.match(
    watchSource("SettingsScreen.swift"),
    /@AppStorage\(DownloadNotifications.settingKey\)/,
  );
});
