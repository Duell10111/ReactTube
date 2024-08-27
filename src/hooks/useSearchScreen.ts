import _ from "lodash";
import {useCallback, useReducer, useState} from "react";

import {useYoutubeContext} from "../context/YoutubeContext";
import Logger from "../utils/Logger";
import {Helpers, YT} from "../utils/Youtube";

const LOGGER = Logger.extend("SEARCH");

function resultReducer(
  state: Helpers.YTNode[],
  action: Helpers.YTNode[] | undefined,
) {
  if (!action) {
    return [];
  } else {
    return _.concat(state, action);
  }
}

export default function useSearchScreen() {
  const innerTube = useYoutubeContext();
  const [searchData, setSearchData] = useState<YT.Search>();
  const [searchResults, dispatch] = useReducer(resultReducer, []);

  const search = useCallback(
    async (query: string) => {
      if (!innerTube) {
        return;
      }
      // Clear results on empty query
      if (query.length === 0) {
        dispatch(undefined);
        return;
      }
      const result = await innerTube.search(query);
      if (result.results && result.results.length > 0) {
        dispatch(undefined);
        dispatch(result.results);
      } else {
        LOGGER.debug("No results available");
      }
      setSearchData(result);
    },
    [innerTube],
  );

  const fetchMore = useCallback(async () => {
    if (!searchData) {
      throw new Error("No Search Available");
    }
    if (!searchData.has_continuation) {
      return new Error("No Search Continue Available");
    }
    const result = await searchData.getContinuation();
    if (result.results && result.results.length > 0) {
      dispatch(result.results);
    } else {
      LOGGER.debug("No results available");
    }
    setSearchData(result);
  }, [searchData]);

  const searchSuggestions = useCallback(
    async (query: string) => {
      if (!innerTube) {
        return [];
      }
      if (query.length === 0) {
        return [];
      }
      return await innerTube.getSearchSuggestions(query);
    },
    [innerTube],
  );

  return {search, searchResult: searchResults, fetchMore, searchSuggestions};
}
