/**
 * Spread onto every `@gorhom/bottom-sheet` sheet. The library makes the whole
 * sheet one adjustable accessibility element by default, which hides its rows
 * from VoiceOver and TalkBack. Null drops those defaults instead of overriding
 * them, so each row stays reachable on its own.
 */
export const sheetAccessibilityProps = {
  accessible: null,
  accessibilityLabel: null,
  accessibilityRole: null,
} as const;
