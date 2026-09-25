# Device and breakpoint matrix

ReactTube classifies touch layouts by logical viewport width. TV is selected by
the platform rather than inferred from pixels, because a 1080p or 4K framebuffer
does not describe viewing distance or remote interaction.

| Layout class |       Logical width |   Feed columns | Navigation                            | Primary validation sizes           |
| ------------ | ------------------: | -------------: | ------------------------------------- | ---------------------------------- |
| Compact      |             `0–599` |              1 | Bottom bar                            | 320×568, 360×800, 393×852, 430×932 |
| Medium       |          `600–1023` |              2 | Bottom bar; rail evaluated in Phase 2 | 768×1024, 800×1280, 834×1194       |
| Expanded     |             `1024+` |              3 | Rail/split view evaluated in Phase 2  | 1024×1366, 1280×800                |
| TV           | Platform reports TV | 4 in the spike | Remote-focused rail in Phase 2        | 1280×720, 1920×1080, 3840×2160     |

Both portrait and landscape are required for the medium and expanded touch
classes. Layout code must react to the current viewport rather than cached device
type. Safe-area insets reduce usable content width but do not change the layout
class.

## Watch validation sizes

Watch does not reuse these breakpoints. Phase 7 validates at least a 40/41 mm
and a 44/45/46 mm Apple Watch canvas and retains native SwiftUI layout behavior.

## Interaction dimensions

- Touch and remote controls reserve at least 48×48 logical points.
- Phone media uses 16:9 thumbnails and a 12 point radius.
- Panels use a 16 point radius; compact controls use 8 points.
- TV cards reserve a transparent three-point border before focus so focus does
  not reflow a shelf.
- Overscan-safe TV insets begin at 48 points in the spike and are revalidated
  with the navigation rail in Phase 2.

The executable values are defined in `src/ui/theme/breakpoints.ts`,
`spacing.ts`, and `radii.ts`.
