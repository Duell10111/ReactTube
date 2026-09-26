import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTrackColumns,
  createMusicSectionModel,
  getMusicCardShape,
  getMusicCardWidth,
  getMusicSubtitle,
  getTrackColumnWidth,
  getTrackShelfRows,
} from "../src/components/music/sections/musicSectionModel.ts";
import {resolveMediaCardRoute} from "../src/ui/patterns/mediaCardRouting.ts";

function song(id, overrides = {}) {
  return {
    originalNode: {type: "MusicTwoRowItem"},
    type: "video",
    id,
    title: `Song ${id}`,
    music: true,
    thumbnailImage: {
      url: `https://example.test/${id}.jpg`,
      width: 226,
      height: 226,
    },
    ...overrides,
  };
}

function shelf(overrides = {}) {
  return {
    originalNode: {type: "MusicCarouselShelf"},
    data: [],
    parsedData: [],
    loadMore: () => {},
    id: "shelf",
    music: true,
    ...overrides,
  };
}

test("reads the layout of a music shelf from the shelf itself", () => {
  const tracks = createMusicSectionModel(
    shelf({
      title: "Schnellauswahl",
      items_per_columns: 4,
      parsedData: [song("1"), song("2")],
      buttons: [{type: "PLAY", title: "Play all"}],
    }),
  );

  assert.equal(tracks.kind, "tracks");
  assert.equal(tracks.rows, 4);
  assert.equal(tracks.playAll?.type, "PLAY");

  const carousel = createMusicSectionModel(
    shelf({
      title: "Gemeinsam anhören",
      subtitle: "Sender",
      items_per_columns: 1,
      parsedData: [song("1")],
    }),
  );

  assert.equal(carousel.kind, "carousel");
  assert.equal(carousel.rows, 0);
  assert.equal(carousel.strapline, "Sender");

  const description = createMusicSectionModel(
    shelf({title: "An album description"}),
  );

  assert.equal(description.kind, "description");
});

test("caps the rows of a track shelf at what a phone can show", () => {
  assert.equal(getTrackShelfRows(undefined), 0);
  assert.equal(getTrackShelfRows(1), 0);
  assert.equal(getTrackShelfRows(3), 3);
  assert.equal(getTrackShelfRows(8), 4);
});

test("fills a track shelf column by column", () => {
  const items = ["1", "2", "3", "4", "5"].map(id => song(id));

  assert.deepEqual(
    buildTrackColumns(items, 2).map(column => column.map(item => item.id)),
    [["1", "2"], ["3", "4"], ["5"]],
  );
});

test("takes the card shape from the artwork the entry carries", () => {
  assert.equal(getMusicCardShape(song("1")), "square");
  assert.equal(
    getMusicCardShape(
      song("2", {thumbnailImage: {url: "u", width: 400, height: 225}}),
    ),
    "wide",
  );
  assert.equal(
    getMusicCardShape({
      originalNode: {type: "MusicTwoRowItem"},
      type: "channel",
      id: "3",
      title: "An artist",
      thumbnailImage: {url: "u", width: 226, height: 226},
    }),
    "circle",
  );
});

test("keeps a second card on screen on narrow phones", () => {
  assert.equal(getMusicCardWidth("square", 400), 152);
  assert.ok(getMusicCardWidth("square", 280) < 152);
  assert.equal(getMusicCardWidth("wide", 400), 248);
  assert.ok(getMusicCardWidth("wide", 300) < 248);
});

test("lets the next track column peek in, unless it is the only one", () => {
  assert.equal(getTrackColumnWidth(360, 1), 360);
  assert.ok(getTrackColumnWidth(360, 3) < 360);
  assert.ok(getTrackColumnWidth(360, 3) > 300);
  assert.equal(getTrackColumnWidth(0, 3), 0);
});

test("prefers the subtitle YouTube Music composed itself", () => {
  assert.equal(
    getMusicSubtitle(song("1", {subtitle: "ORFEO • 1 Mio. Aufrufe"}), "ORFEO"),
    "ORFEO • 1 Mio. Aufrufe",
  );
  assert.equal(
    getMusicSubtitle(song("1"), "ORFEO · 1M views"),
    "ORFEO · 1M views",
  );
  assert.equal(getMusicSubtitle(song("1"), "  "), undefined);
});

// Routing of a media card press

function localTrack(overrides = {}) {
  // A track of a locally stored playlist: no `music` marker, no nav endpoint.
  return {
    originalNode: {type: "Local"},
    type: "video",
    id: "local-1",
    title: "A stored song",
    localPlaylistId: "LC-1",
    thumbnailImage: {url: "https://example.test/local.jpg"},
    ...overrides,
  };
}

test("plays a music surface track in the music player, marker or not", () => {
  assert.equal(
    resolveMediaCardRoute(localTrack(), {music: true}).target.kind,
    "musicPlayer",
  );
  assert.equal(
    resolveMediaCardRoute(song("1")).target.kind,
    "musicPlayer",
    "a track YouTube Music itself marked needs no surface hint",
  );
});

test("leaves a track outside the music surfaces in the video player", () => {
  assert.equal(resolveMediaCardRoute(localTrack()).target.kind, "videoPlayer");
  assert.equal(
    resolveMediaCardRoute(localTrack({type: "reel"})).target.kind,
    "videoPlayer",
  );
  assert.equal(
    resolveMediaCardRoute(localTrack({type: "mix"}), {music: true}).target.kind,
    "musicPlayer",
  );
});

test("opens a playlist of a music surface as a music playlist", () => {
  const local = localTrack({type: "playlist", id: "LC-1"});
  assert.equal(
    resolveMediaCardRoute(local, {music: true}).target.routeName,
    "MusicPlaylistScreen",
  );
  assert.equal(resolveMediaCardRoute(local).target.routeName, "PlaylistScreen");
  assert.equal(
    resolveMediaCardRoute(localTrack({type: "album", id: "MPRE"})).target
      .routeName,
    "MusicAlbumScreen",
    "an album only exists on the music surfaces",
  );
});

test("replaces only a screen that links onward to itself", () => {
  assert.equal(
    resolveMediaCardRoute(localTrack({type: "playlist"}), {
      music: true,
      currentRouteName: "MusicPlaylistScreen",
    }).replace,
    true,
  );
  assert.equal(
    resolveMediaCardRoute(localTrack({type: "playlist"}), {
      music: true,
      currentRouteName: "MusicHomeScreen",
    }).replace,
    false,
  );
  assert.equal(
    resolveMediaCardRoute(song("1", {type: "channel"}), {
      currentRouteName: "MusicChannelScreen",
    }).replace,
    false,
    "an artist screen never stacks onto itself",
  );
});
