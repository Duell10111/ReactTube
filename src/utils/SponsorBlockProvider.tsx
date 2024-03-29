interface SkipSegment {
  startSegment: number;
  endSegment: number;
}

export async function getSponsorBlockValues(id: string) {
  const result = await fetch(
    "https://sponsor.ajay.app/api/skipSegments?" +
      new URLSearchParams({
        videoID: id,
      }),
  );
  const json = await result.json();
}
