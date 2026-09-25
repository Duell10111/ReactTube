# TV focus graph

One row per screen: which focus regions it declares, where focus lands when the
screen opens, and where a move out of the content goes. A region is a
`TVFocusRegion` (a `TVFocusGuideView` on TV): it claims focus on the first visit
and hands it back to the child that had it on every later one.

Run this with the remote only. No step may use a pointer.

## Shell

| Region            | Owner                               | Initial focus                        |
| ----------------- | ----------------------------------- | ------------------------------------ |
| Rail destinations | `TVNavigationRailShell`             | the destination last left, else Home |
| Content plane     | whatever the active screen declares | see below                            |

Left from the content enters the rail; right from the rail returns to the
content. The rail is chrome at the screen edge: it keeps half the horizontal
overscan margin and all of the vertical one, so a crop can never take a whole
destination.

## Screens

| Screen           | Regions                              | Initial focus       | Left from content | Notes                                                    |
| ---------------- | ------------------------------------ | ------------------- | ----------------- | -------------------------------------------------------- |
| Home             | feed                                 | first card          | rail              | each shelf is a region of its own inside the feed        |
| Subscriptions    | feed                                 | first card          | rail              |                                                          |
| History          | feed                                 | first card          | rail              | the date titles are headers, not focus targets           |
| Library          | feed                                 | first header action | rail              | the header row scrolls with the feed, inside its region  |
| Playlists        | feed                                 | first card          | rail              |                                                          |
| Playlist detail  | feed                                 | first hero action   | rail              | the hero is the feed header, inside the feed's region    |
| My YouTube       | tab column, feed                     | first card          | tab column        | left from the feed reaches the tabs, then the rail       |
| Channel          | tab row, feed                        | first card          | rail              | up from the feed lands on the open tab                   |
| Search           | native search bar, results feed      | the search bar      | rail              | the bar is a platform view and owns its own focus        |
| Settings         | settings list                        | first entry         | rail              | one list, so the screen needs no region of its own       |
| Login            | account list                         | first account       | rail              | one list, so the screen needs no region of its own       |
| Video player     | seek bar, metadata row, bottom panel | seek bar when shown | —                 | the rail is hidden; the overlay owns every move          |
| Video side panel | header row, tab row, panel content   | close button        | —                 | opens over the player; the video keeps playing beside it |
| End card         | next video, related row              | next video          | —                 | modal over the player                                    |

## Checks

| #   | Start state                             | Input      | Expected result                                                                 |
| --- | --------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| 1   | Any screen, just opened                 | Down       | Focus is already inside the content; the first press moves, it does not seek    |
| 2   | Feed, card in the last visible row      | Down       | The next row is reached; focus never stops at the bottom of the window          |
| 3   | Feed scrolled far down                  | Rail, Back | The feed returns with its scroll position and the card that was focused         |
| 4   | Shelf, card 20 of 100                   | Right ×5   | Focus keeps moving; the shelf pages without losing the focused card             |
| 5   | Shelf left at card 20, focus moved away | Down, Up   | Re-entering the shelf lands on card 20, not on card 1                           |
| 6   | My YouTube, focus in the grid           | Left       | The tab column takes focus on the open tab; Left again enters the rail          |
| 7   | Video player, controls hidden           | Any        | Controls appear and the seek bar takes focus                                    |
| 8   | Video player                            | Info       | The side panel opens with the close button focused, the video keeps playing     |
| 9   | Side panel, focus on a tab              | Up         | Focus reaches the close button, not the empty space beside the title            |
| 10  | Side panel open                         | Left       | Focus stays inside the panel; no player control behind it can be reached        |
| 11  | Side panel                              | Close      | Focus returns to the player controls, not to nothing                            |
| 12  | End card visible                        | Up / Down  | Focus moves between the next video and the related row; nothing lands behind it |
| 13  | Any screen, Reduced Motion on           | Move focus | The focused element is identifiable by its outline alone                        |

Record deviations with device, OS version, and step number.
