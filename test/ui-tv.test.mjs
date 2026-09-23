import assert from "node:assert/strict";
import test from "node:test";

import {
  getChromeLayout,
  getContentPlaneOffset,
  getContentPlaneWidth,
  getTVRailGrowth,
  getTVRailWidth,
  tvRailMetrics,
} from "../src/ui/layout/appShell.ts";
import {
  getTVContentInsets,
  getTVOverscanInsets,
  tvOverscanMetrics,
} from "../src/ui/layout/tvOverscan.ts";
import {
  getFeedCardWidth,
  getFeedContentPadding,
  getFeedMetrics,
  getFeedRowPadding,
} from "../src/ui/patterns/feedLayout.ts";
import {
  getFeedListPerformance,
  getShelfListPerformance,
} from "../src/ui/patterns/feedPerformance.ts";
import {resolveThumbnailUrl} from "../src/ui/patterns/thumbnailSource.ts";
import {
  touchControlMetrics,
  tvControlMetrics,
} from "../src/ui/theme/controls.ts";
import {createTVRemoteDispatcher} from "../src/ui/tv/tvRemoteDispatcher.ts";

/** The two coordinate spaces the app is actually rendered in. */
const appleTV = {width: 1920, height: 1080};
const androidTV = {width: 960, height: 540};

test("reproduces both platforms' published title-safe margins", () => {
  // tvOS asks for 60 x 30 points at 1920 x 1080.
  assert.deepEqual(getTVOverscanInsets(appleTV), {
    top: 30,
    bottom: 30,
    left: 60,
    right: 60,
  });

  // Android TV asks for 48 x 27 dp at 960 x 540 dp, which the ratio alone
  // would undercut — the floor is what carries that case.
  assert.deepEqual(getTVOverscanInsets(androidTV), {
    top: 27,
    bottom: 27,
    left: 48,
    right: 48,
  });
});

test("keeps the overscan margin inside its bounds for any surface size", () => {
  const huge = getTVOverscanInsets({width: 7680, height: 4320});

  assert.equal(huge.left, tvOverscanMetrics.maxHorizontal);
  assert.equal(huge.top, tvOverscanMetrics.maxVertical);

  const unknown = getTVOverscanInsets({width: 0, height: Number.NaN});

  assert.deepEqual(unknown, {top: 0, bottom: 0, left: 0, right: 0});
});

test("does not charge the leading overscan margin to the content twice", () => {
  const insets = getTVContentInsets(appleTV, getTVRailWidth("collapsed"));

  // The rail is wider than the crop, so what is left on that side is the
  // gutter that keeps content off the rail, not the margin a second time.
  assert.equal(insets.left, tvOverscanMetrics.minGutter);
  assert.equal(insets.right, 60);
  assert.equal(insets.top, Math.max(30, tvOverscanMetrics.minGutter));

  // Without a rail the full margin applies on both sides.
  assert.equal(getTVContentInsets(appleTV, 0).left, 60);
});

test("keeps the rail at the screen edge and the margin beside it", () => {
  // The rail is chrome: it stays at its own width instead of carrying the
  // title-safe margin, which would leave an empty strip beside every icon.
  assert.equal(getTVRailWidth("collapsed"), tvRailMetrics.collapsedWidth);
  assert.equal(getTVRailWidth("expanded"), tvRailMetrics.expandedWidth);
  assert.equal(getTVRailWidth("hidden"), 0);
  assert.equal(getTVRailGrowth(), 224);

  // A destination still starts inside the rail rather than on its edge, and
  // the rail is wide enough to hold that inset next to a TV-sized icon.
  assert.ok(tvRailMetrics.leadingInset > 0);
  assert.ok(
    tvRailMetrics.leadingInset < tvOverscanMetrics.minHorizontal,
    "the rail keeps part of the margin, not all of it",
  );
  assert.ok(
    tvRailMetrics.leadingInset + tvControlMetrics.iconSize <
      tvRailMetrics.collapsedWidth,
  );

  assert.equal(
    getContentPlaneOffset("expanded") - getContentPlaneOffset("collapsed"),
    getTVRailGrowth(),
  );
  assert.equal(
    getContentPlaneWidth(appleTV.width),
    appleTV.width - tvRailMetrics.collapsedWidth,
  );
});

