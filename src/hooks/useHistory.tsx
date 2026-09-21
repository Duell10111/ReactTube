import {useMemo} from "react";

import {useFeedData} from "./general/useFeedData";

import {parseArrayHorizontalAndElement} from "@/extraction/ArrayExtraction";

export default function useHistory() {
  const {content, fetchMore, refresh, refreshing, loading, error} = useFeedData(
    youtube => youtube.getHistory(),
  );

  const parsedContent = useMemo(() => {
    return parseArrayHorizontalAndElement(content);
  }, [content]);

  return {
    content,
    parsedContent,
    fetchMore,
    refresh,
    refreshing,
    loading,
    error,
  };
}
