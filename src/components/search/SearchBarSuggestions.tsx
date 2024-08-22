import React, {useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {SearchBarSuggestionListItem} from "./SearchBarSuggestionListItem";

interface SearchBarSuggestionsProps {
  suggestions: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function SearchBarSuggestions({
  suggestions,
  onSuggestionClick,
}: SearchBarSuggestionsProps) {
  const renderItem = useCallback<ListRenderItem<string>>(({item}) => {
    return (
      <SearchBarSuggestionListItem
        text={item}
        onPress={() => onSuggestionClick?.(item)}
      />
    );
  }, []);

  return (
    <FlatList
      contentInsetAdjustmentBehavior={"automatic"}
      data={suggestions}
      renderItem={renderItem}
      // onEndReached={fetchContinuation}
    />
  );
}
