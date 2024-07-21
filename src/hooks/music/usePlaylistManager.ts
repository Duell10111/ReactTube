import {useRef} from "react";

import {VideoData} from "../../extraction/Types";

export default function usePlaylistManager() {
  const playlistCache = useRef<VideoData[]>([]);

  return {playlistCache};
}
