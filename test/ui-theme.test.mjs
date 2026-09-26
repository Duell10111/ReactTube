import assert from "node:assert/strict";
import test from "node:test";

import {
  getFeedColumnCount,
  getLayoutClass,
  layoutBreakpoints,
} from "../src/ui/theme/breakpoints.ts";
import {darkColors} from "../src/ui/theme/colors.ts";
import {radii} from "../src/ui/theme/radii.ts";
import {spacing} from "../src/ui/theme/spacing.ts";
import {phoneTypography, tvTypography} from "../src/ui/theme/typography.ts";

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map(channel => Number.parseInt(channel, 16) / 255)
    .map(channel =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first, second) {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));

  return (lighter + 0.05) / (darker + 0.05);
}

test("maps viewport boundaries to stable layout classes", () => {
  assert.equal(getLayoutClass(320), "compact");
  assert.equal(getLayoutClass(layoutBreakpoints.medium - 1), "compact");
  assert.equal(getLayoutClass(layoutBreakpoints.medium), "medium");
  assert.equal(getLayoutClass(layoutBreakpoints.expanded - 1), "medium");
  assert.equal(getLayoutClass(layoutBreakpoints.expanded), "expanded");
  assert.equal(getLayoutClass(320, true), "tv");
});

test("assigns the documented feed density to every layout class", () => {
  assert.deepEqual(
    ["compact", "medium", "expanded", "tv"].map(getFeedColumnCount),
    [1, 2, 3, 4],
  );
});

test("keeps spacing and radii on the finalized baseline scales", () => {
  assert.deepEqual(Object.values(spacing), [0, 4, 8, 12, 16, 24, 32, 48]);
  assert.deepEqual([radii.control, radii.card, radii.panel], [8, 12, 16]);
});

test("defines complete matching phone and TV typography roles", () => {
  const phoneRoles = Object.keys(phoneTypography);
  const tvRoles = Object.keys(tvTypography);

  assert.deepEqual(tvRoles, phoneRoles);
  assert.equal(phoneRoles.length, 8);

  for (const role of phoneRoles) {
    assert.ok(phoneTypography[role].fontSize > 0);
    assert.ok(
      phoneTypography[role].lineHeight > phoneTypography[role].fontSize,
    );
    assert.ok(tvTypography[role].fontSize >= phoneTypography[role].fontSize);
    assert.ok(phoneTypography[role].maxLines >= 1);
  }
});

test("does not reuse media color roles for status errors", () => {
  assert.equal(darkColors.mediaProgress, darkColors.live);
  assert.notEqual(darkColors.error, darkColors.mediaProgress);
  assert.notEqual(darkColors.warning, darkColors.mediaProgress);
  assert.notEqual(darkColors.success, darkColors.mediaProgress);
});

test("keeps dark-theme text and focus above WCAG AA contrast", () => {
  assert.ok(
    contrastRatio(darkColors.textPrimary, darkColors.background) >= 4.5,
  );
  assert.ok(contrastRatio(darkColors.textSecondary, darkColors.surface) >= 4.5);
  assert.ok(contrastRatio(darkColors.focus, darkColors.background) >= 3);
});
