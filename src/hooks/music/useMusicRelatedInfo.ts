import {useEffect, useState} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {parseObservedArrayHorizontalData} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {YTNodes} from "@/utils/Youtube";

export default function useMusicRelatedInfo(videoId: string) {
  const youtube = useYoutubeContext();
  const [relatedSections, setRelatedSections] = useState<HorizontalData[]>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    youtube?.music?.getRelated(videoId).then(data => {
      console.log("Original Related: ", data);
      if (data.is(YTNodes.Message)) {
        setMessage(data.text.text);
      } else if (data.is(YTNodes.SectionList)) {
        setRelatedSections(parseObservedArrayHorizontalData(data.contents));
      }
    });
  }, [youtube, videoId]);

  return {
    relatedSections,
    message,
  };
}
