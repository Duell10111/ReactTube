import assert from "node:assert/strict";
import test from "node:test";

import {
  getCoreUILanguageFromSettings,
  normalizeCoreUILanguage,
  resolveTranslation,
} from "../src/localization/core.ts";
import {de} from "../src/localization/de.ts";
import {en} from "../src/localization/en.ts";
import {getThemeTypographyTarget} from "../src/ui/theme/themeSelection.ts";
import {phoneTypography, tvTypography} from "../src/ui/theme/typography.ts";

test("selects phone and TV typography within the same semantic theme", () => {
  assert.equal(getThemeTypographyTarget(false), "phone");
  assert.equal(getThemeTypographyTarget(true), "tv");
  assert.ok(
    tvTypography.titleLarge.fontSize > phoneTypography.titleLarge.fontSize,
  );
});

test("reads the persisted UI language independently from content language", () => {
  assert.equal(
    getCoreUILanguageFromSettings({
      languageSelected: "de",
      uiLanguage: "en",
    }),
    "en",
  );
  assert.equal(normalizeCoreUILanguage("de"), "de");
  assert.equal(normalizeCoreUILanguage("fr"), "en");
  assert.equal(normalizeCoreUILanguage(undefined), "en");
});

test("keeps English and German translation keys aligned", () => {
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
});

test("falls back to English when a locale entry is unavailable", () => {
  const resources = {
    en: {"common.retry": "Try again"},
    de: {},
  };

  assert.equal(
    resolveTranslation("de", "common.retry", {}, resources),
    "Try again",
  );
});
