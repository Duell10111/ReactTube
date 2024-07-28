import {ReactElement, useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {MusicPlaylistItem} from "./MusicPlaylistItem";
import {ElementData} from "../../extraction/Types";

interface MusicPlaylistListProps {
  data: ElementData[];
  onFetchMore?: () => void;
  ListHeaderComponent?: ReactElement;
}

export function MusicPlaylistList({
  data,
  onFetchMore,
  ListHeaderComponent,
}: MusicPlaylistListProps): JSX.Element {
  const renderItem = useCallback<ListRenderItem<ElementData>>(({item}) => {
    if (item.type === "video") {
      return <MusicPlaylistItem data={item} />;
    }
    return null;
  }, []);

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
