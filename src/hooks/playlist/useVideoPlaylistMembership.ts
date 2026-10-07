import {useEffect, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {normalizePlaylistId} from "@/hooks/playlist/playlistSelection";
import Logger from "@/utils/Logger";
import {YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("PLAYLIST_MEMBERSHIP");

/**
 * Which of the account's playlists already contain `videoId`, asked once
 * through YouTube's own save dialog request.
 *
 * Checking the first page of every playlist instead missed every video saved
 * after that page, which is where a newly saved video ends up.
 *
 * `containing` stays `undefined` while loading and when the request fails, so
 * the caller can fall back to its own check.
 */
export function useVideoPlaylistMembership(videoId: string) {
  const youtube = useYoutubeTVContext();
  const [containing, setContaining] = useState<Set<string>>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!youtube?.actions) {
      return;
    }

    let cancelled = false;

    new YTNodes.NavigationEndpoint({
      addToPlaylistServiceEndpoint: {videoId},
    })
      .call(youtube.actions, {parse: true})
      .then(response => {
        const dialog = response.contents_memo?.getType(
          YTNodes.AddToPlaylist,
        )?.[0];
        if (!dialog) {
          throw new Error("Response contains no playlist options");
        }

        const contained = new Set<string>();
        for (const option of dialog.playlists) {
          if (option.contains_selected_videos === "ALL") {
            contained.add(normalizePlaylistId(option.playlist_id));
          }
        }

        if (!cancelled) {
          setContaining(contained);
        }
      })
      .catch(error => {
        LOGGER.warn("Playlist membership could not be loaded: ", error);
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoId, youtube]);

  return {containing, failed};
}
