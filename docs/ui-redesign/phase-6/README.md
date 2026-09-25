# Phase 6: TV hardening

Phase 5 put every surface on the same design language. Phase 6 asks a
different question of the TV build: not whether it looks right, but whether it
can be operated with nothing but a remote, on a panel that may crop the edges
of the picture, from across a room.

Four things came out of that: the app had no idea what "safe" meant on a TV,
its controls never left the touch scale, virtualization was quietly fighting
the D-pad, and every media card on screen held its own remote listener.

## Overscan is a measurement, not a guess

A TV panel may crop the outer edge of the signal. Both platforms publish a
title-safe margin and they do not agree on a number, because they do not use
the same logical resolution: tvOS renders 1920 × 1080 points and asks for
60 × 30, Android TV renders 960 × 540 dp and asks for 48 × 27.

`tvOverscan.ts` reproduces both with one rule — a ratio of each axis with a
floor. The ratio gives tvOS its 60 × 30, the floor gives Android TV its
48 × 27, and a cap keeps an unusually large logical surface from spending a
tenth of the screen on a margin nothing crops. Everything that touches a screen
edge now derives from that one function:

| Surface         | Before            | Now                                  |
| --------------- | ----------------- | ------------------------------------ |
| Navigation rail | `paddingStart: 8` | the leading margin, inside the width |
| Feed content    | `padding: 32`     | the content insets                   |
| Player metadata | `width: "95%"`    | the margin on both sides plus top    |
| TV side panel   | `padding: 16`     | the margin on its three open edges   |

The rail is the interesting case. It sits at the left edge and is the _only_
thing there, so it carries the leading margin itself: its width is the margin
plus its icon column, and the content plane starts behind that. The margin is
present in the collapsed and the expanded width alike, so it cancels out — the
plane still moves by exactly the rail growth of 224 and the focus matrix from
Phase 2 still holds.

That also means the content plane must _not_ apply the leading margin a second
time. The rail is wider than the crop, so what the feed keeps on that side is
the gutter that holds content off the rail, not the title-safe margin again.
Repeating it would have pushed every feed an entire rail width to the right.
`getTVContentInsets` is asymmetric for that reason, and the card width now
follows the padding that is actually applied instead of assuming it is
symmetric.

## Virtualization against the D-pad

A pointer can scroll toward content that does not exist yet; the list mounts it
on the way. A D-pad cannot. Focus only moves to a view that is already mounted,
so the row below the last rendered one is not merely invisible — it is
unreachable, and the remote stops dead at the edge of the window.

`feedPerformance.ts` holds the settings that follow from that. The one that
matters most is `removeClippedSubviews`, which stays off: a clipped subview is
detached from the native view tree and cannot be focused at all, which loses
focus outright when the focused card is scrolled to the edge. TV keeps a deeper
window and renders a batch ahead of the viewport; shelves get their own numbers,
because a shelf is the long list on TV and the remote walks it one card at a
time.

## One remote listener instead of forty

`useTVEventHandler` opens a native subscription per call and re-opens it
whenever the handler identity changes. The TV media card used it with an inline
handler to catch a long press, so a screen of forty cards tore down and rebuilt
forty native subscriptions on every render pass, and every key press then walked
all forty of them.

`tvRemoteDispatcher.ts` keeps one subscription for the whole app and fans the
event out itself. `useTVRemoteEvent` holds the handler in a ref, so a component
that re-renders on focus keeps one stable subscription while its handler still
sees current state, and it takes an `enabled` flag — the card now listens only
while it is the focused one. The dispatcher iterates a snapshot, so a listener
that unsubscribes mid-dispatch cannot break the walk, and isolates a listener
that throws instead of swallowing the event for everything behind it.

Every remaining caller moved over: the rail, the player, the seek control, the
video screen, `VideoTouchable`, and the next-video countdown.

The cards are memoized on top of that. A TV feed re-renders on every focus move;
without `React.memo` that re-rendered the whole visible grid to change the
outline on two cards.

## Reading distance

Typography already switched between a touch and a TV scale. The controls around
it did not: a 48 point button with a 24 point icon stayed physically the same on
a screen viewed from ten feet away, next to text that had grown by half.

`theme.controls` is that scale — target size, icon size, and focus outline
width — and `AppButton`, `AppIconButton`, `Chip`, the rail item, and the media
card outline all read it instead of carrying their own number. Touch keeps 48
points, the platform minimum for a finger; TV moves to 64 with a 36 point icon
and a 4 point outline.

## Thumbnails and image memory

