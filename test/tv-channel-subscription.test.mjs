import assert from "node:assert/strict";
import test from "node:test";

import {getTVChannelSubscription} from "../src/extraction/tvChannelSubscription.ts";

const channelId = "UCBJycsmduvYEL83R_U4JriQ";

// The shape the signed-in TV client returns for a channel browse.
function response(buttons, extra = {}) {
  return {
    contents: {
      tvBrowseRenderer: {
        content: {
          tvSurfaceContentRenderer: {
            header: {channelHeaderRenderer: {buttons}},
            content: {sectionListRenderer: {contents: []}},
          },
        },
      },
    },
    ...extra,
  };
}

const button = overrides => ({
  subscribeButtonRenderer: {
    channelId,
    enabled: true,
    subscribed: false,
    ...overrides,
  },
});

test("reads the subscription state from the TV channel header", () => {
  assert.equal(
    getTVChannelSubscription(response([{}, button()]), channelId),
    false,
  );
  assert.equal(
    getTVChannelSubscription(response([button({subscribed: true})]), channelId),
    true,
  );
});

test("ignores disabled buttons and buttons of other channels", () => {
  assert.equal(
    getTVChannelSubscription(response([button({enabled: false})]), channelId),
    undefined,
  );
  assert.equal(
    getTVChannelSubscription(
      response([button({channelId: "UCother"})]),
      channelId,
    ),
    undefined,
  );
});

test("prefers the header over buttons elsewhere and falls back to them", () => {
  const elsewhere = {panels: [button({subscribed: true})]};
  assert.equal(
    getTVChannelSubscription(response([button()], elsewhere), channelId),
    false,
  );
  assert.equal(
    getTVChannelSubscription(response([], elsewhere), channelId),
    true,
  );
});

test("tolerates missing or malformed responses", () => {
  assert.equal(getTVChannelSubscription(undefined, channelId), undefined);
  assert.equal(
    getTVChannelSubscription({contents: null}, channelId),
    undefined,
  );
  assert.equal(
    getTVChannelSubscription(
      response([button({subscribed: "yes"})]),
      channelId,
    ),
    undefined,
  );
});
