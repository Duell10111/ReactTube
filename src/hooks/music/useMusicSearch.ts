import _ from "lodash";
import {useCallback, useMemo, useRef, useState} from "react";
//@ts-ignore Ignore type error
import {SearchContinuation} from "youtubei.js/dist/src/parser/ytmusic/Search";

import Logger from "../../utils/Logger";
import {Helpers, YTMusic, YTNodes} from "../../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {
  parseArray,
  parseArrayHorizontalData,
} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {YTChipCloud, YTChipCloudChip} from "@/extraction/Types";
import {parseChipCloud} from "@/extraction/YTElements";

const LOGGER = Logger.extend("MUSIC_SEARCH");

export default function useMusicSearch() {
  const youtube = useYoutubeContext();
  const searchObject = useRef<YTMusic.Search>(undefined);
  const searchContinuation = useRef<SearchContinuation>(undefined);
  const [searchResult, setSearchResult] = useState<Helpers.YTNode[]>([]);
  const [cloudChip, setCloudChip] = useState<YTChipCloud | undefined>();

  const parsedData = useMemo(() => {
    return parseArrayHorizontalData(searchResult);
  }, [searchResult]);

  const search = (query: string) => {
    youtube?.music
      ?.search(query)
      .then(searchObj => {
        searchObject.current = searchObj;
        setCloudChip(
          searchObj.header ? parseChipCloud(searchObj.header) : undefined,
        );
        searchObj.contents &&
          setSearchResult(Array.from(searchObj.contents.values()));
        clearDetailsData();
      })
      .catch(LOGGER.warn);
  };

  const fetchMore = () => {
    if (searchObject.current?.has_continuation) {
    } else {
      LOGGER.debug("No Search Continuation available!");
    }
  };

  // SearchFilters

  const shelfSearch = useRef<YTMusic.Search>(undefined);
  const shelfCont = useRef<SearchContinuation>(undefined);
  const [shelfData, setShelfData] = useState<Helpers.YTNode[]>();

  const extendMusicShelf = (horizontalData: HorizontalData) => {
    if (horizontalData.originalNode.is(YTNodes.MusicShelf)) {
      searchObject.current
        ?.getMore(horizontalData.originalNode)
        .then(shelfContent => {
          shelfSearch.current = shelfContent;
          shelfCont.current = undefined;

          const musicShelf = shelfContent.contents?.firstOfType(
            YTNodes.MusicShelf,
          );
          if (musicShelf) {
            setShelfData(musicShelf.contents);
            setCloudChip(
              shelfContent.header
                ? parseChipCloud(shelfContent.header)
                : undefined,
            );
          } else {
            LOGGER.warn("No Music Shelf found.");
          }
        })
        .catch(LOGGER.warn);
    } else {
      LOGGER.warn("No Music Shelf provided");
    }
  };

  const extendMusicShelfViaFilter = (chip: YTChipCloudChip) => {
    searchObject.current
      ?.applyFilter(chip.originalData)
      .then(obj => {
        shelfSearch.current = obj;
        shelfCont.current = undefined;

        const musicShelf = obj.contents?.firstOfType(YTNodes.MusicShelf);
        if (musicShelf) {
          setShelfData(musicShelf.contents);
          setCloudChip(obj.header ? parseChipCloud(obj.header) : undefined);
        } else {
          LOGGER.warn("No Music Shelf found.");
        }
      })
      .catch(LOGGER.warn);
  };

  const parsedMusicShelfData = useMemo(() => {
    return shelfData ? parseArray(shelfData) : undefined;
  }, [shelfData]);

  const fetchMoreShelfData = () => {
    const shelf = shelfCont.current ?? shelfSearch.current;
    if (shelf?.has_continuation) {
      shelf.getContinuation().then(s => {
        shelfCont.current = s;
        s.contents?.contents &&
          setShelfData([...(shelfData ?? []), ...s.contents.contents]);
      });
    } else {
      LOGGER.debug("No Search Continuation available!");
    }
  };

  const clearDetailsData = () => {
    setShelfData(undefined);
    shelfSearch.current = undefined;
    shelfCont.current = undefined;
    setCloudChip(
      searchObject.current?.header
        ? parseChipCloud(searchObject.current.header)
        : undefined,
    );
  };

  const searchSuggestions = useCallback(
    async (query: string) => {
      if (!youtube) {
        return [];
      }
      if (_.isEmpty(query)) {
        return [];
      }
      const suggestions = await youtube.music.getSearchSuggestions(query);

      // TODO: Use Search Section data more?!
      return suggestions
        .filterType(YTNodes.SearchSuggestionsSection)
        .map(section =>
          section.contents
            .filterType(YTNodes.SearchSuggestion)
            .map(v => v.suggestion.text),
        )
        .flat();
    },
    [youtube],
  );

  LOGGER.debug("SearchResult: ", JSON.stringify(searchResult));

  return {
    search,
    searchResult,
    parsedData,
    searchSuggestions,
    extendMusicShelf,
    fetchMoreShelfData,
    clearDetailsData,
    extendMusicShelfViaFilter,
    parsedMusicShelfData,
    cloudChip,
  };
}
