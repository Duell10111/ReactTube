# Screenshot matrix

The screenshot suite uses stable fixtures and filenames. Captures should be PNG,
with animations disabled and the system font scale recorded beside any
non-default run. Account names, tokens, and real watch history must never appear
in committed images.

## Baseline inventory

Before migrating a surface, capture the current production UI and the selected
spike direction at the same logical size. The minimum inventory is:

| Surface        | Compact phone | Large phone | Tablet portrait | Tablet landscape | Apple TV | Android TV |
| -------------- | ------------- | ----------- | --------------- | ---------------- | -------- | ---------- |
| Home           | Required      | Required    | Required        | Required         | Required | Required   |
| Search         | Required      | Required    | Required        | Required         | Required | Required   |
| Video detail   | Required      | Required    | Required        | Required         | Required | Required   |
| Channel        | Required      | Required    | Required        | Required         | Required | Required   |
| Music          | Required      | Required    | Required        | Required         | Required | Required   |
| You / Settings | Required      | Required    | Required        | Required         | Required | Required   |
| Error          | Required      | Required    | Required        | Required         | Required | Required   |

The Watch baseline adds Home, Library, Now Playing, Downloads, Settings, and an
error state at one small and one large supported watch size.

## Phase 0 spike captures

Capture both variants before later phases remove the comparison:

| ID      |  Viewport | Variant | State              | Reference                                             |
| ------- | --------: | ------- | ------------------ | ----------------------------------------------------- |
| `P0-01` |   402×874 | A       | Home               | [Captured](./screenshots/spike-phone-a-home.png)      |
| `P0-02` |   402×874 | A       | Video              | [Captured](./screenshots/spike-phone-a-video.png)     |
| `P0-03` |   402×874 | B       | Home               | [Captured](./screenshots/spike-phone-b-home.png)      |
| `P0-04` |  834×1210 | A       | Home               | [Captured](./screenshots/spike-tablet-a-home.png)     |
| `P0-05` |  1024×768 | A       | Home               | Capture during the Phase 2 adaptive-navigation review |
| `P0-06` | 1920×1080 | A       | First card focused | [Captured](./screenshots/spike-tv-a-focus.png)        |
| `P0-07` | 1920×1080 | B       | First card focused | [Captured](./screenshots/spike-tv-b-focus.png)        |

Captures are stored under `docs/ui-redesign/phase-0/screenshots/`. A capture is valid
only when its matching acceptance rows are recorded as passing in the pull
request or review notes. The repository does not treat images generated on a
single development machine as golden snapshots; automated visual-diff tolerances
are introduced only after simulator rendering is stable.

## Naming for migration captures

Use `<phase>-<surface>-<platform>-<size>-<state>.png`, for example
`p3-home-ios-393x852-loading.png`. State suffixes are `default`, `loading`,
`pagination`, `empty`, `offline`, `error`, `focused`, `large-text`, `en`, and
`de`. This keeps later comparisons sortable and makes missing state coverage
visible in review.
