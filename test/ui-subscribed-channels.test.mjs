import assert from "node:assert/strict";
import test from "node:test";

import {resolveTranslation} from "../src/localization/core.ts";
import {de} from "../src/localization/de.ts";
import {en} from "../src/localization/en.ts";
import {
  getSubscribedChannelLabel,
  groupSubscribedChannels,
} from "../src/ui/patterns/subscribedChannelModel.ts";

function translator(language) {
  return (key, values = {}) =>
    resolveTranslation(language, key, values, {en, de}) ?? key;
}

function channel(id, hasNewContent = false) {
  return {id, title: `Channel ${id}`, hasNewContent};
}

test("labels a channel with new videos in the UI language", () => {
  assert.equal(
    getSubscribedChannelLabel(channel("a", true), translator("en")),
    "Channel a, new videos",
  );
  assert.equal(
    getSubscribedChannelLabel(channel("a", true), translator("de")),
    "Channel a, neue Videos",
  );
});

test("labels a channel without new videos by its name only", () => {
  assert.equal(
    getSubscribedChannelLabel(channel("a"), translator("en")),
    "Channel a",
  );
});

test("groups channels with new videos first and keeps the order in both groups", () => {
  const {withNewContent, others} = groupSubscribedChannels([
    channel("a"),
    channel("b", true),
    channel("c"),
    channel("d", true),
  ]);

  assert.deepEqual(
    withNewContent.map(item => item.id),
    ["b", "d"],
  );
  assert.deepEqual(
    others.map(item => item.id),
    ["a", "c"],
  );
});
