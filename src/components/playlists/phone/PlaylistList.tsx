import {ReactElement, useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {PlaylistListItem} from "@/components/playlists/phone/PlaylistListItem";
import {VideoData} from "@/extraction/Types";
import useElementPressableHelper from "@/hooks/utils/useElementPressableHelper";

interface PlaylistListProps {
  data: VideoData[];
  fetchMore?: () => void;
  onPress?: () => void;
  listHeader?: ReactElement;
}

export function PlaylistList({data, listHeader}: PlaylistListProps) {
  const {onPress} = useElementPressableHelper();

  const renderItem = useCallback<ListRenderItem<VideoData>>(({item}) => {
    return (
      <PlaylistListItem
        element={item}
        style={{height: 110, padding: 10}}
        onPress={() => onPress(item)}
      />
    );
  }, []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
    />
  );
}
