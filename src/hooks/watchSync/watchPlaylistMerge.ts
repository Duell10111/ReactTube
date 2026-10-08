/**
 * Pure helpers for playlists linked between the phone and the Apple Watch.
 * Both sides always exchange the complete ordered list of video ids; changes
 * are reconciled with a three-way merge against the last synced state.
 */

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

export function sameOrder(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** True if the elements both lists share appear in a different order. */
function isReordered(base: readonly string[], list: readonly string[]) {
  const baseSet = new Set(base);
  const listSet = new Set(list);
  return !sameOrder(
    base.filter(id => listSet.has(id)),
    list.filter(id => baseSet.has(id)),
  );
}

/**
 * Merges the phone and watch versions of a linked playlist.
 *
 * - Added on either side compared to `base`: kept.
 * - Removed on either side compared to `base`: removed.
 * - Order: the phone's, unless only the watch reordered. Titles only the other
 *   side has are inserted after their nearest predecessor from that side's
 *   list, or at the start if they come first there.
 */
export function mergePlaylist(
  base: readonly string[],
  phone: readonly string[],
  watch: readonly string[],
): string[] {
  const baseList = unique(base);
  const phoneList = unique(phone);
  const watchList = unique(watch);
  const phoneSet = new Set(phoneList);
  const watchSet = new Set(watchList);

  const removed = new Set(
    baseList.filter(id => !phoneSet.has(id) || !watchSet.has(id)),
  );

  const watchLeads =
    !isReordered(baseList, phoneList) && isReordered(baseList, watchList);
  const primary = watchLeads ? watchList : phoneList;
  const secondary = watchLeads ? phoneList : watchList;

  const result = primary.filter(id => !removed.has(id));
  const included = new Set(result);

  secondary.forEach((id, index) => {
    if (included.has(id) || removed.has(id)) {
      return;
    }
    let insertAt = 0;
    for (let previous = index - 1; previous >= 0; previous -= 1) {
      const position = result.indexOf(secondary[previous]);
      if (position >= 0) {
        insertAt = position + 1;
        break;
      }
    }
    result.splice(insertAt, 0, id);
    included.add(id);
  });

  return result;
}

export interface PlaylistMove {
  videoId: string;
  /** The video is moved directly behind this one. */
  predecessorId: string;
}

/**
 * Indices (into `values`) of one longest strictly increasing subsequence.
 * O(n log n) patience sorting with back pointers.
 */
function longestIncreasingSubsequence(values: readonly number[]): number[] {
  const tails: number[] = [];
  const previous: number[] = new Array(values.length).fill(-1);
  values.forEach((value, index) => {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (values[tails[middle]] < value) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    previous[index] = low > 0 ? tails[low - 1] : -1;
    tails[low] = index;
  });
  const result: number[] = [];
  for (
    let index = tails.length > 0 ? tails[tails.length - 1] : -1;
    index >= 0;
    index = previous[index]
  ) {
    result.unshift(index);
  }
  return result;
}

/**
 * Plans the "move after" operations YouTube supports to turn `current` into
 * `target`; both lists must contain the same ids. The longest run of titles
 * that already has the target order stays in place, everything else is moved
 * behind its target predecessor in target order. YouTube cannot move a title
 * to the front, so the first target title always stays and titles in front of
 * it are moved behind it.
 */
export function planPlaylistMoves(
  current: readonly string[],
  target: readonly string[],
): PlaylistMove[] {
  const targetList = unique(target);
  if (targetList.length < 2) {
    return [];
  }
  const targetIndex = new Map(targetList.map((id, index) => [id, index]));
  const list = unique(current).filter(id => targetIndex.has(id));
  const firstPosition = list.indexOf(targetList[0]);
  if (firstPosition < 0) {
    return [];
  }

  const candidates = list.slice(firstPosition + 1);
  const fixed = new Set<string>([targetList[0]]);
  longestIncreasingSubsequence(
    candidates.map(id => targetIndex.get(id) ?? 0),
  ).forEach(index => fixed.add(candidates[index]));

  return targetList
    .slice(1)
    .map((videoId, index) => ({videoId, predecessorId: targetList[index]}))
    .filter(move => !fixed.has(move.videoId));
}

export function difference(
  ids: readonly string[],
  without: readonly string[],
): string[] {
  const withoutSet = new Set(without);
  return unique(ids).filter(id => !withoutSet.has(id));
}