TV and phone show the same feed at very different sizes: a shelf card is 180
points wide on a phone and 420 on a TV. One URL for both means either a blurry
TV or a phone decoding a 1280 pixel frame into a thumbnail a seventh of that
width, for every card on screen.

`thumbnailSource.ts` resolves the URL against the width the card actually
renders at, and the two hosts behave differently:

- **Still frames** (`i.ytimg.com`) are named buckets, and only `default`,
  `mqdefault`, and `hqdefault` are produced for every upload. The resolver
  therefore only ever steps _down_. Naming a larger bucket would sometimes name
  a file that 404s, and a missing bucket is a broken thumbnail — so a card
  larger than every guaranteed bucket keeps the URL YouTube delivered, which is
  already the largest known-good one.
- **Avatars** (`ggpht.com`, `googleusercontent.com`) carry the size as a
  parameter and the host resizes on request. This is the one case where the app
  may ask for _more_ than it was handed: a TV renders a channel avatar at 220
  points, and the 88 pixel default would be an upscale of a quarter of the
  pixels it needs.

The pixel ratio is capped at 2 — beyond that the extra pixels are not visible in
a thumbnail and are pure decoded memory. `recyclingKey` on the image releases
the previous bitmap when a cell is recycled instead of keeping it alive behind
the new one.

## Focus regions

`TVFocusRegion` is a focus guide on TV and a plain view everywhere else, so a
surface declares its focus graph once instead of branching on `Platform.isTV` at
every level. A region owns both the initial focus and the memory of the last
focused child, which is what gives a screen a focus target when it opens and
what restores focus after a detour.

The feeds and shelves are regions now. My YouTube lost the guide it had wrapped
around its feed — the feed brings its own, and two guides over the same moves
compete — and its tab column gained one instead, so returning from the grid
lands on the tab that is open. The channel tab row gained one for the same
reason: coming back up out of the feed now lands on the tab that is open.

`FOCUS_GRAPH.md` records the regions per screen. `REMOTE_MATRIX.md` is the
key-by-key matrix for Apple TV and Android TV.

## Deliberate deviations

- **Focus restoration across a remounted screen is native, not ours.** A native
  stack keeps the previous screen mounted, so returning from a video restores
  focus through the guide that already holds it. A screen that is genuinely
  remounted falls back to its first focusable child. An app-level focus memory
  would only help the remounted case and would fight the guides everywhere
  else, so it is not here.
- **A remembered card that virtualization has not mounted cannot be focused.**
  The deeper TV window makes this rare rather than impossible.
- **A shelf is a region inside the feed's region.** Phase 4 found that a guide
  spanning a whole surface competes with the moves made inside it, which is why
  the side panel gives each of its rows a region instead of wrapping itself in
  one. The feed is the case where the outer guide is still wanted — something
  has to claim focus when the screen opens — so the nesting is deliberate, and
  steps 4 and 5 of the focus graph exist to confirm it on a device.
- **Focus animation profiling is a device measurement.** The listener and
  re-render work above is what can be fixed from the code; the frame timings on
  a long shelf have to be read on an actual Apple TV and Android TV, and belong
  to the manual matrix.
- **The old TV element components** — `ElementCard`, `VideoCard`,
  `HorizontalElementsList` and the related-videos row built on them — were not
  migrated to the media card. They are on the Phase 8 removal list, and moving
  them now would mean rebuilding the player's bottom panel a phase early.
- **Reels keep their own screen**, as in Phase 4.

## Verification

- `npm test` adds 18 checks for the overscan geometry, the rail at the screen
  edge, the feed padding, the row padding that lets a shelf bleed, the card
  width that follows it, the list settings, the control scale, the remote
  dispatcher, and the thumbnail resolver — 92 tests total.
- `npm run lint`, `npm run typecheck`, and `npx prettier --check` are clean for
  the changed files.

### Manual checks

Not automatable in this project yet, so they are part of the review:

1. Run `FOCUS_GRAPH.md` and `REMOTE_MATRIX.md` end to end on both platforms.
2. On a panel with overscan enabled, confirm the rail icons, the last feed
   column, the player metadata row, and the side panel's close button are all
   fully visible.
3. Confirm a shelf runs to the right screen edge with no band beside it, while
   its first card still lines up with the grid rows above and below it.
4. Scroll a long feed to the bottom with the D-pad only and confirm focus never
   stops before the last row.
5. Walk a shelf past a hundred entries and watch for dropped frames on the focus
   scale.
6. Open a feed with the memory graph attached and confirm image memory settles
   instead of growing per scrolled screen.
7. Turn Reduced Motion on and confirm focus is still readable without the scale.
