import {useEffect, useRef, useState} from "react";

import {showMessage} from "./ShowFlashMessageHelper";

interface SkipSegment {
  startSegment: number;
  endSegment: number;
  category: string;
}

interface APIResponse {
  UUID: string;
  segment: number[];
  category: string;
  actionType: string;
  videoDuration: number;
  votes: number;
  description: string;
}

export async function getSponsorBlockValues(id: string) {
  const result = await fetch(
    "https://sponsor.ajay.app/api/skipSegments?" +
      new URLSearchParams({
        videoID: id,
      }),
  );

  if (result.status !== 200) {
    console.log("URL: ", result.url);
    console.log("Response code: ", result.status);
    return [];
  }
  const json: APIResponse[] = await result.json();
  console.log("JSON: ", json);
  // TODO: Maybe sort by startTimestamp if not done by API?

  const skipSegments = json.map(mapToSkipSegment);
  return skipSegments;
}

function mapToSkipSegment(response: APIResponse) {
  return {
    startSegment: response.segment[0],
    endSegment: response.segment[1],
    category: mapCategory(response.category),
  } as SkipSegment;
}

// Map to normal language
function mapCategory(category: string) {
  switch (category) {
    case "sponsor":
      return "Sponsor";
    default:
      return category;
  }
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
    // TODO: Check if videoID undefined
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
      showMessage({
        message: `Skipping ${segment.category}`,
        titleStyle: {
          fontSize: 20,
        },
      });
      currentSegment.current += 1;
      seek?.(segment.endSegment);
    } else if (segment && currentTime > segment.endSegment) {
      // Check if skipped manually
      currentSegment.current += 1;
    }
  }, [currentTime]);
}
