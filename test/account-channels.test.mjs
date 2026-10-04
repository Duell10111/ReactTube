import assert from "node:assert/strict";
import test from "node:test";

import {
  hasChannelChoice,
  parseAccountChannels,
} from "../src/utils/accountChannels.ts";

/** Shape of `/account/accounts_list` (TV client) as measured on 2026-10-04. */
function accountsList(items) {
  return {
    contents: [
      {
        accountSectionListRenderer: {
          contents: [
            {
              accountItemSectionRenderer: {
                contents: items.map(accountItem => ({accountItem})),
              },
            },
          ],
        },
      },
    ],
  };
}

const BRAND = {
  accountName: {simpleText: "Brand Channel"},
  accountPhoto: {
    thumbnails: [
      {url: "https://example.com/small.jpg", width: 88},
      {url: "https://example.com/large.jpg", width: 216},
    ],
  },
  isSelected: false,
  isDisabled: false,
  hasChannel: true,
  serviceEndpoint: {
    selectActiveIdentityEndpoint: {
      supportedTokens: [
        {pageIdToken: {pageId: "page-1"}},
        {accountStateToken: {hasChannel: true, obfuscatedGaiaId: "gaia-1"}},
      ],
    },
  },
  channelHandle: {simpleText: "@brand"},
};

const PRIMARY = {
  accountName: {simpleText: "Primary Person"},
  isSelected: true,
  isDisabled: false,
  hasChannel: true,
  serviceEndpoint: {
    selectActiveIdentityEndpoint: {
      supportedTokens: [
        {accountStateToken: {hasChannel: true, obfuscatedGaiaId: "gaia-2"}},
      ],
    },
  },
  accountByline: {simpleText: "person@example.com"},
  channelHandle: {simpleText: "@person"},
};

test("reads brand channels and the primary account", () => {
  assert.deepEqual(parseAccountChannels(accountsList([BRAND, PRIMARY])), [
    {
      name: "Brand Channel",
      handle: "@brand",
      photoUrl: "https://example.com/large.jpg",
      pageId: "page-1",
      selected: false,
    },
    {
      name: "Primary Person",
      handle: "@person",
      photoUrl: undefined,
      pageId: undefined,
      selected: true,
    },
  ]);
});

test("never carries the account's e-mail address", () => {
  const parsed = JSON.stringify(
    parseAccountChannels(accountsList([BRAND, PRIMARY])),
  );
  assert.ok(!parsed.includes("person@example.com"));
});

test("skips disabled entries", () => {
  assert.deepEqual(
    parseAccountChannels(accountsList([{...BRAND, isDisabled: true}])),
    [],
  );
});

test("offers a choice only for a primary account with brand channels", () => {
  const both = parseAccountChannels(accountsList([BRAND, PRIMARY]));
  assert.equal(hasChannelChoice(both), true);

  // A token bound to the brand account directly lists only that account —
  // the sign-in measured on 2026-10-04 that failed the age gate.
  const brandOnly = parseAccountChannels(
    accountsList([{...BRAND, isSelected: true}]),
  ).map(({pageId, ...rest}) => rest);
  assert.equal(hasChannelChoice(brandOnly), false);
  assert.equal(
    hasChannelChoice(parseAccountChannels(accountsList([PRIMARY]))),
    false,
  );
});
