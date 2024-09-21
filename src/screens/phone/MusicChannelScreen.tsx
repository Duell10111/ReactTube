import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import {View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import LoadingComponent from "../../components/general/LoadingComponent";
import usePlaylistDetails from "../../hooks/music/useMusicPlaylistDetails";
import Logger from "../../utils/Logger";

import {MusicChannelHeader} from "@/components/music/MusicChannelHeader";
import {MusicChannelList} from "@/components/music/MusicChannelList";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import useMusicChannelDetails from "@/hooks/music/useMusicChannelDetails";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

const LOGGER = Logger.extend("PLAYLIST");

type Props = NativeStackScreenProps<RootStackParamList, "MusicChannelScreen">;

export function MusicChannelScreen({navigation, route}: Props) {
  const {artistId} = route.params;
  const {artist} = useMusicChannelDetails(artistId);
  const {bottom, left, right} = useSafeAreaInsets();
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();

  if (!artist) {
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
      <MusicChannelList
        data={artist.data}
        // onFetchMore={() => fetchMore()}
        ListHeaderComponent={
          <MusicChannelHeader
            image={artist.thumbnail}
            title={artist.title}
            // subtitle={artist.description}
            onPlayPress={() => {
              if (artist.playEndpoint) {
                setPlaylistViaEndpoint(artist.playEndpoint);
                navigation.navigate("MusicPlayerScreen");
              }
            }}
          />
        }
      />
    </View>
  );
}
