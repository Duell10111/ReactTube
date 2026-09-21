import _ from "lodash";
import {useCallback, useMemo, useReducer, useState} from "react";

import {useYoutubeContext} from "../context/YoutubeContext";
import Logger from "../utils/Logger";
import {Helpers, YT} from "../utils/Youtube";

import {parseArrayHorizontalAndElement} from "@/extraction/ArrayExtraction";

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
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>();

  const search = useCallback(
    async (nextQuery: string) => {
      if (!innerTube) {
        return;
      }
      setQuery(nextQuery);
      setError(undefined);
      // Clear results on empty query
      if (nextQuery.length === 0) {
        dispatch(undefined);
        setSearchData(undefined);
        return;
      }

      setLoading(true);

      try {
        const result = await innerTube.search(nextQuery);
        dispatch(undefined);
        if (result.results && result.results.length > 0) {
          dispatch(result.results);
        } else {
          LOGGER.debug("No results available");
        }
        setSearchData(result);
      } catch (reason) {
        LOGGER.warn("Error while searching: ", reason);
        setError(reason);
      } finally {
        setLoading(false);
      }
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
    async (suggestionQuery: string) => {
      if (!innerTube) {
        return [];
      }
      if (suggestionQuery.length === 0) {
        return [];
      }
      return await innerTube.getSearchSuggestions(suggestionQuery);
    },
    [innerTube],
  );

  const parsedData = useMemo(() => {
    return parseArrayHorizontalAndElement(searchResults);
  }, [searchResults]);

  return {
    search,
    query,
    searchResult: searchResults,
    parsedSearchResults: parsedData,
    fetchMore,
    searchSuggestions,
    loading,
    error,
  };
}
