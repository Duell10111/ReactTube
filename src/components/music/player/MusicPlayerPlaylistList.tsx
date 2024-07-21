import _ from "lodash";
import {useCallback, useMemo} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {MusicPlayerPlaylistListItem} from "./MusicPlayerPlaylistListItem";
import {VideoData, YTVideoInfo} from "../../../extraction/Types";

interface MusicPlayerPlaylistListProps {
  currentItem: YTVideoInfo;
}

export function MusicPlayerPlaylistList({
  currentItem,
}: MusicPlayerPlaylistListProps): JSX.Element {
  const videoElements = useMemo(
    () =>
      _.chain(currentItem.playlist.content)
        .filter(video => video.type === "video")
        .value() as VideoData[],
    [currentItem.playlist.content],
  );

  const renderItem = useCallback<ListRenderItem<VideoData>>(
    ({item}) => <MusicPlayerPlaylistListItem data={item} />,
    [],
  );

  return <FlatList data={videoElements} renderItem={renderItem} />;
}
