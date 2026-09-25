# Phase 3: Cards, shelves, and feed states

Phase 3 replaces the feed layer. Every migrated surface now renders the same
media card, the same shelf, and the same loading, empty, error, refresh, and
pagination states. Screens supply data and the actions behind those states;
they no longer lay out cards or invent their own metadata.

## One card, one data view

`src/ui/patterns/mediaCardModel.ts` turns an `ElementData` into the typed view
a card renders. It is pure, has no React or React Native import, and is covered
by `test/ui-feed.test.mjs`. It decides:

| Aspect        | Rule                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| Kind          | video, reel, mix, playlist, channel                                      |
| Shape         | `wide` 16:9, `portrait` 9:16 for reels, `circle` for channels            |
| Metadata      | author, views, publish date; the precomposed subtitle only as a fallback |
| Badges        | duration, live, mix, downloaded, playlist video count                    |
| Progress      | watch progress clamped to `0…1`, absent when there is none               |
| Accessibility | label from title, metadata, state, and progress; hint per kind           |

The rendering is split by surface, the data view is not:

- `MediaCard.tsx` is the touch card for phone and tablet. It is borderless: the
  thumbnail is the card, the avatar and metadata sit below it.
- `MediaCard.tv.tsx` is the TV card. Selection and focus are an outline of at
  least three points plus a scale transform, so a focused card never moves its
  neighbors. The transform is skipped while Reduced Motion is active. The card
  is inset by exactly the amount it grows by, so the focus scale stays inside
  the frame the feed assigns to it. Growing beyond that frame is invisible in a
  grid row but clipped inside a shelf, whose horizontal list cuts away
  everything outside its own bounds. Its text block reserves two title lines
  plus one metadata line whether the entry fills them or not, so every card in
  a row is the same height and the focus outline keeps its size while focus
  moves along a shelf.
- `MediaCardThumbnail.tsx` is shared, so a badge, the progress bar, or the
  image error state can never appear on only one surface.

The previous phone and TV cards showed different metadata, radii, and overlays
for the same entry, and only the TV card opened channels. Both routes are now
resolved in `useMediaCardPress`.

## Feed geometry

`feedLayout.ts` is the second pure module. `getFeedMetrics` gives each layout
class its column count, gap, padding, skeleton count, and shelf card width;
`getFeedCardWidth` derives a card width that fills a row exactly; and
`buildFeedRows` / `buildFeedSections` group entries into rows before rendering.

Rows are built first because a feed mixes full-width shelves with grid cards.
The previous grid rendered a shelf inside a single grid cell, which is why a
shelf and the cards around it never shared the same rhythm.

A shelf is only kept as a horizontal row on TV. On phone and tablet it is
flattened into the vertical feed under its own title, which is the layout the
plan asks for there — a phone feed of horizontal rows cuts every card off at
the right edge. Shelves of shorts are the exception and stay horizontal on
every surface, because a portrait card at full feed width would push the rest
of the feed off the screen.

`useFeedGeometry` measures the list instead of the window. The measured width
already accounts for the navigation rail, the safe areas, and a split layout,
and it does not change while the TV content plane is translated, so column
count and card size stay stable when the rail expands.

## Feed states

`MediaFeed` (one stream) and `MediaSectionFeed` (grouped by section, used by
history) own the states:

- **Initial load:** card skeletons in the real geometry, never a lone spinner.
- **Pagination:** a footer loader; existing content is never replaced. The
  `useFeedPagination` guard drops the repeated `onEndReached` calls that fire
  while the end of the list stays visible.
- **Refresh:** pull-to-refresh on touch, a focusable refresh action on TV,
  because a remote cannot pull.
- **Empty and error:** the shared `EmptyState` and `ErrorState`, with a retry
  action wired to the feed's own refresh.
- **Image error:** the card falls back to a themed placeholder with an icon.

The feed hooks report `loading`, `error`, `refresh`, and `refreshing` so those
states are real instead of inferred from an empty list.

## Migrated surfaces

| Surface               | Screen                                           |
| --------------------- | ------------------------------------------------ |
| Home, phone/tablet/TV | `src/screens/HomeScreen.tsx`                     |
| Subscriptions         | `src/screens/SubscriptionScreen.tsx`             |
| History, phone        | `src/components/screens/phone/HistoryScreen.tsx` |
| History, TV           | `src/screens/tv/HistoryScreen.tsx`               |
| Search results        | `src/components/search/SearchResultFeed.tsx`     |
| Library, TV           | `src/screens/LibraryScreenTV.tsx`                |
| Playlists, TV         | `src/screens/tv/PlaylistsScreen.tsx`             |
| My YouTube, TV        | `src/screens/MyYoutubeScreenTV.tsx`              |

The TV library, playlists, and My YouTube screens are Phase 5 surfaces, but
they shared the old grid with the feeds above, so their cards moved with it.
Their headers and section structure are still the old ones.

## Deliberate deviations

- The touch card supports an overflow action but no surface passes one yet.
  Phone and tablet have no context menu route; `VideoMenuContext` is registered
  for TV only. The menu arrives with the dialog and sheet work in Phase 5. On
  TV, a long select opens the existing menu as before.
- The "see all" shelf action exists in `Shelf` but is unused until a surface
  has a target for it.
- The old feed and card components (`src/components/grid/`,
  `src/components/elements/`, `src/components/GridView.tsx`,
  `src/components/segments/`, `TVRefreshButton`) are still in the tree. They
  serve the video detail, channel, and playlist surfaces, which migrate in
  Phase 4 and Phase 5; the plan removes unused components in Phase 8.
- Search suggestions and the search entry field keep their current look. Phase
  3 covers search results.

## Verification

- `npm test` covers the card view model in English and German, the feed
  metrics, the card width, and the row and section grouping.
- `npm run lint`, `npm run typecheck`, and `npx prettier --check` are clean for
  the changed files.
- `tsconfig.json` now sets `allowImportingTsExtensions`. The pure modules under
  `src/ui/patterns/` import their neighbours with an explicit `.ts` extension,
  which the Node test runner needs and Metro resolves unchanged.

### Manual checks

Not automatable in this project yet, so they are part of the review:

1. Phone home: pull to refresh, scroll to the end, and confirm the footer
   loader appears without the feed jumping.
2. Phone home at 200% text size: card titles stay at two lines and the feed
   stays scrollable.
3. Tablet at both orientations: the column count changes, the card width fills
   the row, and the last row stays aligned.
4. TV home: D-pad through a row, open the rail from the leftmost card, expand
   it, and confirm the card size and column count do not change.
5. TV home with Reduced Motion: focus stays visible through the outline only.
6. Offline: the feed shows the error state with a working retry action.
