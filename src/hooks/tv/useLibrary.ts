import {useEffect, useRef, useState} from "react";

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

export default function useLibrary(initSection?: LibrarySections) {
  const youtube = useYoutubeTVContext();
  const library = useRef<YTTV.Library>(undefined);
  // Needed ElementData for subsections
  const [data, setData] = useState<(HorizontalData | ElementData)[]>();

  console.log("DATA: ", data);

  useEffect(() => {
    youtube?.tv
      ?.getLibrary()
      .then(async lib => {
        console.log("Fetching library");
        // console.log("Lib: ", JSON.stringify(lib, null, 4));
        library.current = lib;
        if (initSection) {
          selectSection(initSection);
        } else {
          setData(parseArrayHorizontalData(lib.items));
        }
      })
      .catch(LOGGER.warn);
  }, []);

  const selectSection = (section: LibrarySections) => {
    if (
      library.current?.items[0]?.is(YTNodes.Shelf) &&
      library.current?.items[0].content?.is(YTNodes.HorizontalList)
    ) {
      const searchedItem =
        section === "history" ? "FEhistory" : "FEplaylist_aggregation";

      const tileBtn = library.current?.items[0].content.items
        .filterType(YTNodes.Tile)
        .find(tile => tile.content_id === searchedItem);
      if (tileBtn) {
        library.current
          ?.selectButtonTile(tileBtn)
          .then(lib => {
            library.current = lib;
            setData(parseArray(lib.items));
          })
          .catch(LOGGER.warn);
      }
    }
  };

  const fetchMore = () => {
    if (library.current?.has_continuation) {
      library.current?.getContinuation().then(continuation => {
        library.current = continuation;
        setData(prevData => {
          return [...(prevData ?? []), ...parseArray(continuation.items)];
        });
      });
    }
  };

  return {data, fetchMore};
}
