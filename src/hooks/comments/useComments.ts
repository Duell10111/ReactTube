import {useEffect, useRef} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {YT} from "@/utils/Youtube";

export default function useComments(videoId: string, comment_id?: string) {
  const youtube = useYoutubeContext();
  const comments = useRef<YT.Comments>(undefined);

  // TODO: Complete this for comments feature in the future
  useEffect(() => {
    youtube?.getComments(videoId, undefined, comment_id).then(c => {
      comments.current = c;
      // c.contents;
    });
  }, []);
}
