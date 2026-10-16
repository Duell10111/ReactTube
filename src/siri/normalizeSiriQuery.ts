/**
 * Siri often keeps the app name in the recognized media name, e.g.
 * "Bohemian Rhapsody in React Tube", "Paparazzi von React Tube" or, misheard,
 * "Take On Me in the Tube". Searching with that suffix returns covers or
 * unrelated tracks, so strip it.
 */
const CONNECTORS = String.raw`in|von|auf|mit|bei|über|ueber|on|from|with|using`;
const ARTICLE = String.raw`(?:(?:der|die|the)\s+)?`;
const APP_SUFFIX = String.raw`(?:\s+app)?\s*$`;

const TRAILING_APP_NAME = new RegExp(
  String.raw`\s*(?:\b(?:${CONNECTORS})\s+)?${ARTICLE}react\s*tube${APP_SUFFIX}`,
  "i",
);
// "Tube" without "React" only counts with a connector in front, so a title
// that merely ends in "Tube" stays intact.
const TRAILING_MISHEARD_APP_NAME = new RegExp(
  String.raw`\s+\b(?:${CONNECTORS})\s+${ARTICLE}tube${APP_SUFFIX}`,
  "i",
);

export function normalizeSiriQuery(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const normalized = value
    .replace(TRAILING_APP_NAME, "")
    .replace(TRAILING_MISHEARD_APP_NAME, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || undefined;
}
