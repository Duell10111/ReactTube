import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import {View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import LoadingComponent from "../../components/general/LoadingComponent";
import Logger from "../../utils/Logger";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicPlaylistHeader} from "@/components/music/MusicPlaylistHeader";
import {MusicPlaylistList} from "@/components/music/MusicPlaylistList";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import useMusicAlbum from "@/hooks/music/useMusicAlbum";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

const LOGGER = Logger.extend("MUSIC_ALBUM");

type Props = NativeStackScreenProps<RootStackParamList, "MusicAlbumScreen">;

export function MusicAlbumScreen({navigation, route}: Props) {
  const {albumId} = route.params;
  const {album} = useMusicAlbum(albumId);
  const {bottom, left, right} = useSafeAreaInsets();
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();

  if (!album) {
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
        data={album.data}
        ListHeaderComponent={
          <MusicPlaylistHeader
            // @ts-ignore TODO: fix
            image={album.thumbnail}
            title={album.title}
            // @ts-ignore TODO: fix
            subtitle={album.subtitle}
            onPlayPress={() => {
              if (album.playEndpoint) {
                setPlaylistViaEndpoint(album.playEndpoint);
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
