import {useCallback, useMemo} from "react";

import {getVideoMenuEntries, resolveVideoMenuChannelId} from "./videoMenuModel";

import type {ContextMenu, ElementData} from "@/extraction/Types";
import useElementData from "@/hooks/general/useElementData";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("VIDEOMENU");

interface VideoMenuEntryHandlers {
  /** Called once a YouTube action of the entry went through. */
  onDone: () => void;
  /** Opens the playlist picker; TV and phone show it differently. */
  onAddToPlaylist: (videoId: string) => void;
}

/**
 * Data and actions of the video menu, shared by the TV side panel and the
 * phone bottom sheet so both offer the same entries.
 */
export default function useVideoMenuActions(element: ElementData) {
  const data = useElementData(element);
  const {executeNavEndpoint} = usePlaylistManager();

  const entries = useMemo(() => getVideoMenuEntries(data), [data]);
  const channelId = useMemo(() => resolveVideoMenuChannelId(data), [data]);

  const runEntry = useCallback(
    (entry: ContextMenu, handlers: VideoMenuEntryHandlers) => {
      if (entry.type === "addToPlaylist") {
        handlers.onAddToPlaylist(data.id);
      } else if (entry.navEndpoint) {
        executeNavEndpoint(entry.navEndpoint)
          .then(() => {
            LOGGER.debug("Executed nav endpoint for menu", entry.type);
            handlers.onDone();
          })
          .catch(LOGGER.warn);
      } else {
        LOGGER.warn("No supported type");
      }
    },
    [data.id, executeNavEndpoint],
  );

  return {data, entries, channelId, runEntry};
}
