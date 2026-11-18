import assert from "node:assert/strict";
import test from "node:test";

import {parseSubscribedChannels} from "../src/extraction/subscribedChannels.ts";

/** Shape of `YTTV.SubscriptionsFeed#channels` as measured on 2026-11-17. */
function channel(
  id,
  title,
  {newContent = false, thumbnails, params = `params-${id}`} = {},
) {
  return {
    id,
    title,
    thumbnails: thumbnails ?? [
      {url: `https://yt3.example.com/${title}=s176`, width: 176, height: 176},
      {url: `https://yt3.example.com/${title}=s48`, width: 48, height: 48},
    ],
    endpoint: {payload: {browseId: "FEsubscriptions", params}},
    has_new_content: newContent,
  };
}

test("keeps YouTube's order and the new-content flag", () => {
  const result = parseSubscribedChannels([
    channel("UCrecent", "Recent", {newContent: true}),
    channel("UCalpha", "Alpha"),
  ]);

  assert.deepEqual(result, [
    {
      id: "UCrecent",
      title: "Recent",
      thumbnail: {
        url: "https://yt3.example.com/Recent=s176",
        width: 176,
        height: 176,
      },
      hasNewContent: true,
      feedParams: "params-UCrecent",
    },
    {
      id: "UCalpha",
      title: "Alpha",
      thumbnail: {
        url: "https://yt3.example.com/Alpha=s176",
        width: 176,
        height: 176,
      },
      hasNewContent: false,
      feedParams: "params-UCalpha",
    },
  ]);
});

test("picks the largest avatar regardless of order", () => {
  const [result] = parseSubscribedChannels([
    channel("UCa", "A", {
      thumbnails: [
        {url: "https://yt3.example.com/s48", width: 48, height: 48},
        {url: "https://yt3.example.com/s88", width: 88, height: 88},
      ],
    }),
  ]);

  assert.equal(result.thumbnail?.url, "https://yt3.example.com/s88");
});

test("has no thumbnail when the channel has no avatar", () => {
  const [result] = parseSubscribedChannels([
    channel("UCa", "A", {thumbnails: []}),
  ]);

  assert.equal(result.thumbnail, undefined);
});

test("drops channels without an id and duplicates", () => {
  const result = parseSubscribedChannels([
    channel(undefined, "Unreadable"),
    channel("UCa", "A", {newContent: true}),
    channel("UCb", "B"),
    channel("UCa", "A again"),
  ]);

  assert.deepEqual(
    result.map(item => [item.id, item.title]),
    [
      ["UCa", "A"],
      ["UCb", "B"],
    ],
  );
});

test("drops channels whose feed cannot be filtered", () => {
  const result = parseSubscribedChannels([
    channel("UCa", "A", {params: null}),
    channel("UCb", "B"),
  ]);

  assert.deepEqual(
    result.map(item => item.id),
    ["UCb"],
  );
});

test("returns an empty list for a feed without channels", () => {
  assert.deepEqual(parseSubscribedChannels([]), []);
});
