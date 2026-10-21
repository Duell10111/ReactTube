import test from "node:test";
import {fileURLToPath, URL} from "node:url";

import {runSwift, swiftMethod, watchSource} from "./helpers/watchNative.mjs";

const source = watchSource("DBUtils.swift");

test(
  "W08 preserves identities across multiple videos, playlists, and colliding raw IDs",
  {skip: process.platform !== "darwin"},
  () => {
    runSwift(
      `
import Foundation
import SwiftData
${swiftMethod(source, "func addHomeScreenElement(")}
${swiftMethod(source, "func repairHomeScreenCache(")}
@main struct Main {
  @MainActor static func main() throws {
    let container = try ModelContainer(for: Video.self, Playlist.self, HomeScreenSection.self, HomeScreenElement.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
    let context = container.mainContext
    for id in ["a", "b"] {
      context.insert(Video(id: id, durationMillis: 1000))
      context.insert(Playlist(id: id, title: id))
    }
    try context.save()
    let videoA = addHomeScreenElement(context, videoID: "a", playlistID: nil)!
    let videoB = addHomeScreenElement(context, videoID: "b", playlistID: nil)!
    let playlistA = addHomeScreenElement(context, videoID: nil, playlistID: "a")!
    let playlistB = addHomeScreenElement(context, videoID: nil, playlistID: "b")!
    try context.save()
    precondition((try? context.fetchCount(FetchDescriptor<HomeScreenElement>())) == 4)
    precondition(videoA !== videoB && videoA !== playlistA && playlistA !== playlistB)
    precondition(videoA.video?.id == "a" && videoB.video?.id == "b")
    precondition(playlistA.playlist?.id == "a" && playlistB.playlist?.id == "b")
    precondition(videoA.videoID == "a" && playlistA.playlistID == "a")
    precondition(addHomeScreenElement(context, videoID: "a", playlistID: nil) === videoA)
    precondition(addHomeScreenElement(context, videoID: nil, playlistID: "a") === playlistA)
    precondition(addHomeScreenElement(context, videoID: nil, playlistID: nil) == nil)
    precondition(addHomeScreenElement(context, videoID: "a", playlistID: "b") == nil)
    try repairHomeScreenCache(context)
    precondition((try? context.fetchCount(FetchDescriptor<HomeScreenElement>())) == 4)
    let legacy = HomeScreenElement(id: "legacy", type: .video)
    legacy.video = videoA.video
    context.insert(legacy)
    context.insert(HomeScreenSection(uuid: "section", title: "Old cache"))
    try context.save()
    try repairHomeScreenCache(context)
    precondition((try? context.fetchCount(FetchDescriptor<HomeScreenElement>())) == 0)
    precondition((try? context.fetchCount(FetchDescriptor<HomeScreenSection>())) == 0)
    precondition((try? context.fetchCount(FetchDescriptor<Video>())) == 2)
    precondition((try? context.fetchCount(FetchDescriptor<Playlist>())) == 2)
  }
}
`,
      [
        fileURLToPath(
          new URL("../targets/watch/DBData.swift", import.meta.url),
        ),
      ],
    );
  },
);
