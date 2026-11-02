/** Resolve native paging offsets, including bounce and stale rotation offsets. */
export function shortIndexFromOffset(
  offset: number,
  pageHeight: number,
  count: number,
): number {
  if (pageHeight <= 0 || count <= 0 || !Number.isFinite(offset)) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(offset / pageHeight)));
}

export function getShortPageState(
  index: number,
  selected: number,
  preloadNext: boolean,
) {
  return {
    active: index === selected,
    nearby: Math.abs(index - selected) <= 1,
    preload: preloadNext && index === selected + 1,
  };
}
