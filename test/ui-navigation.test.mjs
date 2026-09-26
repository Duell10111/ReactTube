import assert from "node:assert/strict";
import test from "node:test";

import {
  appChromeMetrics,
  getChromeLayout,
  getContentPlaneOffset,
  getContentPlaneWidth,
  getNavigationMode,
  getTVRailGrowth,
  getTVRailWidth,
  resolveTVRailState,
  tvRailMetrics,
} from "../src/ui/layout/appShell.ts";
import {findActiveRouteName} from "../src/ui/navigation/activeRoute.ts";
import {
  getPrimaryDestinationByRoute,
  getPrimaryDestinations,
  getTVRailDestinations,
} from "../src/ui/navigation/destinations.ts";

const noInsets = {top: 0, bottom: 0, left: 0, right: 0};

test("keeps five stable primary destinations for signed in and signed out users", () => {
  const destinations = getPrimaryDestinations();

  assert.deepEqual(
    destinations.map(destination => destination.key),
    ["home", "subscriptions", "music", "downloads", "you"],
  );
  assert.equal(
    destinations.filter(destination => destination.requiresAccount).length,
    1,
  );
  assert.equal(getPrimaryDestinationByRoute("You")?.key, "you");
  assert.equal(getPrimaryDestinationByRoute("Settings"), undefined);
});

test("keeps every TV destination reachable in both account states", () => {
  const signedIn = getTVRailDestinations(true).map(({key}) => key);
  const signedOut = getTVRailDestinations(false).map(({key}) => key);

  assert.ok(signedIn.includes("subscriptions"));
  assert.ok(!signedIn.includes("login"));
  assert.ok(signedOut.includes("login"));
  assert.ok(!signedOut.includes("subscriptions"));
  for (const key of ["home", "search", "settings"]) {
    assert.ok(signedIn.includes(key) && signedOut.includes(key));
  }
  assert.deepEqual(
    getTVRailDestinations(true)
      .filter(destination => destination.placement === "bottom")
      .map(({key}) => key),
    ["settings"],
  );
});

test("keeps the bottom navigation on every touch layout", () => {
  // A tablet adapts through content density, not through a second navigation
  // pattern, so the destinations sit in the same place on every touch device.
  assert.equal(getNavigationMode("compact"), "bottomTabs");
  assert.equal(getNavigationMode("medium"), "bottomTabs");
  assert.equal(getNavigationMode("expanded"), "bottomTabs");
  assert.equal(getNavigationMode("tv"), "tvRail");
});

test("moves the TV content plane by exactly the rail growth", () => {
  assert.equal(getTVRailWidth("collapsed"), tvRailMetrics.collapsedWidth);
  assert.equal(getTVRailWidth("expanded"), tvRailMetrics.expandedWidth);
  assert.equal(getTVRailWidth("hidden"), 0);
  assert.equal(getTVRailGrowth(), 224);
  assert.equal(getContentPlaneOffset("collapsed"), 0);
  assert.equal(
    getContentPlaneOffset("expanded") - getContentPlaneOffset("collapsed"),
    getTVRailWidth("expanded") - getTVRailWidth("collapsed"),
  );
  assert.equal(getContentPlaneOffset("hidden"), -tvRailMetrics.collapsedWidth);
});

test("keeps the TV content plane width independent from the rail state", () => {
  const width = getContentPlaneWidth(1920);

  assert.equal(width, 1920 - tvRailMetrics.collapsedWidth);
  assert.equal(getContentPlaneWidth(0), 0);
});

test("resolves the rail state with hidden taking precedence", () => {
  assert.equal(resolveTVRailState(false, false), "collapsed");
  assert.equal(resolveTVRailState(false, true), "expanded");
  assert.equal(resolveTVRailState(true, true), "hidden");
});

test("derives header, rail, and mini player geometry from one system", () => {
  const phone = getChromeLayout({
    layout: "compact",
    insets: {...noInsets, top: 44, bottom: 34},
    miniPlayerVisible: true,
  });

  assert.equal(phone.navigationMode, "bottomTabs");
  assert.equal(phone.headerHeight, appChromeMetrics.compactHeaderHeight);
  assert.equal(
    phone.headerTotalHeight,
    appChromeMetrics.compactHeaderHeight + 44,
  );
  assert.equal(phone.railWidth, 0);
  assert.equal(phone.miniPlayerHeight, appChromeMetrics.miniPlayerHeight);
  assert.deepEqual(phone.miniPlayerOffset, {left: 0, right: 0, bottom: 0});

  const tablet = getChromeLayout({
    layout: "expanded",
    insets: {top: 24, bottom: 20, left: 16, right: 12},
    miniPlayerVisible: true,
  });

  assert.equal(tablet.navigationMode, "bottomTabs");
  assert.equal(tablet.headerHeight, appChromeMetrics.expandedHeaderHeight);
  assert.equal(tablet.railWidth, 0);
  assert.deepEqual(tablet.miniPlayerOffset, {left: 0, right: 0, bottom: 0});

  const tv = getChromeLayout({
    layout: "tv",
    insets: noInsets,
    miniPlayerVisible: false,
  });

  assert.equal(tv.navigationMode, "tvRail");
  assert.equal(tv.headerHeight, 0);
  assert.equal(tv.railWidth, tvRailMetrics.collapsedWidth);
  assert.equal(tv.miniPlayerHeight, 0);
});

test("resolves the focused leaf route of a nested navigation state", () => {
  const state = {
    index: 0,
    routes: [
      {
        name: "Home",
        state: {
          index: 1,
          routes: [{name: "HomeFeed"}, {name: "LibraryScreen"}],
        },
      },
      {name: "Search"},
    ],
  };

  assert.equal(findActiveRouteName(state), "LibraryScreen");
  assert.equal(
    findActiveRouteName({index: 0, routes: [{name: "Search"}]}),
    "Search",
  );
  assert.equal(findActiveRouteName(undefined), undefined);
  assert.equal(findActiveRouteName({routes: []}), undefined);
});
