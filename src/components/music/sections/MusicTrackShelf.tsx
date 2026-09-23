import React, {useCallback, useMemo} from "react";
import {FlatList, View, type ListRenderItem} from "react-native";

import {MusicTrackRow} from "./MusicTrackRow";
import {buildTrackColumns, getTrackColumnWidth} from "./musicSectionModel";

import type {ElementData} from "@/extraction/Types";
import {useAppTheme} from "@/ui/theme";

interface MusicTrackShelfProps {
  items: ElementData[];
  /** Entries per column, as the shelf itself declared it. */
  rows: number;
  /** Width available to the shelf, padding included. */
  containerWidth: number;
  padding: number;
}

/**
 * The "quick picks" shelf: a column of tracks that pages sideways. The column
 * is one snap target, so a swipe moves a whole set of entries instead of
 * leaving a row cut in half.
 */
export function MusicTrackShelf({
  items,
  rows,
  containerWidth,
  padding,
}: MusicTrackShelfProps) {
  const {theme} = useAppTheme();
  const columns = useMemo(() => buildTrackColumns(items, rows), [items, rows]);
  const columnWidth = getTrackColumnWidth(
    Math.max(0, containerWidth - padding * 2),
    columns.length,
  );

  const renderColumn = useCallback<ListRenderItem<ElementData[]>>(
    ({item}) => (
      <View style={{width: columnWidth, gap: theme.spacing.xs}}>
        {item.map((element, index) => (
          <MusicTrackRow
            element={element}
            key={`${element.id}-${index}`}
            width={columnWidth}
          />
        ))}
      </View>
    ),
    [columnWidth, theme.spacing.xs],
  );

  if (columnWidth <= 0) {
    return null;
  }

  return (
    <FlatList
      contentContainerStyle={{
        gap: theme.spacing.md,
        paddingHorizontal: padding,
      }}
      data={columns}
      decelerationRate={"fast"}
      horizontal
      keyExtractor={(column, index) => `${column[0]?.id ?? "column"}-${index}`}
      renderItem={renderColumn}
      showsHorizontalScrollIndicator={false}
      snapToAlignment={"start"}
      snapToInterval={columnWidth + theme.spacing.md}
    />
  );
}
