export type RepeatOption = "RepeatOne" | "RepeatAll";

interface PlaylistEntry {
  id: string;
}

export function shouldRepeatCurrent(repeat: RepeatOption | undefined): boolean {
  return repeat === "RepeatOne";
}

export function getNextPlaylistItem<T extends PlaylistEntry>(
  items: readonly T[],
  currentId: string | undefined,
  repeat: RepeatOption | undefined,
): T | undefined {
  const currentIndex = items.findIndex(item => item.id === currentId);
  if (currentIndex < 0) {
    return undefined;
  }

  return (
    items[currentIndex + 1] ?? (repeat === "RepeatAll" ? items[0] : undefined)
  );
}

export function getPreviousPlaylistItem<T extends PlaylistEntry>(
  items: readonly T[],
  currentId: string | undefined,
): T | undefined {
  const currentIndex = items.findIndex(item => item.id === currentId);
  return currentIndex > 0 ? items[currentIndex - 1] : undefined;
}

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

/** Der bereits gespielte Teil bleibt stabil; nur Up-next wird gemischt. */
export function shufflePlaylistAfterCurrent<T extends PlaylistEntry>(
  items: readonly T[],
  currentId: string | undefined,
  shuffleItems: (tail: readonly T[]) => T[] = shuffled,
): T[] {
  const currentIndex = items.findIndex(item => item.id === currentId);
  const splitIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

  return [
    ...items.slice(0, splitIndex),
    ...shuffleItems(items.slice(splitIndex)),
  ];
}
