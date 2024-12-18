import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import {View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import LoadingComponent from "../../components/general/LoadingComponent";
import usePlaylistDetails from "../../hooks/music/useMusicPlaylistDetails";
import Logger from "../../utils/Logger";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicPlaylistHeader} from "@/components/music/MusicPlaylistHeader";
import {MusicPlaylistList} from "@/components/music/MusicPlaylistList";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

const LOGGER = Logger.extend("PLAYLIST");

type Props = NativeStackScreenProps<RootStackParamList, "PlaylistScreen">;

export function MusicPlaylistScreen({navigation, route}: Props) {
  const {playlistId} = route.params;
  const {
    playlist,
    fetchMore,
    liked,
    togglePlaylistLike,
    deleteItemFromPlaylist,
  } = usePlaylistDetails(playlistId);
  const {bottom, left, right} = useSafeAreaInsets();
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();

  if (!playlist) {
    return <LoadingComponent />;
  }

  // LOGGER.debug("Playlist: ", recursiveTypeLogger([playlist.page_contents]));

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}>
      {/* ADD PLAYLIST LIST */}
      <MusicPlaylistList
        data={playlist.items}
        onFetchMore={() => fetchMore()}
        editable={playlist.editable}
        onDeleteItem={item => deleteItemFromPlaylist(item)}
        ListHeaderComponent={
          <MusicPlaylistHeader
            image={playlist.thumbnailImage}
            title={playlist.title}
            subtitle={playlist.description ?? ""}
            saved={liked}
            onSavePress={togglePlaylistLike}
            onPlayPress={() => {
              if (playlist.playEndpoint) {
                setPlaylistViaEndpoint(playlist.playEndpoint);
                navigation.navigate("MusicPlayerScreen");
              }
            }}
          />
        }
      />
      <MusicBottomPlayerBar />
    </View>
  );
}
