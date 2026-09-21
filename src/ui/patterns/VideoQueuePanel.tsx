import {BottomSheetFlatList} from "@gorhom/bottom-sheet";
import React, {useCallback, useRef} from "react";
import {FlatList, type ListRenderItem} from "react-native";

import {MediaRow} from "./MediaRow";
import type {VideoDetailQueue} from "./videoDetailModel";

import type {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {EmptyState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface VideoQueuePanelProps {
  entries: ElementData[];
  queue: VideoDetailQueue;
  /** Inside a bottom sheet the list has to be the sheet's own scrollable. */
  inSheet?: boolean;
}

/**
 * The playlist a video is playing in. It opens on the entry that is playing
 * instead of at the top, because a queue is read from the current position.
 */
export function VideoQueuePanel({
  entries,
  queue,
  inSheet = false,
}: VideoQueuePanelProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const initialIndex = useRef(queue.currentIndex).current;

  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item, index}) => (
      <MediaRow
        element={item}
        selected={index === queue.currentIndex}
        selectedLabel={t("video.queue.nowPlaying")}
      />
    ),
    [queue.currentIndex, t],
  );

  const List = inSheet ? BottomSheetFlatList : FlatList;

  return (
    <List
      ListEmptyComponent={<EmptyState />}
      contentContainerStyle={{
        padding: theme.spacing.sm,
        gap: theme.spacing.sm,
        flexGrow: 1,
      }}
      data={entries}
      initialScrollIndex={entries.length > initialIndex ? initialIndex : 0}
      keyExtractor={(item: ElementData, index: number) => `${item.id}-${index}`}
      onScrollToIndexFailed={() => undefined}
      renderItem={renderItem}
      testID={"video-queue"}
    />
  );
}
