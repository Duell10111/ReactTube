import assert from "node:assert/strict";
import test from "node:test";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";
import {completeWatchVideoRequest} from "../src/hooks/watchSync/watchVideoMetadata.ts";

test("W03 returns a correlated response on success, unavailable metadata, and exceptions", async () => {
  const request = {videoId: "video", requestId: "attempt-1"};
  const errors = [];
  const log = error => errors.push(error);
  assert.deepEqual(
    await completeWatchVideoRequest(
      request,
      async () => ({title: "Title"}),
      log,
    ),
    {
      type: "videoResponse",
      id: "video",
      requestId: "attempt-1",
      title: "Title",
    },
  );
  assert.equal(
    (await completeWatchVideoRequest(request, async () => undefined, log))
      .error,
    "metadata_unavailable",
  );
  const response = await completeWatchVideoRequest(
    request,
    async () => {
      throw new Error("network");
    },
    log,
  );
  assert.equal(response.error, "metadata_failed");
  assert.equal(response.requestId, "attempt-1");
  assert.equal(errors.length, 1);
});

test(
  "W03 coalesces requests, bounds retries, rejects old responses, and cancels timers",
  {skip: process.platform !== "darwin"},
  () => {
    const coordinator = swiftMethod(
      watchSource("YoutubeAPI.swift"),
      "final class VideoMetadataRequests",
    ).replace(
      /  static let shared =[\s\S]*?  private struct Pending/,
      "  private struct Pending",
    );
    runSwift(`
import Foundation
@MainActor
${coordinator}
@main struct Main {
  @MainActor static func main() async {
    var sent: [(String, String)] = []
    var failed: [String] = []
    let requests = VideoMetadataRequests(timeout: .milliseconds(10), sendRequest: { sent.append(($0, $1)) }, onFailure: { failed.append($0) })
    requests.request(id: "a")
    requests.request(id: "a")
    precondition(sent.count == 1)
    let old = sent[0].1
    requests.retryAfterReconnect()
    precondition(sent.count == 2)
    precondition(!requests.acceptsResponse(id: "a", requestID: old))
    precondition(requests.acceptsResponse(id: "a", requestID: sent[1].1))
    try? await Task.sleep(for: .milliseconds(60))
    precondition(sent.count == 2 && failed.isEmpty)
    requests.request(id: "b")
    try? await Task.sleep(for: .milliseconds(80))
    precondition(sent.filter { $0.0 == "b" }.count == 3 && failed == ["b"])
    requests.request(id: "c")
    let cancelled = sent.last!.1
    requests.cancel(ids: ["c"])
    precondition(!requests.acceptsResponse(id: "c", requestID: cancelled))
    try? await Task.sleep(for: .milliseconds(50))
    precondition(failed == ["b"])
  }
}
`);
  },
);

test("W03 invalidates omitted URLs and resolves partial metadata responses", () => {
  const update = swiftMethod(
    watchSource("DBUtils.swift"),
    "func addDownloadData(",
  );
  assert.match(
    update,
    /if refreshStreamData\s*\{[\s\S]*?video.downloadURL = downloadURL/,
  );
  const save = swiftMethod(
    watchSource("YoutubeAPI.swift"),
    "func saveVideoResponse(",
  );
  assert.match(save, /refreshStreamData: isResponse/);
  assert.match(save, /DownloadManager.shared.videoMetadataUpdated/);
  assert.match(
    watchSource("DownloadManager.swift"),
    /!awaitingMetadata.contains\(video.id\)/,
  );
});
