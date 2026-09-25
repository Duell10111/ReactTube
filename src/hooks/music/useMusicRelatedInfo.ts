import {useEffect, useState} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {parseObservedArrayHorizontalData} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {YTNodes} from "@/utils/Youtube";

export default function useMusicRelatedInfo(videoId: string) {
  const youtube = useYoutubeContext();
  const music = youtube?.music;
  const [result, setResult] = useState<{
    videoId: string;
    source: typeof music;
    relatedSections?: HorizontalData[];
    message?: string;
    loading: boolean;
    error?: unknown;
  }>({videoId, source: music, loading: Boolean(music && videoId)});

  useEffect(() => {
    let active = true;
    setResult({videoId, source: music, loading: Boolean(music && videoId)});

    if (music && videoId) {
      const load = async () => {
        try {
          const data = await music.getRelated(videoId);
          if (!active) {
            return;
          }

          if (data.is(YTNodes.Message)) {
            setResult({
              videoId,
              source: music,
              message: data.text.text,
              loading: false,
            });
          } else if (data.is(YTNodes.SectionList)) {
            setResult({
              videoId,
              source: music,
              relatedSections: parseObservedArrayHorizontalData(data.contents),
              loading: false,
            });
          } else {
            setResult({videoId, source: music, loading: false});
          }
        } catch (error) {
          if (active) {
            setResult({videoId, source: music, error, loading: false});
          }
        }
      };

      load();
    }

    return () => {
      active = false;
    };
  }, [music, videoId]);

  const isCurrent = result.videoId === videoId && result.source === music;

  return {
    relatedSections: isCurrent ? result.relatedSections : undefined,
    message: isCurrent ? result.message : undefined,
    loading: isCurrent ? result.loading : Boolean(music && videoId),
    error: isCurrent ? result.error : undefined,
  };
}
