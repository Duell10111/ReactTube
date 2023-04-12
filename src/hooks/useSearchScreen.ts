import {useYoutubeContext} from "../context/YoutubeContext";
import {useCallback, useEffect, useState} from "react";
import {YT} from "../utils/Youtube";

export default function useSearchScreen() {
  const innerTube = useYoutubeContext();
  const [searchResult, setSearch] = useState<YT.Search>();

  const search = useCallback(
    async (query: string) => {
      if (!innerTube) {
        return;
      }
      const result = await innerTube.search(query);
      setSearch(result);
    },
    [innerTube],
  );

  const searchSuggestions = useCallback(
    async (query: string) => {
      if (!innerTube) {
        return [];
      }
      return await innerTube.getSearchSuggestions(query);
    },
    [innerTube],
  );

  return {search, searchResult, searchSuggestions};
}
