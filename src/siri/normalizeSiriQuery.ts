/**
 * Siri often keeps the app name in the recognized media name, e.g.
 * "Bohemian Rhapsody in React Tube", "Paparazzi von React Tube" or, misheard,
 * "Take On Me in the Tube". Searching with that suffix returns covers or
 * unrelated tracks, so strip it. "Spiele ReactTube" even arrives as the media
 * name "Red Tube", which then has to count as an empty request.
 */
// German Siri hears "ReactTube" as "Red Tube" and similar.
const APP_NAME = String.raw`(?:react|red|rec|wreck|rack)\s*tube`;
const CONNECTORS = String.raw`in|von|auf|mit|bei|über|ueber|on|from|with|using`;
const ARTICLE = String.raw`(?:(?:der|die|the)\s+)?`;
const APP_SUFFIX = String.raw`(?:\s+app)?\s*$`;

const TRAILING_APP_NAME = new RegExp(
  String.raw`\s*(?:\b(?:${CONNECTORS})\s+)?${ARTICLE}\b${APP_NAME}${APP_SUFFIX}`,
  "i",
);
// "Tube" without "React" only counts with a connector in front, so a title
// that merely ends in "Tube" stays intact.
const TRAILING_MISHEARD_APP_NAME = new RegExp(
  String.raw`\s+\b(?:${CONNECTORS})\s+${ARTICLE}tube${APP_SUFFIX}`,
  "i",
);

// "in ReactTube" heard as one word: "Indirect Tube", "in direct Tube".
const TRAILING_FUSED_APP_NAME = new RegExp(
  String.raw`\s+in\s*(?:direct|rect)\s+tube${APP_SUFFIX}`,
  "i",
);

export function normalizeSiriQuery(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const normalized = value
    .replace(TRAILING_APP_NAME, "")
    .replace(TRAILING_MISHEARD_APP_NAME, "")
    .replace(TRAILING_FUSED_APP_NAME, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || undefined;
}
