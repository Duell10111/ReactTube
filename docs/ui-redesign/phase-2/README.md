# Phase 2: App shell and navigation

Phase 2 replaces the navigation shell on every touch and TV surface. Screens
keep their current content; only the frame around them changes, so each screen
can be migrated independently in Phase 3 and later.

## Phone and tablet

The main navigation is reduced to five stable destinations that never change
shape between signed in and signed out users:

1. Home
2. Subscriptions
3. Music
4. Downloads
5. You

`Subscriptions` stays visible without an account and explains the sign-in
requirement instead of disappearing. `You` is the new personal surface and
collects account, history, library, music library, active transfers, and
settings, which previously occupied their own tab slots.

Search is a global header action instead of a destination. The global header is
`src/ui/patterns/AppHeader.tsx`: it shows the app name on Home, the screen title
everywhere else, and the search and account actions.

Tablets keep the same bottom navigation. `getNavigationMode` returns
`bottomTabs` for every touch layout, so the destinations sit in one place
across devices and stay within thumb reach on a large display. The extra width
of a tablet goes into content: more feed columns and a taller header, not into
permanent navigation chrome.

A leading navigation rail was tried first and dropped. React Navigation turns a
side tab bar into a Material navigation drawer with a minimum width of 360 as
soon as the labels sit beside the icons, which it does on tablet widths. That
width overrode the shell's own rail measurement and took about a third of the
screen. Labels below the icon would have kept it compact, but the pattern was
not worth a second navigation shape to maintain.

## One chrome system

`src/ui/layout/appShell.ts` is the single source for the shell measurements:

| Value                                          | Used by                                     |
| ---------------------------------------------- | ------------------------------------------- |
| `getNavigationMode(layout)`                    | bottom tabs, tablet rail, TV rail selection |
| `compactHeaderHeight` / `expandedHeaderHeight` | `AppHeader`                                 |
| `miniPlayerHeight`                             | `MusicBottomPlayerBar`                      |
| `appStatusBarStyle`                            | `App.tsx` status bar                        |
| `tvRailMetrics`                                | TV rail and content plane                   |

`useAppChrome()` combines those values with the safe area insets, the window
width, and the current mini player state. The mini player sits directly above
the bottom navigation in compact layouts and floats above the content next to
the rail in wider layouts; both positions come from the same calculation.

## TV rail

The rail in `src/navigation/tv/` replaces the previous drawer and is the only
main navigation on TV.

- **Collapsed (96):** icons plus the selection indicator of the active
  destination.
- **Expanded (320):** icon and label, entered as soon as focus moves into the
  rail.
- **Hidden (0):** a screen can hide the rail through the drawer context. A
  left press restores it, and a route change resets it, so focus can never get
  stuck in the content.
- **Selected and focused are separate:** selection is a brand indicator plus a
  raised surface and stays visible while collapsed; focus adds the high-contrast
  outline and reserves its border space in every state.

The content plane keeps the width `screenWidth - 96` in every state and is only
translated: `0` while collapsed, `+224` while expanded, `-96` while hidden. The
rail therefore pushes the content instead of overlapping it, and column count,
card size, line breaks, and scroll position stay unchanged. The previous drawer
animated its own width inside a flex row, which re-laid out the whole screen.

Focus memory is handled by the rail's focus guide: the last focused destination
is remembered and used as the focus destination when focus returns to the rail.

### Focus guides only around the rail

The content plane deliberately has no `TVFocusGuideView`. `RCTTVView` installs a
`UIFocusGuide` that spans the whole view, and a guide is the only candidate as
soon as the focus search finds no real focusable item in that direction. A guide
around the content therefore swallows exactly the press that should open the
rail: at the left edge of the feed there is no card further left, so the guide
redirects the focus back into the content.

For the same reason a rail destination never reaches into the content plane.
The rail content and its items inherit the animated rail width instead of using
a fixed expanded width with a clipped container, so every focusable frame stays
inside the visible rail.

Restoring the focus position inside the content stays the responsibility of the
individual screens, as before.

### Documented deviations

- The plan's Phase 2 checklist asks for an overlay rail that does not move the
  content. The detailed TV section and the Phase 0 acceptance criteria require
  the opposite — the content plane is translated by exactly the rail growth.
  The implementation follows the detailed specification, and the checklist
  entry in `docs/UI_YOUTUBE_REDESIGN_PLAN.md` was corrected.
- The TV rail keeps History, Library, and My YouTube as separate destinations
  instead of a single `You` entry, because TV has no personal hub screen yet.
  It is created with the TV library migration in Phase 5. No destination that
  existed before is unreachable.
- The plan lists Music on the TV rail. There is no TV music surface yet, so the
  destination is added together with the music migration in Phase 5.

## Verification

- `npm test` covers the destination set, the navigation mode per layout class,
  the TV rail geometry, the chrome layout, and the active route resolution.
- TV focus behavior is verified manually with
  [the focus matrix](./FOCUS_MATRIX.md).
