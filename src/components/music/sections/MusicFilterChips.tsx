import React, {useCallback} from "react";
import {FlatList, type ListRenderItem} from "react-native";

import {Chip} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MusicFilterChipsProps {
  filters: string[];
  selected?: string;
  onSelect: (filter: string) => void;
  padding: number;
}

/**
 * The mood and genre row above the home feed. Selecting the active chip again
 * clears the filter, which is the only way back to the unfiltered feed.
 */
export function MusicFilterChips({
  filters,
  selected,
  onSelect,
  padding,
}: MusicFilterChipsProps) {
  const {theme} = useAppTheme();

  const renderItem = useCallback<ListRenderItem<string>>(
    ({item}) => (
      <Chip
        label={item}
        onPress={() => onSelect(item)}
        selected={item === selected}
      />
    ),
    [onSelect, selected],
  );

  if (filters.length === 0) {
    return null;
  }

  return (
    <FlatList
      contentContainerStyle={{
        gap: theme.spacing.sm,
        paddingHorizontal: padding,
        paddingBottom: theme.spacing.md,
      }}
      data={filters}
      horizontal
      keyExtractor={filter => filter}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
    />
  );
}
