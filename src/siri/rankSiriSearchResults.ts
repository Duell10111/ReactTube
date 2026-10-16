/** A search result reduced to what ranking needs. */
export interface SiriSearchCandidate {
  title: string;
  artists: string[];
  type: "song" | "video" | "album" | "artist" | "playlist" | "unknown";
}

export interface SiriRankQuery {
  title: string;
  artist?: string;
}

/**
 * Versions people rarely mean when they just say a title. They only count
 * against a result when the spoken query does not ask for them.
 */
const UNWANTED_VERSIONS = [
  "cover",
  "karaoke",
  "instrumental",
  "remix",
  "live",
  "sped up",
  "slowed",
  "nightcore",
  "8d",
  "tribute",
  "in the style of",
  "originally performed",
];

export function normalizeForMatch(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      // Bracketed additions: "(Remastered 2011)", "[Official Video]", "(feat. X)".
      .replace(/[([{][^)\]}]*[)\]}]/g, " ")
      .replace(/\s(?:feat|ft|featuring)\.?\s.*$/, " ")
      // Suffixes after a dash: "Song - Remastered 2011", "Song - Live".
      .replace(/\s[-–—]\s.*$/, " ")
      .replace(/&/g, " and ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
  );
}

function tokens(value: string) {
  return normalizeForMatch(value).split(" ").filter(Boolean);
}

function titleScore(query: string, candidate: string) {
  const q = normalizeForMatch(query);
  const c = normalizeForMatch(candidate);
  if (!q || !c) {
    return 0;
  }
  if (q === c) {
    return 100;
  }
  if (c.startsWith(`${q} `) || q.startsWith(`${c} `)) {
    return 60;
  }
  const queryTokens = tokens(query);
  const candidateTokens = new Set(tokens(candidate));
  const matched = queryTokens.filter(t => candidateTokens.has(t)).length;
  if (matched === queryTokens.length) {
    return 40;
  }
  return Math.round((matched / queryTokens.length) * 30);
}

function artistScore(query: string | undefined, artists: string[]) {
  if (!query) {
    return 0;
  }
  const q = normalizeForMatch(query);
  const matches = artists.some(artist => {
    const a = normalizeForMatch(artist);
    return a === q || a.includes(q) || q.includes(a);
  });
  return matches ? 50 : -20;
}

function versionPenalty(query: SiriRankQuery, candidate: SiriSearchCandidate) {
  const asked = ` ${normalizeForMatch(`${query.title} ${query.artist ?? ""}`)} `;
  const offered = ` ${[candidate.title, ...candidate.artists]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return UNWANTED_VERSIONS.filter(
    word => offered.includes(` ${word} `) && !asked.includes(` ${word} `),
  ).length;
}

export function scoreSiriCandidate(
  query: SiriRankQuery,
  candidate: SiriSearchCandidate,
) {
  return (
    titleScore(query.title, candidate.title) +
    artistScore(query.artist, candidate.artists) -
    versionPenalty(query, candidate) * 40 +
    (candidate.type === "song" ? 10 : 0)
  );
}

/**
 * Picks the result that best matches what was spoken. YouTube's own order
 * breaks ties, so a result is only skipped when another one clearly fits
 * better. Returns -1 for an empty list.
 */
export function rankSiriSearchResults(
  query: SiriRankQuery,
  candidates: SiriSearchCandidate[],
) {
  let bestIndex = -1;
  let bestScore = -Infinity;
  candidates.forEach((candidate, index) => {
    // A small malus per position keeps YouTube's order among equal matches.
    const score = scoreSiriCandidate(query, candidate) - index;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}
