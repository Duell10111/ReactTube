import _ from "lodash";
import {useCallback, useMemo} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {MusicPlayerPlaylistListItem} from "./MusicPlayerPlaylistListItem";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {VideoData, YTPlaylistPanelItem} from "@/extraction/Types";

interface MusicPlayerPlaylistListProps {
  // currentItem: YTVideoInfo;
}

export function MusicPlayerPlaylistList({}: MusicPlayerPlaylistListProps) {
  const {currentItem, setPlaylistViaEndpoint, playlist, fetchMorePlaylistData} =
    useMusikPlayerContext();

  const selectedItem = useMemo(
    () => playlist.items.findIndex(item => item.id === currentItem.id),
    [currentItem.id],
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

  const renderItem = useCallback<ListRenderItem<YTPlaylistPanelItem>>(
    ({item, index}) => (
      <MusicPlayerPlaylistListItem
        data={item}
        currentItem={selectedItem === index}
        onPress={() => {
          console.log("Endpoint Item: ", item.navEndpoint);
          setPlaylistViaEndpoint(item.navEndpoint);
        }}
      />
    ),
    [selectedItem],
  );

  return (
    <FlatList
      data={playlist.items}
      renderItem={renderItem}
      onEndReached={fetchMorePlaylistData}
    />
  );
}
