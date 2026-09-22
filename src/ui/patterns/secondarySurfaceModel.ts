/** Converts transfer progress into the bounded whole percent shown in the UI. */
export function getTransferPercent(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.round(Math.min(1, Math.max(0, progress)) * 100);
}
