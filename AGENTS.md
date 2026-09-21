# ReactTube Agent Guide

## Project overview

ReactTube is an ad-free YouTube client built with Expo, React Native, TypeScript,
and `react-native-tvos`. It targets phones, tablets, Apple TV/Android TV, and an
experimental native Apple Watch companion. It uses the published fork
`@duell10111/youtubei.js` (aliased to `youtubei.js`) for YouTube API access. To
work against a local checkout of that library instead, follow
`docs/YOUTUBEI_JS_LOCAL_DEVELOPMENT.md` — and switch back to the published
version before merging.

The app currently supports video and music playback, account-backed YouTube
features, local playlists/history, downloads, and watch synchronization. Treat
phone, TV, and watch behavior as distinct surfaces even when they share data or
business logic.

## Repository structure

- `App.tsx` and `index.js`: application entry point and top-level providers.
- `src/navigation/`: root, settings, drawer, and tab navigation plus route types.
- `src/screens/`: shared screens and platform-specific `phone/` and `tv/`
  screens.
- `src/components/`: reusable UI grouped by feature; several features also have
  `phone/` and `tv/` implementations.
- `src/hooks/`: data loading, screen orchestration, playback, downloads, and
  feature hooks. Prefer keeping business logic here instead of in views.
- `src/context/`: shared application, account, player, downloader, playlist,
  style, and YouTube state.
- `src/extraction/`: conversion of `youtubei.js` responses into app-facing data.
- `src/utils/`: settings, YouTube/session access, playback resolution, logging,
  and shared utilities.
- `src/downloader/`: download persistence, Drizzle schema, and SQLite migrations.
- `src/ytjs/`: React Native compatibility code for `youtubei.js`.
- `targets/watch/`: native Swift/SwiftUI Apple Watch target.
- `test/`: Node test-runner tests.
- `maestro/`: end-to-end device flows.
- `patches/`: `patch-package` changes reapplied by `postinstall`.
- `assets/`: app, platform, and player assets.

Platform files follow React Native resolution conventions such as `.tv.tsx` and
`.ios.tsx`. Before changing shared behavior, look for a platform-specific sibling
and keep the variants aligned where appropriate. Do not edit generated `android/`,
`ios/`, `.expo/`, dependency, or build output unless the task explicitly concerns
generated native code.

## Development conventions

- Use npm, not Yarn. Install dependencies with
  `npm install --legacy-peer-deps` when installation is required.
- Use TypeScript for new application code and preserve the existing strict-null
  assumptions in `tsconfig.json`.
- Prefer the `@/` alias for imports from `src/`; follow the surrounding file when
  nearby imports are intentionally relative.
- Keep components focused on presentation. Put reusable data access and feature
  logic in hooks, contexts, extraction modules, or utilities as appropriate.
- Preserve TV remote/focus behavior, phone touch behavior, and native watch
  behavior. A successful change on one surface is not proof that the others work.
- Keep dependency patches in `patches/`; do not make an important fix only inside
  `node_modules/`.
- Never commit a `file:` dependency. `youtubei.js` in particular must always be
  the published `npm:@duell10111/youtubei.js@<version>` on `main`; see
  `docs/YOUTUBEI_JS_LOCAL_DEVELOPMENT.md`.
- Add or update tests for changed pure logic and regression-prone behavior.

## Code language and comments

All source-code comments must be in English. This includes inline comments,
block comments, JSDoc, TODO/FIXME notes, test comments, and comments in TypeScript,
JavaScript, Swift, shell, configuration, and migration files.

- Write new comments in clear English.
- When editing code near an existing non-English comment, translate that comment
  to English while preserving its technical meaning.
- Before finishing, review every added or modified comment and confirm that it is
  English. Also translate any non-English source comment encountered in the
  directly modified files when it is safe to do so.
- Comments should explain intent, constraints, or non-obvious tradeoffs. Do not
  narrate code that is already self-explanatory.
- This English-only rule applies to code and developer-facing identifiers. It does
  not mean that visible UI copy must always be English; UI copy belongs in the
  localization system described below.

## UI localization

The UI is intended to support English (`en`) and German (`de`) and must allow the
user to choose the UI language in the app. English is the fallback locale.

The existing `AppSettings.languageSelected`, `src/utils/YTLanguages.ts`, and
language selector currently control the language sent to YouTube. That is a
content/API preference, not yet a UI locale. Do not silently reuse that setting
for UI translations. When adding UI localization:

- Introduce a separate persisted setting with an explicit name such as
  `uiLanguage` or `appLocale`.
- Keep the YouTube content language separately named and presented. If the
  settings UI contains both options, label their purpose unambiguously.
- Add one centralized localization boundary (for example `src/localization/`)
  with matching `en` and `de` resources and a typed translation API or hook.
- Keep the same translation keys in both locales. Use stable semantic keys, not
  full English sentences as keys.
- Replace hard-coded user-facing strings in the scope being changed with
  translation keys. This includes screen titles, buttons, settings labels,
  empty/error states, dialogs, toasts, and accessibility labels.
- Do not translate API-provided titles, channel names, video metadata, logs,
  internal error details, route names, or developer diagnostics.
- Use interpolation and locale-aware formatting for dynamic values; do not build
  translated sentences by concatenating fragments.
- Persist an explicit user selection and apply language changes without requiring
  an app restart where practical.
- New UI features must provide both English and German strings once the
  localization layer exists. Until that layer is introduced, group new visible
  copy so it can be migrated centrally rather than scattering it through logic.

## Formatting and quality gates

The repository's ESLint and Prettier configurations are authoritative. Do not
manually restyle unrelated code or replace repository formatting rules with
personal preferences.

For every code change:

1. Format all changed Prettier-supported files with
   `npx prettier --write <changed-files>`.
2. Confirm formatting with `npx prettier --check <changed-files>`.
3. Run `npm run lint` and fix all warnings or errors introduced by the change.
4. Run `npm run typecheck` and fix all TypeScript errors introduced by the change.
5. Run `npm test`; add focused checks when the changed behavior is not covered by
   the current suite.

Never report the task complete with known lint, formatting, type-check, or test
failures caused by the change. If a full-project check fails only because of a
pre-existing problem, verify the changed files separately and clearly report the
unrelated failure with the relevant file and command output.

For Swift/watch-only changes, use the available Xcode build or targeted test when
the environment supports it, and still run the JavaScript/TypeScript checks if
shared code or configuration changed.

## Completion checklist

Before handing off a change, confirm that:

- the implementation respects shared, phone, TV, iOS, and watch boundaries;
- all added or modified source comments are English;
- user-facing copy is ready for, or uses, the English/German localization layer;
- changed files pass Prettier and ESLint;
- TypeScript and relevant tests pass; and
- no generated output, secrets, local IDE files, or unrelated user changes were
  included.
