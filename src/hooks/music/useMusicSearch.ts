import _ from "lodash";
import {useCallback, useMemo, useRef, useState} from "react";
import {SearchContinuation} from "youtubei.js/dist/src/parser/ytmusic/Search";

import {useYoutubeContext} from "../../context/YoutubeContext";
import {parseArrayHorizontalData} from "../../extraction/ArrayExtraction";
import Logger from "../../utils/Logger";
import {Helpers, YTMusic, YTNodes} from "../../utils/Youtube";

const LOGGER = Logger.extend("MUSIC_SEARCH");

type MusicSearchFilter = "all" | "video";

export default function useMusicSearch() {
  const youtube = useYoutubeContext();
  const searchObject = useRef<YTMusic.Search>();
  const searchContinuation = useRef<SearchContinuation>();
  const [searchResult, setSearchResult] = useState<Helpers.YTNode[]>([]);
  const [filter, setFilter] = useState();

  const parsedData = useMemo(() => {
    return parseArrayHorizontalData(searchResult);
  }, [searchResult]);

  const search = (query: string) => {
    youtube.music
      .search(query)
      .then(searchObj => {
        searchObject.current = searchObj;
        setSearchResult(Array.from(searchObj.contents.values()));
      })
      .catch(LOGGER.warn);
  };

  const fetchMore = () => {
    if (searchObject.current.has_continuation) {
    } else {
      LOGGER.debug("No Search Continuation available!");
    }
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

  return {search, searchResult, parsedData, searchSuggestions};
}
