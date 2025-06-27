import {ReactElement, useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {MusicPlaylistItem} from "./MusicPlaylistItem";

import {ElementData} from "@/extraction/Types";

interface MusicPlaylistListProps {
  data: ElementData[];
  onFetchMore?: () => void;
  ListHeaderComponent?: ReactElement;
  editable?: boolean;
  onDeleteItem?: (data: ElementData) => void;
}

export function MusicPlaylistList({
  data,
  onFetchMore,
  ListHeaderComponent,
  editable,
  onDeleteItem,
}: MusicPlaylistListProps) {
  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item, index}) => {
      if (item.type === "video") {
        return (
          <MusicPlaylistItem
            data={item}
            index={index}
            editable={editable}
            onDeleteItem={() => onDeleteItem?.(item)}
          />
        );
      }
      return null;
    },
    [editable],
  );

  const keyExtractor = useCallback((item: ElementData, index: number) => {
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
