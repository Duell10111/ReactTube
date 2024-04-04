import {useEffect, useRef, useState} from "react";

interface SkipSegment {
  startSegment: number;
  endSegment: number;
}

interface APIResponse {
  segment: number[];
  category: string;
  actionType: string;
}

export async function getSponsorBlockValues(id: string) {
  const result = await fetch(
    "https://sponsor.ajay.app/api/skipSegments?" +
      new URLSearchParams({
        videoID: id,
      }),
  );
  const json: APIResponse[] = await result.json();

  const skipSegments = json.map(mapToSkipSegment);
  return skipSegments;
}

function mapToSkipSegment(response: APIResponse) {
  return {
    startSegment: response.segment[0],
    endSegment: response.segment[1],
  } as SkipSegment;
}

export function useSponsorBlock(
  videoID: string,
  currentTime: number,
  seek: (seconds: number) => void,
) {
  const [segments, setSegments] = useState<SkipSegment[]>([]);
  const currentSegment = useRef(0);

  // TODO: Add check of settings if enabled?

  useEffect(() => {
    console.log("Fetching SponsorBlock Segments");
    getSponsorBlockValues(videoID).then(setSegments).catch(console.warn);
    currentSegment.current = 0;
  }, [videoID]);

  useEffect(() => {
    const segment = segments[currentSegment.current];
    if (
      segment &&
      segment.startSegment <= currentTime &&
      segment.endSegment > currentTime
    ) {
      console.log("Skipping to end of segment: ", segment.endSegment);
      currentSegment.current = currentSegment.current + 1;
      seek(segment.endSegment);
    }
  }, [currentTime]);
}