test("reports the TV content insets through the app shell", () => {
  const tv = getChromeLayout({
    layout: "tv",
    insets: {top: 0, bottom: 0, left: 0, right: 0},
    miniPlayerVisible: false,
    size: appleTV,
  });

  assert.equal(tv.railWidth, tvRailMetrics.collapsedWidth);
  assert.equal(tv.overscanInsets.left, 60);
  assert.equal(tv.contentInsets.left, tvOverscanMetrics.minGutter);

  // A touch layout keeps the system safe area; overscan is a TV concept.
  const phone = getChromeLayout({
    layout: "compact",
    insets: {top: 44, bottom: 34, left: 0, right: 0},
    miniPlayerVisible: false,
    size: {width: 390, height: 844},
  });

  assert.deepEqual(phone.contentInsets, {
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  });
  assert.deepEqual(phone.overscanInsets, {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
});

test("lays out the TV feed inside the margin it was given", () => {
  const metrics = getFeedMetrics("tv");
  const insets = {top: 32, bottom: 32, left: 32, right: 60};
  const padding = getFeedContentPadding("tv", metrics, insets);

  assert.deepEqual(padding, {
    paddingTop: 32,
    paddingBottom: 32,
    paddingStart: 32,
    paddingEnd: 60,
  });

  // The card width has to follow the padding that is actually applied, or the
  // last column runs into the overscan zone.
  const width = 1764;
  const cardWidth = getFeedCardWidth(
    width,
    metrics,
    padding.paddingStart + padding.paddingEnd,
  );

  assert.equal(
    cardWidth * metrics.columns +
      metrics.gap * (metrics.columns - 1) +
      padding.paddingStart +
      padding.paddingEnd,
    width,
  );
});

test("gives the horizontal margin to the rows, not to the scroll view", () => {
  const metrics = getFeedMetrics("tv");
  const padding = getFeedContentPadding("tv", metrics, {
    top: 32,
    bottom: 32,
    left: 32,
    right: 60,
  });
  const row = getFeedRowPadding(padding);

  // A shelf inside a padded scroll container ends where the padding starts,
  // which cuts the row off before the screen edge and leaves a dead band
  // beside it. Rows carry the margin so a shelf can run to the edge.
  assert.deepEqual(row, {paddingStart: 32, paddingEnd: 60});

  // A touch layout has no feed padding at compact width, so the minimum is
  // what keeps a shelf title off the screen edge there.
  const compact = getFeedMetrics("compact");

  assert.deepEqual(
    getFeedRowPadding(
      getFeedContentPadding("compact", compact, {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      }),
      8,
    ),
    {paddingStart: 8, paddingEnd: 8},
  );
});

test("keeps touch feeds on their own density padding", () => {
  const metrics = getFeedMetrics("medium");
  const padding = getFeedContentPadding("medium", metrics, {
    top: 99,
    bottom: 99,
    left: 99,
    right: 99,
  });

  assert.deepEqual(padding, {
    paddingTop: metrics.padding,
    paddingBottom: metrics.padding,
    paddingStart: metrics.padding,
    paddingEnd: metrics.padding,
  });
});

test("never clips TV list cells out of the focus tree", () => {
  const tv = getFeedListPerformance("tv");
  const phone = getFeedListPerformance("compact");

  // A clipped subview cannot be focused, so the remote would lose focus at the
  // edge of the viewport.
  assert.equal(tv.removeClippedSubviews, false);
  assert.equal(phone.removeClippedSubviews, false);

  // The D-pad can only move to a row that is already mounted, so TV renders
  // further ahead of the viewport than it shows.
  assert.ok(tv.windowSize > tv.initialNumToRender);
  assert.ok(getShelfListPerformance("tv").initialNumToRender >= 6);
  assert.ok(
    getShelfListPerformance("tv").initialNumToRender >
      getShelfListPerformance("compact").initialNumToRender,
  );
});

test("scales controls for the TV reading distance", () => {
  assert.ok(tvControlMetrics.minTarget > touchControlMetrics.minTarget);
  assert.ok(tvControlMetrics.iconSize > touchControlMetrics.iconSize);
  assert.ok(
    tvControlMetrics.focusBorderWidth >= touchControlMetrics.focusBorderWidth,
  );
  // The touch target stays at the platform minimum for a finger.
  assert.equal(touchControlMetrics.minTarget, 48);
});

test("fans one remote event out to every listener", () => {
  const seen = [];
  const dispatcher = createTVRemoteDispatcher();

  const first = dispatcher.subscribe(event =>
    seen.push(["a", event.eventType]),
  );
  dispatcher.subscribe(event => seen.push(["b", event.eventType]));

  dispatcher.dispatch({eventType: "select"});
  first();
  dispatcher.dispatch({eventType: "longSelect"});

  assert.deepEqual(seen, [
    ["a", "select"],
    ["b", "select"],
    ["b", "longSelect"],
  ]);
  assert.equal(dispatcher.size, 1);
});

test("attaches the native source only while something is listening", () => {
  const events = [];
  const dispatcher = createTVRemoteDispatcher({
    onFirstListener: () => events.push("attach"),
    onLastListener: () => events.push("detach"),
  });

  const first = dispatcher.subscribe(() => {});
  const second = dispatcher.subscribe(() => {});

  first();
  // A second call must not detach a source the remaining listener still needs.
  first();
  assert.deepEqual(events, ["attach"]);

  second();
  assert.deepEqual(events, ["attach", "detach"]);

  dispatcher.subscribe(() => {});
  assert.deepEqual(events, ["attach", "detach", "attach"]);
});

test("lets a listener unsubscribe from inside a dispatch", () => {
  const seen = [];
  const dispatcher = createTVRemoteDispatcher();

  const remove = dispatcher.subscribe(() => {
    seen.push("first");
    remove();
  });
  dispatcher.subscribe(() => seen.push("second"));

  dispatcher.dispatch({eventType: "select"});
  dispatcher.dispatch({eventType: "select"});

  assert.deepEqual(seen, ["first", "second", "second"]);
});

test("keeps one failing listener from swallowing the event", () => {
  const seen = [];
  const errors = [];
  const dispatcher = createTVRemoteDispatcher({
    onListenerError: error => errors.push(error),
  });

  dispatcher.subscribe(() => {
    throw new Error("boom");
  });
  dispatcher.subscribe(() => seen.push("reached"));

  dispatcher.dispatch({eventType: "menu"});

  assert.deepEqual(seen, ["reached"]);
  assert.equal(errors.length, 1);
});

test("asks for a smaller still frame than a phone card was handed", () => {
  const maxres = "https://i.ytimg.com/vi/abc123/maxresdefault.jpg";

  // A 180 point shelf card on a 2x phone needs 360 pixels, not 1280.
  assert.equal(
    resolveThumbnailUrl(maxres, 180, 2),
    "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
  );
  assert.equal(
    resolveThumbnailUrl(maxres, 60, 2),
    "https://i.ytimg.com/vi/abc123/default.jpg",
  );
});

test("never names a still frame bucket YouTube may not have produced", () => {
  // A TV card is larger than every bucket that exists for every upload, so the
  // URL YouTube delivered stays — it is already the largest known-good one.
  assert.equal(
    resolveThumbnailUrl(
      "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
      420,
      2,
    ),
    "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
  );

  // Stepping up from a small bucket would name a file that may 404.
  assert.equal(
    resolveThumbnailUrl("https://i.ytimg.com/vi/abc123/mqdefault.jpg", 420, 2),
    "https://i.ytimg.com/vi/abc123/mqdefault.jpg",
  );

  // The webp variant keeps its own path and extension.
  assert.equal(
    resolveThumbnailUrl(
      "https://i.ytimg.com/vi_webp/abc123/maxresdefault.webp",
      200,
      1,
    ),
    "https://i.ytimg.com/vi_webp/abc123/mqdefault.webp",
  );
});

test("requests an avatar at the size it is rendered at", () => {
  const avatar = "https://yt3.ggpht.com/ytc/AAA=s88-c-k-c0x00ffffff-no-rj";

  // Google's image host resizes on request, so a TV may ask for more pixels
  // than the default 88 it was handed.
  assert.equal(
    resolveThumbnailUrl(avatar, 220, 1),
    "https://yt3.ggpht.com/ytc/AAA=s220-c-k-c0x00ffffff-no-rj",
  );
  assert.equal(
    resolveThumbnailUrl(avatar, 36, 2),
    "https://yt3.ggpht.com/ytc/AAA=s72-c-k-c0x00ffffff-no-rj",
  );
  assert.equal(
    resolveThumbnailUrl("https://yt3.googleusercontent.com/AAA=s48?v=1", 96, 1),
    "https://yt3.googleusercontent.com/AAA=s96?v=1",
  );
});

test("leaves a URL it does not recognize alone", () => {
  const foreign = "https://example.test/image.png";

  assert.equal(resolveThumbnailUrl(foreign, 420, 2), foreign);
  assert.equal(resolveThumbnailUrl(undefined, 420), undefined);
  assert.equal(resolveThumbnailUrl(foreign, 0), foreign);
});
