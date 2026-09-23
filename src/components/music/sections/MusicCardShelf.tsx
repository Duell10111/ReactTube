import React, {useCallback} from "react";
import {FlatList, type ListRenderItem} from "react-native";

import {MusicCard} from "./MusicCard";
import {getMusicCardShape, getMusicCardWidth} from "./musicSectionModel";

import type {ElementData} from "@/extraction/Types";
import {useAppTheme} from "@/ui/theme";

interface MusicCardShelfProps {
  items: ElementData[];
  /** Width available to the shelf, padding included. */
  containerWidth: number;
  padding: number;
}

/**
 * A row of cover cards. Every card in a shelf gets the width of the shelf's
 * first entry, so the covers line up even where a row mixes songs and videos.
 */
export function MusicCardShelf({
  items,
  containerWidth,
  padding,
}: MusicCardShelfProps) {
  const {theme} = useAppTheme();
  const shape = items[0] ? getMusicCardShape(items[0]) : "square";
  const cardWidth = getMusicCardWidth(
    shape,
    Math.max(0, containerWidth - padding * 2),
  );

  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}) => <MusicCard element={item} width={cardWidth} />,
    [cardWidth],
  );

  return (
    <FlatList
      contentContainerStyle={{
        gap: theme.spacing.md,
        paddingHorizontal: padding,
      }}
      data={items}
      horizontal
      // The same entry can appear twice in a shelf, so the index is part of the key.
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
    />
  );
}
