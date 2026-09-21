import assert from "node:assert/strict";
import test from "node:test";

import {resolveTranslation} from "../src/localization/core.ts";
import {de} from "../src/localization/de.ts";
import {en} from "../src/localization/en.ts";
import {createCommentViewModel} from "../src/ui/patterns/commentModel.ts";
import {
  getPlayerHeight,
  getVideoDetailLayout,
} from "../src/ui/patterns/videoDetailLayout.ts";
import {createVideoDetailViewModel} from "../src/ui/patterns/videoDetailModel.ts";

const resources = {en, de};
const t = (key, values = {}) =>
  resolveTranslation("en", key, values, resources);
const tDe = (key, values = {}) =>
  resolveTranslation("de", key, values, resources);

function videoInfo(overrides = {}) {
  return {
    id: "video-1",
    title: "A video title",
    short_views: "1.2M views",
    publishDate: "2 days ago",
    channel: {id: "channel-1", name: "A channel", url: "https://example.test"},
    channel_id: "channel-1",
    ...overrides,
  };
}

function actionIds(model) {
  return model.actions.map(action => action.id);
}

test("stacks the player above the feed while the screen is portrait", () => {
  for (const layout of ["compact", "medium", "expanded"]) {
    const result = getVideoDetailLayout({layout, landscape: false});

    assert.equal(result.mode, "stacked");
    assert.equal(result.playerColumnRatio, 1);
    assert.equal(result.panelPresentation, "sheet");
    assert.equal(result.metadataBesidePlayer, false);
  }
});

test("splits player and up next in landscape on phone and tablet", () => {
  const phone = getVideoDetailLayout({layout: "compact", landscape: true});
  const tablet = getVideoDetailLayout({layout: "expanded", landscape: true});

  assert.equal(phone.mode, "split");
  assert.equal(tablet.mode, "split");
  assert.ok(phone.playerColumnRatio < 1);
  assert.equal(phone.metadataBesidePlayer, true);
  // A phone in landscape has the height problem a tablet does not have.
  assert.equal(phone.reducedChrome, true);
  assert.equal(tablet.reducedChrome, false);
});

test("opens panels beside the video on TV instead of as a sheet", () => {
  const tv = getVideoDetailLayout({layout: "tv", landscape: true});

  assert.equal(tv.mode, "tv");
  assert.equal(tv.panelPresentation, "side");
});

test("derives the player height from its own column, never from the screen", () => {
  const stacked = getVideoDetailLayout({layout: "compact", landscape: false});
  const split = getVideoDetailLayout({layout: "compact", landscape: true});

  assert.equal(getPlayerHeight(1600, stacked), 900);
  assert.equal(
    getPlayerHeight(1600, split),
    Math.round((1600 * split.playerColumnRatio) / (16 / 9)),
  );
});

test("builds the metadata line from views and publish date", () => {
  const model = createVideoDetailViewModel(videoInfo(), {translate: t});

  assert.deepEqual(model.metadata, ["1.2M views", "2 days ago"]);
  assert.equal(model.metadataLine, "1.2M views · 2 days ago");
  assert.equal(model.channel.name, "A channel");
  assert.match(model.accessibilityLabel, /A video title · A channel/);
});

test("leaves out metadata parts a video does not report", () => {
  const model = createVideoDetailViewModel(
    videoInfo({short_views: undefined, publishDate: ""}),
    {translate: t},
  );

  assert.deepEqual(model.metadata, []);
  assert.equal(model.metadataLine, "");
});

test("offers only the actions a surface can carry out", () => {
  const minimal = createVideoDetailViewModel(videoInfo(), {translate: t});

  assert.deepEqual(actionIds(minimal), [
    "like",
    "dislike",
    "save",
    "description",
  ]);

  const full = createVideoDetailViewModel(
    videoInfo({
      playlist: {
        id: "playlist-1",
        title: "A playlist",
        content: [{id: "a"}, {id: "b"}, {id: "c"}],
        current_index: 1,
        is_infinite: false,
      },
    }),
    {translate: t, canDownload: true, canOpenComments: true},
  );

  assert.deepEqual(actionIds(full), [
    "like",
    "dislike",
    "save",
    "download",
    "description",
    "comments",
    "queue",
  ]);
});

test("takes the rating from the action endpoint, not only from the video", () => {
  const model = createVideoDetailViewModel(videoInfo({liked: false}), {
    translate: t,
    liked: true,
  });

  const like = model.actions.find(action => action.id === "like");
  const dislike = model.actions.find(action => action.id === "dislike");

  assert.equal(like.active, true);
  assert.equal(dislike.active, false);
  assert.equal(like.label, "Like");
});

test("translates the actions", () => {
  const model = createVideoDetailViewModel(videoInfo(), {translate: tDe});

  assert.deepEqual(
    model.actions.map(action => action.label),
    ["Gefällt mir", "Gefällt mir nicht", "Speichern", "Beschreibung"],
  );
});

test("keeps the queue position inside the playlist it describes", () => {
  const model = createVideoDetailViewModel(
    videoInfo({
      playlist: {
        id: "playlist-1",
        title: "A playlist",
        content: [{id: "a"}, {id: "b"}],
        current_index: 7,
        is_infinite: false,
      },
    }),
    {translate: t},
  );

  assert.equal(model.queue.currentIndex, 1);
  assert.equal(model.queue.positionLabel, "2 of 2");
  assert.equal(model.queue.total, 2);
});

test("treats a blank description as no description", () => {
  const blank = createVideoDetailViewModel(videoInfo({description: "   "}), {
    translate: t,
  });
  const present = createVideoDetailViewModel(
    videoInfo({description: "Some text"}),
    {translate: t},
  );

  assert.equal(blank.hasDescription, false);
  assert.equal(blank.description, undefined);
  assert.equal(present.hasDescription, true);
});

test("builds the comment metadata line from the counts YouTube formats", () => {
  const comment = {
    id: "comment-1",
    text: "A comment",
    author: {
      id: "channel-2",
      name: "A commenter",
      thumbnail: {url: "https://example.test/avatar.jpg", width: 1, height: 1},
    },
    publishedTime: "3 hours ago",
    likeCount: "1.2K",
    replyCount: "12",
    pinned: true,
    channelOwner: false,
  };

  const model = createCommentViewModel(comment, {translate: t});

  assert.equal(model.metadataLine, "3 hours ago · 1.2K likes · 12 replies");
  assert.equal(model.avatarUrl, "https://example.test/avatar.jpg");
  assert.match(model.accessibilityLabel, /^Pinned · A commenter · A comment/);

  const german = createCommentViewModel(comment, {translate: tDe});

  assert.equal(german.metadataLine, "3 hours ago · 1.2K Likes · 12 Antworten");
});

test("drops the counts a comment does not carry", () => {
  const model = createCommentViewModel(
    {
      id: "comment-2",
      text: "A comment",
      pinned: false,
      channelOwner: false,
    },
    {translate: t},
  );

  assert.equal(model.metadataLine, "");
  assert.equal(model.authorName, undefined);
});
