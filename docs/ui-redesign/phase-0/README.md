# Phase 0: Visual spike and baseline

Phase 0 turns the redesign plan into a reproducible design decision without
changing the production UI. The spike uses deterministic local fixtures, so its
layout can be compared without an account, network access, or changing YouTube
content.

## Selected direction

**Variant A — Content first** is the implementation direction for Phase 1 and
later migrations.

- Feed cards remain borderless and let thumbnails define the visual rhythm.
- The compact header does not introduce a permanent raised panel.
- Bottom navigation uses a quiet active indicator instead of a filled container.
- TV focus reserves border space in the resting state and adds scale, outline,
  and shadow without causing surrounding cards to move.

Variant B — Structured remains available in the spike as the rejected comparison.
Its raised header, panel cards, and filled navigation states are useful for dense
secondary screens, but add too much chrome to the primary feed.

## Run the spike

Removed. The variant comparison ended with Phase 1, which adopted Variant A and
moved the finalized tokens into `src/ui/theme/`. The spike screens
(`src/ui/experimental/`) and the `EXPO_PUBLIC_UI_DESIGN_SPIKE` switch in
`index.js` were deleted once Phases 1 to 7 shipped; this document keeps the
decision record.

## Phase 0 artifacts

- [Device and breakpoint matrix](./DEVICE_MATRIX.md)
- [Screenshot matrix](./SCREENSHOT_MATRIX.md)
- [Acceptance criteria](./ACCEPTANCE_CRITERIA.md)
- [Captured references](./screenshots/README.md)
- Finalized dark tokens in `src/ui/theme/`
- Two executable variants for card, header, bottom navigation, and TV focus
- Selected vertical reference flow: `Home -> Video -> Back`

Phase 1 may integrate the tokens into the production providers. It should keep
the token names stable unless implementation evidence requires a documented
change.
