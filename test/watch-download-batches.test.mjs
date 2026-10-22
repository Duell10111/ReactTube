import test from "node:test";
import {URL, fileURLToPath} from "node:url";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const source = watchSource("DownloadManager.swift");
const batchesFile = fileURLToPath(
  new URL("../targets/watch/DownloadBatches.swift", import.meta.url),
);

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
    let playlist = batches.add(kind: .playlist, name: "Run", videoIDs: ["a", "b", "a"])!
    precondition(playlist.videoIDs == ["a", "b"])
    batches.add(kind: .video, name: "B", videoIDs: ["b"])
    precondition(batches.pendingIDs == ["a", "b"])

    // A title shared by two requests completes both.
    batches.record(.completed, for: ["b"])
    let single = batches.takeFinished()
    precondition(single.count == 1 && single[0].kind == .video && single[0].completedCount == 1)
    precondition(batches.open.count == 1 && batches.pendingIDs == ["a"])

    // Dismissing a failure keeps it; a retry makes the title pending again.
    batches.record(.failed, for: ["a"])
    batches.record(.cancelled, for: ["a"])
    precondition(batches.open[0].failedIDs == ["a"])
    precondition(batches.reopen("a") && batches.pendingIDs == ["a"])
    precondition(!batches.reopen("unknown"))

    let encoded = try JSONEncoder().encode(batches)
    let decoded = try JSONDecoder().decode(DownloadBatches.self, from: encoded)
    precondition(decoded == batches)

    batches.record(.failed, for: ["a"])
    let finished = batches.takeFinished()
    precondition(finished.map(\\.id) == [playlist.id] && finished[0].failedIDs == ["a"])
    precondition(finished[0].completedCount == 1 && !finished[0].isCancelled)
    precondition(batches.open.isEmpty)

    batches.add(kind: .playlist, name: nil, videoIDs: ["c", "d"])
    batches.record(.cancelled, for: ["c", "d"])
    precondition(batches.takeFinished()[0].isCancelled)
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
  var infos: [String] = []
  func info(_ category: String, _ message: String) { infos.append(message) }
  func error(_ category: String, _ message: String) {}
}
${swiftMethod(source, "enum DownloadMessages")}
${swiftMethod(source, "enum WatchStabilityCopy")}
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
final class Probe {
  let transport = Transport()
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
  func persistQueue() {}
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
  ${swiftMethod(source, "private func downloadVideo(")}
  ${swiftMethod(source, "private func complete(")}

  func job(_ id: String) -> WatchDownloadJob { transport.jobs.last { $0.videoID == id }! }

  func run() throws {
    defer { try? FileManager.default.removeItem(at: directory) }
    UserDefaults.standard.set("en", forKey: "uiLanguage")
    let done = Video(id: "done")
    done.downloaded = true
    ["a", "b", "c"].forEach { videos[$0] = Video(id: $0) }
    videos["done"] = done

    // Downloaded titles are not part of the batch and are not queued again.
    download([videos["a"]!, videos["b"]!, done], as: .playlist, name: "Run")
    precondition(enqueued == ["a", "b"] && batches.open.first?.videoIDs == ["a", "b"])
    precondition(downloadVideo(video: videos["a"]!) && downloadVideo(video: videos["b"]!))

    let input = directory.appendingPathComponent("input")
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    try Data("audio".utf8).write(to: input)
    precondition(complete(job: job("a"), file: input, error: nil))
    precondition(WatchLog.shared.infos.isEmpty && batches.pendingIDs == ["b"])
    precondition(complete(job: job("b"), file: nil, error: WatchDownloadError.httpStatus(500)))
    precondition(WatchLog.shared.infos == ["Finished playlist batch: 1 of 2 downloaded, 1 failed"])
    precondition(batches.open.isEmpty)

    // Dismissing the failed title afterwards does not report anything again.
    cancel(ids: ["b"])
    precondition(WatchLog.shared.infos.count == 1)

    // A request the user cancels completely is not reported.
    download([videos["c"]!], as: .video, name: "C")
    cancel(ids: ["c"])
    precondition(WatchLog.shared.infos.count == 1 && batches.open.isEmpty)

    // A failure before the transfer starts finishes the batch as well.
    videos["c"]!.downloadURL = nil
    download([videos["c"]!], as: .phone, name: nil)
    precondition(!downloadVideo(video: videos["c"]!))
    precondition(WatchLog.shared.infos.last == "Finished phone batch: 0 of 1 downloaded, 1 failed")

    // Queue files written before batches existed still decode.
    let old = try JSONDecoder().decode(QueueState.self, from: Data(#"{"requestedIDs":[],"failures":{}}"#.utf8))
    precondition(old.batches == nil)
  }
}
@main struct Main { static func main() throws { try Probe().run() } }
`,
      [batchesFile],
    );
  },
);
