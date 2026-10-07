/**
 * Appends a page of playlists and drops the ones already listed.
 *
 * The TV client's playlist continuation repeats entries from earlier pages
 * (Liked videos, Watch later, and the first playlists come back with every
 * page). Kept as duplicates, they share an id and with it a list key.
 */
export function appendUniqueById<T extends {id: string}>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  const seen = new Set(existing.map(item => item.id));
  const result = [...existing];

  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }

  return result;
}
