import {useCallback, useMemo} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {
  ITEM_HEIGHT,
  MusicPlayerPlaylistListItem,
} from "./MusicPlayerPlaylistListItem";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {YTPlaylistPanelItem} from "@/extraction/Types";

interface MusicPlayerPlaylistListProps {
  // currentItem: YTVideoInfo;
}

export function MusicPlayerPlaylistList({}: MusicPlayerPlaylistListProps) {
  const {currentItem, playlist, setCurrentItem, fetchMorePlaylistData} =
    useMusikPlayerContext();

  const selectedItem = useMemo(
    () => playlist?.items?.findIndex(item => item.id === currentItem?.id),
    [currentItem?.id],
  );

  const renderItem = useCallback<ListRenderItem<YTPlaylistPanelItem>>(
    ({item, index}) => (
      <MusicPlayerPlaylistListItem
        data={item}
        currentItem={selectedItem === index}
        onPress={() => {
          setCurrentItem(item, false);
        }}
      />
    ),
    [selectedItem],
  );

  return (
    <FlatList
      // Select current playing item automatically
      initialScrollIndex={selectedItem}
      onScrollToIndexFailed={({index}) => {
        console.warn(`PlaylistPanel: Error scrolling to index: ${index}`);
      }}
      getItemLayout={(data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      data={playlist?.items ?? []}
      renderItem={renderItem}
      onEndReached={fetchMorePlaylistData}
    />
  );
}
