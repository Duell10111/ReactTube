# Watch sorting — Phase 2 and 3 verification

Implementation date: 2026-11-06.

## Phase 2: playlist details and resume

- `PlaylistListView` uses the shared sort row, sheet and `LibrarySnapshotList`.
  Options: playlist order (default, no direction), title, artist, duration.
- The setting is stored per playlist ID under `sort.playlistDetails`. Deleting a
  playlist locally, through the iPhone or by clearing the database removes it;
  a sync or refresh of the same playlist keeps it. Unknown stored criteria fall
  back to the playlist order for that playlist only.
- Tapping a title passes the visible order to
  `updatePlaylist(playlist:orderedVideos:startVideoID:)`. The playlist reference
  stays set for the now playing title and resume. With the playlist order the
  queue keeps titles whose metadata has not arrived yet, as before.
- The start title is checked for playability before the current player is torn
  down. An unplayable selection starts nothing, keeps the current playback and
  offers a metadata refresh. The neighbor fallback (`queueIndex`) is removed;
  the start index is resolved by ID after unplayable items were filtered.
- Explicit shuffle keeps the same title set and playlist reference as before.
- `ResumeState.queueVideoIDs` stores the actual queue order (optional, so older
  states still decode). Resume restores that order restricted to the current
  playlist members, never inserts new titles, and resolves the title by ID.
  Older states use the current playlist order. Library queues are restored in
  their stored order; a vanished playlist keeps the single-title fallback.
  A missing title or an unplayable one is reported in the Continue row instead
  of starting another title.

## Phase 3: historical sort options

- New optional SwiftData fields: `Video.addedAt`, `Video.downloadedAt`,
  `Playlist.addedAt`, `Playlist.lastPlayedAt`.
- `addedAt` is set only by the model initializers, which covers every local
  creation path (`addDownloadData`, `addPlaylistData`, remote commands,
  `overrideDatabase`). Metadata refreshes never touch it.
- All download state writes go through `Video.setDownloaded(_:)`. It stores the
  time only on the transition to downloaded and clears it when the download is
  removed, so a repeated download gets a new time and re-setting `true` keeps
  the old one.
- `Playlist.lastPlayedAt` is written when the player reports `.playing` for a
  queue built from that playlist (at most once per minute per playlist), not
  when a queue is built or a view opens.
- Options: playlists gain "Last played" and "Date added", videos "Date added",
  downloads "Date downloaded". First direction is newest first. Existing
  selections and defaults are unchanged. Missing dates sort last and are shown
  as "… unknown", never as an invented date or "never".

## Automated verification

- `test/watch-sorting-queue.test.mjs` (executable Swift): order criterion
  untouched, date directions and missing values, per-scope criteria, per-playlist
  persistence/removal/fallback, unchanged pre-existing settings, ID-based start
  and resume order, `PlaylistManager` order with playlist reference, old and new
  `ResumeState` JSON, and a SwiftData migration from a store written with the
  previous model definitions (data preserved, new fields `nil`, `addedAt` stable
  across refresh, download time transitions).
- Existing watch test stubs were aligned with the new API; `npm test` passes.
- `npm run typecheck`, `npm run typecheck:platforms` pass. `npm run lint` reports
  only pre-existing warnings in `src/` plus findings in the untracked
  `vendor/bundle` Ruby gems; no lint target covers the changed files except the
  `.mjs` tests, which pass ESLint individually.

## Simulator check (Apple Watch Series 12, 46 mm, watchOS 27)

- The existing store (216 videos, 4 playlists) opened after the update without
  loss; the new columns exist and are `NULL`.
- Playlist list: the new criteria are offered, "Last played" starts with
  "Newest first", Apply updates the header, rows show "Last played unknown".
- Playlist detail: the four criteria are offered, the setting is kept per
  playlist across app restarts, and the duration value is shown in the rows.
- Tapping a title with an expired stream and "Continue" with an expired stream
  both show the unavailable alert with "Refresh Info"; nothing else starts.
- Not checked visually: a successful start in sorted order (the simulator has
  no downloads, no valid streams and no paired iPhone), German UI (the
  simulator kept a cached language preference), large text and VoiceOver.

### Render loop fixed in `LibrarySnapshotList`

Opening a playlist from the playlist list froze the app with an endless SwiftUI
render loop (100 % CPU). This already happened with the Phase 1 code. The list
hidden under the pushed screen kept receiving row positions; each one wrote
state (a new settle `Task` in `@State`, the anchor), which re-rendered it, and
the navigation stack then rebuilt the pushed screen. The list now ignores row
position and focus updates while it is not visible and keeps the settle task
outside of `@State`. Verified on the simulator (CPU idle after push, back and
second push) and covered by a source regression test.
