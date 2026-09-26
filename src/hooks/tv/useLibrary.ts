import {useCallback, useEffect, useRef, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {
  parseArray,
  parseArrayHorizontalData,
} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";
import Logger from "@/utils/Logger";
import {YTTV, YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("LIBRARY");

type LibrarySections = "history" | "playlist";

/**
 * Library of the signed in account.
 *
 * This reads the **TV client**, not the TV surface: the OAuth2 device flow only
 * works against that client, so its session is the only signed in one. The
 * classic session answers account endpoints with "You must be signed in to
 * perform this operation.", which is why phone and TV both come through here.
 */
export default function useLibrary(initSection?: LibrarySections) {
  const youtube = useYoutubeTVContext();
  const library = useRef<YTTV.Library>(undefined);
  // Needed ElementData for subsections
  const [data, setData] = useState<(HorizontalData | ElementData)[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>();

  const selectSection = useCallback((section: LibrarySections) => {
    if (
      !library.current?.items[0]?.is(YTNodes.Shelf) ||
      !library.current.items[0].content?.is(YTNodes.HorizontalList)
    ) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const searchedItem =
      section === "history" ? "FEhistory" : "FEplaylist_aggregation";

    const tileBtn = library.current.items[0].content.items
      .filterType(YTNodes.Tile)
      .find(tile => tile.content_id === searchedItem);

    if (!tileBtn) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    library.current
      .selectButtonTile(tileBtn)
      .then(lib => {
        library.current = lib;
        setData(parseArray(lib.items));
      })
      .catch(reason => {
        LOGGER.warn("Error selecting library section: ", reason);
        setError(reason);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  const fetchLibrary = useCallback(() => {
    if (!youtube) {
      return;
    }

    setError(undefined);
    youtube.tv
      .getLibrary()
      .then(lib => {
        library.current = lib;

        if (initSection) {
          selectSection(initSection);
          return;
        }

        setData(parseArrayHorizontalData(lib.items));
        setLoading(false);
        setRefreshing(false);
      })
      .catch(reason => {
        LOGGER.warn("Error fetching library: ", reason);
        setError(reason);
        setLoading(false);
        setRefreshing(false);
      });
  }, [initSection, selectSection, youtube]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const fetchMore = useCallback(async () => {
    if (!library.current?.has_continuation) {
      return;
    }

    const continuation = await library.current.getContinuation();
    library.current = continuation;
    setData(previous => [...previous, ...parseArray(continuation.items)]);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchLibrary();
  }, [fetchLibrary]);

  return {
    data,
    fetchMore,
    refresh,
    refreshing,
    loading: loading || !youtube,
    error,
  };
}
