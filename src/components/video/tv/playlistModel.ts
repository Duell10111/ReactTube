/**
 * Index of the playing video inside the playlist row, or -1 when it cannot be
 * told apart.
 *
 * The video id decides: the TV client delivers the playlist as a watch next
 * shelf whose order need not match the reported `current_index`. The index
 * only breaks ties — a video can sit in a playlist more than once — and stands
 * in when no entry carries an id to compare against.
 */
export function findCurrentPlaylistIndex(
  entries: readonly {id: string}[],
  videoId: string | undefined,
  reportedIndex?: number,
): number {
  const reported =
    reportedIndex !== undefined &&
    Number.isInteger(reportedIndex) &&
    reportedIndex >= 0 &&
    reportedIndex < entries.length
      ? reportedIndex
      : -1;

  if (!videoId) {
    return reported;
  }

  if (reported >= 0 && entries[reported].id === videoId) {
    return reported;
  }

  return entries.findIndex(entry => entry.id === videoId);
}
