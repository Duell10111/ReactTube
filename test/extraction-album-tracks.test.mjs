import assert from "node:assert/strict";
import test from "node:test";

import {
  getAlbumPlaylistId,
  withAlbumCover,
} from "../src/extraction/albumTracks.ts";

const cover = {url: "https://example.test/album.jpg", width: 544, height: 544};

test("gives album tracks without artwork the album cover", () => {
  const [track] = withAlbumCover([{type: "video", id: "a"}], cover);

  assert.equal(track.thumbnailImage, cover);
});

test("keeps artwork a track already has", () => {
  const own = {url: "https://example.test/own.jpg", width: 60, height: 60};
  const [track] = withAlbumCover(
    [{type: "video", id: "a", thumbnailImage: own}],
    cover,
  );

  assert.equal(track.thumbnailImage, own);
});

test("leaves non-track entries and a missing cover alone", () => {
  const playlist = {type: "playlist", id: "p"};
  const items = [{type: "video", id: "a"}];

  assert.equal(withAlbumCover([playlist], cover)[0], playlist);
  assert.equal(withAlbumCover(items, undefined), items);
});

test("takes the album playlist id from the play button", () => {
  assert.equal(
    getAlbumPlaylistId(
      "OLAK5uy_play",
      "https://music.youtube.com/playlist?list=OLAK5uy_url",
    ),
    "OLAK5uy_play",
  );
});

test("falls back to the canonical URL for the album playlist id", () => {
  assert.equal(
    getAlbumPlaylistId(
      undefined,
      "https://music.youtube.com/playlist?list=OLAK5uy_url&feature=share",
    ),
    "OLAK5uy_url",
  );
  assert.equal(getAlbumPlaylistId(undefined, undefined), undefined);
  assert.equal(
    getAlbumPlaylistId(undefined, "https://music.youtube.com/browse/MPREb_x"),
    undefined,
  );
});
