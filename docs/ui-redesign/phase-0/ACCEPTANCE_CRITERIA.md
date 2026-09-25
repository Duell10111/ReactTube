# Measurable acceptance criteria

These criteria are the review contract for the selected Phase 0 direction. A
surface migration must satisfy the applicable rows before its old implementation
is removed.

| Area           | Criterion                                                      | Measurement                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme          | Product colors come from semantic roles                        | No direct product hex, RGB, or named colors in a migrated component                                                                                                              |
| Contrast       | Primary and secondary text remain readable                     | WCAG AA: 4.5:1 for normal text, 3:1 for large text and non-text focus indicators                                                                                                 |
| Touch          | Every standalone interactive target is reachable               | Minimum rendered target is 48×48 logical points                                                                                                                                  |
| Typography     | Titles and metadata have deterministic limits                  | Card title ≤2 lines; metadata ≤2 lines; labels remain one line                                                                                                                   |
| Layout         | Content is not clipped at supported widths                     | No horizontal overflow at 320 points; no overlap through 1280-point touch layouts                                                                                                |
| Media          | Feed imagery remains visually primary                          | 16:9 thumbnail occupies at least the full card width in the primary feed                                                                                                         |
| Loading        | Initial and incremental loading are distinct                   | Initial load reserves card geometry; pagination never replaces existing content                                                                                                  |
| State          | Empty, offline, API error, and image error are distinguishable | Each has a unique message/action pair and is included in the screenshot matrix                                                                                                   |
| Motion         | Motion explains focus or transition                            | Focus animation ≤200 ms; reduced-motion mode removes scale and nonessential transitions                                                                                          |
| TV focus       | Focus is visible and stable                                    | ≥3-point high-contrast outline; no neighboring card changes position on focus/blur                                                                                               |
| TV navigation  | The rail stays the only TV main navigation                     | Collapsed rail shows the selected destination; expanding it translates the content plane by exactly the rail growth, with unchanged column count, card size, and scroll position |
| TV remote      | Core actions need no touch input                               | Home, open video, play/pause, back, and navigation rail are D-pad operable                                                                                                       |
| Accessibility  | Controls expose purpose and state                              | Icon-only controls have labels; selected, disabled, and busy states are announced                                                                                                |
| Dynamic type   | User text scaling remains usable                               | At 200% text, primary actions remain visible and content remains scrollable                                                                                                      |
| Localization   | Layout supports English and German                             | No clipped action label in either locale; dynamic sentences use interpolation                                                                                                    |
| Reference flow | Navigation preserves context                                   | `Home -> Video -> Back` returns to the same feed position and focus target                                                                                                       |
| Performance    | Feed interaction stays responsive                              | No JS frame longer than 100 ms during a five-card scroll/focus sample on target hardware                                                                                         |

## Phase 0 decision record

- Variant A is selected because it gives media the largest uninterrupted area
  and uses fewer persistent surfaces.
- Variant B is retained only as executable comparison evidence during the spike.
- Dark mode is the only finalized color scheme in Phase 0.
- English spike copy is centralized in one file; Phase 1 replaces it with the
  typed English/German localization boundary.
- Production providers, navigation structure, and current screens remain
  unchanged until Phase 1 and Phase 2 respectively.
