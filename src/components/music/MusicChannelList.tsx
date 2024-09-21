import {ReactElement, useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {MusicPlaylistItem} from "./MusicPlaylistItem";

import MusicSearchSectionItem from "@/components/music/MusicSearchSectionItem";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";

interface MusicPlaylistListProps {
  data: HorizontalData[];
  onFetchMore?: () => void;
  ListHeaderComponent?: ReactElement;
}

export function MusicChannelList({
  data,
  onFetchMore,
  ListHeaderComponent,
}: MusicPlaylistListProps) {
  const renderItem = useCallback<ListRenderItem<HorizontalData>>(({item}) => {
    return <MusicSearchSectionItem data={item} />;
  }, []);

  const keyExtractor = useCallback((item: HorizontalData, index: number) => {
    return item.id;
  }, []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onFetchMore}
      ListHeaderComponent={ListHeaderComponent}
    />
  );
}
