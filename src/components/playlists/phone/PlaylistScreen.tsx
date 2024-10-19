import React from "react";
import {View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import LoadingComponent from "@/components/general/LoadingComponent";
import {PlaylistHeader} from "@/components/playlists/phone/PlaylistHeader";
import {PlaylistList} from "@/components/playlists/phone/PlaylistList";
import usePlaylistDetails from "@/hooks/usePlaylistDetails";

interface PlaylistScreenProps {
  playlistId: string;
}

export default function PlaylistScreen({playlistId}: PlaylistScreenProps) {
  const {playlist, data, fetchMore, liked, togglePlaylistLike} =
    usePlaylistDetails(playlistId);
  const {bottom, left, right} = useSafeAreaInsets();

  if (playlist === undefined) {
    return <LoadingComponent />;
  }

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}>
      <PlaylistList
        // @ts-ignore Only VideoData should be matched
        data={data}
        fetchMore={fetchMore}
        listHeader={
          <PlaylistHeader
            playlist={playlist}
            saved={liked}
            onSavePlaylist={togglePlaylistLike}
          />
        }
      />
    </View>
  );
}
