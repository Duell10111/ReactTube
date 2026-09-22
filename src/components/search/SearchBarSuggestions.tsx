import React, {useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {SearchBarSuggestionListItem} from "./SearchBarSuggestionListItem";

import {useAppTheme} from "@/ui/theme";

interface SearchBarSuggestionsProps {
  suggestions: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function SearchBarSuggestions({
  suggestions,
  onSuggestionClick,
}: SearchBarSuggestionsProps) {
  const {theme} = useAppTheme();
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
      contentContainerStyle={{gap: theme.spacing.xs, padding: theme.spacing.sm}}
      data={suggestions}
      renderItem={renderItem}
    />
  );
}
