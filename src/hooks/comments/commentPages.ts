interface Identified {
  id: string;
}

/**
 * Appends a continuation page to what is already loaded, keeping the first
 * occurrence of every comment.
 *
 * Pages overlap: a continuation can repeat comments the previous page already
 * carried, and a page that is requested twice repeats all of them. Appending
 * blindly puts the same comment id into the list twice, which React answers
 * with "Encountered two children with the same key" and by dropping rows.
 */
export function mergeCommentPages<T extends Identified>(
  previous: readonly T[],
  next: readonly T[],
): T[] {
  const seen = new Set(previous.map(comment => comment.id));
  const merged = [...previous];

  for (const comment of next) {
    if (seen.has(comment.id)) {
      continue;
    }

    seen.add(comment.id);
    merged.push(comment);
  }

  return merged;
}
