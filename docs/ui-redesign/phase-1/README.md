# Phase 1: Theme, localization, and UI primitives

Phase 1 connects the tokens selected in Phase 0 to the production provider
tree. The legacy `useAppStyle` API remains available as an adapter while screens
move to `useAppTheme` incrementally.

## Integrated foundation

- `ThemeProvider` exposes semantic colors, spacing, radii, motion, and the
  platform typography scale.
- React Navigation and React Native Paper use mappings from the same dark theme.
- Reduced Motion is read from the operating system and updates while the app is
  running.
- `uiLanguage` is persisted separately from `languageSelected`, which continues
  to control the language of YouTube content.
- English is the fallback UI language. English and German resource files share
  a typed key set.
- The app language can be changed in Settings without restarting the app.

## UI primitives

The reusable components are exported from `src/ui/components/`:

- `AppText`
- `AppButton`
- `AppIconButton`
- `Chip`
- `Divider`
- `Screen`
- `Skeleton`
- `EmptyState`
- `ErrorState`

Interactive primitives reserve at least a 48 by 48 point target and expose
pressed, focused, selected, disabled, loading, and accessibility states where
applicable. Text scaling remains enabled. Skeleton animation becomes static
when Reduced Motion is active.

## Run the demo

Removed. The primitives demo app and the `EXPO_PUBLIC_UI_PRIMITIVES_DEMO` switch
in `index.js` were deleted after the primitives were adopted across the app. The
primitives themselves live in `src/ui/components/`, and `test/ui-theme.test.mjs`
plus `test/ui-localization.test.mjs` cover the token and language behaviour the
demo used to demonstrate.
