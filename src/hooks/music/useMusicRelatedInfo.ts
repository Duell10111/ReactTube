import {useEffect, useState} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {parseObservedArrayHorizontalData} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {YTNodes} from "@/utils/Youtube";

export default function useMusicRelatedInfo(videoId: string) {
  const youtube = useYoutubeContext();
  const [relatedSections, setRelatedSections] = useState<HorizontalData[]>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    if (!youtube?.music || !videoId) {
      return;
    }
    setLoading(true);
    setError(undefined);
    youtube.music
      .getRelated(videoId)
      .then(data => {
        if (data.is(YTNodes.Message)) {
          setMessage(data.text.text);
        } else if (data.is(YTNodes.SectionList)) {
          setRelatedSections(parseObservedArrayHorizontalData(data.contents));
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [youtube, videoId]);

  return {
    relatedSections,
    message,
    loading,
    error,
  };
}
