import _ from "lodash";
import {useCallback, useMemo} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {MusicPlayerPlaylistListItem} from "./MusicPlayerPlaylistListItem";
import {useMusikPlayerContext} from "../../../context/MusicPlayerContext";
import {VideoData} from "../../../extraction/Types";

interface MusicPlayerPlaylistListProps {
  // currentItem: YTVideoInfo;
}

export function MusicPlayerPlaylistList({}: MusicPlayerPlaylistListProps) {
  const {currentItem, setCurrentItem} = useMusikPlayerContext();

  const selectedItem = useMemo(
    () => currentItem?.playlist?.current_index ?? -1,
    [currentItem?.playlist?.current_index],
  );

  const videoElements = useMemo(
    () =>
      currentItem?.playlist
        ? (_.chain(currentItem.playlist.content)
            .filter(video => video.type === "video")
            .value() as VideoData[])
        : [],
    [currentItem?.playlist?.content],
  );

  const renderItem = useCallback<ListRenderItem<VideoData>>(
    ({item, index}) => (
      <MusicPlayerPlaylistListItem
        data={item}
        currentItem={selectedItem === index}
        onPress={() => setCurrentItem(item)}
      />
    ),
    [selectedItem],
  );

  return <FlatList data={videoElements} renderItem={renderItem} />;
}
