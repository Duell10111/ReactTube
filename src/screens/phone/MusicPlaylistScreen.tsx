import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import {View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import LoadingComponent from "../../components/general/LoadingComponent";
import {MusicPlaylistHeader} from "../../components/music/MusicPlaylistHeader";
import {MusicPlaylistList} from "../../components/music/MusicPlaylistList";
import {useMusikPlayerContext} from "../../context/MusicPlayerContext";
import usePlaylistDetails from "../../hooks/music/useMusicPlaylistDetails";
import {RootStackParamList} from "../../navigation/RootStackNavigator";
import Logger from "../../utils/Logger";

const LOGGER = Logger.extend("PLAYLIST");

type Props = NativeStackScreenProps<RootStackParamList, "PlaylistScreen">;

export function MusicPlaylistScreen({route}: Props) {
  const {playlistId} = route.params;
  const {playlist} = usePlaylistDetails(playlistId);
  const {bottom} = useSafeAreaInsets();
  const {} = useMusikPlayerContext();

  if (!playlist) {
    return <LoadingComponent />;
  }

  // LOGGER.debug("Playlist: ", recursiveTypeLogger([playlist.page_contents]));

  return (
    <View style={{flex: 1, paddingBottom: bottom}}>
      {/* ADD PLAYLIST LIST */}
      <MusicPlaylistList
        data={playlist.items}
        // onFetchMore={() => fetchMore()}
        ListHeaderComponent={
          <MusicPlaylistHeader
            image={playlist.thumbnailImage}
            title={playlist.title}
            subtitle={"Subtitle"}
            // onPlayPress={() => }
          />
        }
      />
    </View>
  );
}
