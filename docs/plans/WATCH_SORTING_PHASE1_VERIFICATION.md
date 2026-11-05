# Watch sorting — Phase 1 verification

Implementation date: 2026-11-05.

Implemented for playlists, videos, downloads and available streams. Playlist detail
sorting and resume queue persistence remain Phase 2 work.

## Automated verification

- Targeted `RT-Watch` build with the watchOS Simulator SDK succeeds for arm64 and
  x86_64. The generated Xcode project was not edited.
- `npm run lint`, `npm run typecheck`, `npm run typecheck:platforms` pass.
- `npm test` includes executable Swift regressions in
  `test/watch-library-sort.test.mjs`: natural en/de comparisons, both directions,
  missing values, deterministic ties, independent preferences, unsupported options,
  stream availability and ID-based queue selection. Catalog tests verify matching
  English/German resources and interpolation placeholders.
- Prettier checks cover the JavaScript test and the string catalog (JSON parser).
  Swift files use native Swift formatting.

The scheme-wide build with a global watch simulator SDK also builds the iOS Siri
extension against watchOS and fails at `targets/siri-intents/IntentHandler.swift`
(`handleInApp` unavailable on watchOS). Building `RT-Watch` directly avoids that
unrelated SDK mismatch. Existing Swift warnings remain in unrelated player and API
code.

## Interaction implementation and remaining acceptance

`LibrarySnapshotList` retains the displayed models and ID order. Row geometry
preferences detect movement from touch scrolling and the Digital Crown on watchOS
10 and later. A 700 ms quiet interval ends the interaction. VoiceOver focus is
reported separately and restarts the same quiet interval, preserving the focused
ID when applying pending changes.
Updates preserve the first visible ID, or the next surviving neighbor. Explicit
sort changes commit immediately and scroll to the sort header. The header regains
accessibility focus after dismissal; applying announces the selected criterion
and direction.

This strategy still requires simulator/device acceptance. No visual, Crown,
Dynamic Type or VoiceOver acceptance is claimed: the available computer-use
surface could not open Simulator. A watch simulator runtime is installed and the
app builds successfully, but build and logic tests do not establish UI behavior.

Run the Phase 1 portions of the manual checklist in `WATCH_SORTING_PLAN.md` on a
40 mm Watch and a larger Watch, in English and German, with maximum supported text
size and VoiceOver. In particular check geometry quiet-period detection during
Crown scrolling, focus transitions during sync, deleted visible rows, sheet
cancellation, foreground stream expiry and unchanged active playback after sorting.
Physical-device playback acceptance remains outstanding separately.
