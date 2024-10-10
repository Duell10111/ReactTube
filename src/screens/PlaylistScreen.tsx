import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import {Platform, Text, View} from "react-native";

import GridView from "../components/GridView";
import LoadingComponent from "../components/general/LoadingComponent";
import {useAppStyle} from "../context/AppStyleContext";
import usePlaylistDetails from "../hooks/usePlaylistDetails";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import Logger from "../utils/Logger";
import {recursiveTypeLogger} from "../utils/YTNodeLogger";

import GridFeedView from "@/components/grid/GridFeedView";
import PlaylistScreenPhone from "@/components/playlists/phone/PlaylistScreen";
import PlaylistScreenTV from "@/components/playlists/tv/PlaylistScreen";

const LOGGER = Logger.extend("PLAYLIST");

type Props = NativeStackScreenProps<RootStackParamList, "PlaylistScreen">;

export default function PlaylistScreen({route}: Props) {
  const {playlistId} = route.params;

  if (Platform.isTV) {
    return <PlaylistScreenTV playlistId={playlistId} />;
  }

  return <PlaylistScreenPhone playlistId={playlistId} />;

  const {playlist, data, fetchMore} = usePlaylistDetails(playlistId);

  const {style} = useAppStyle();

  LOGGER.debug("Playlist: ", JSON.stringify(playlist));

  if (playlist === undefined) {
    return <LoadingComponent />;
  }

  // LOGGER.debug("Playlist: ", recursiveTypeLogger([playlist.page_contents]));

  return (
    <View style={{margin: Platform.isTV ? 20 : 0, flex: 1}}>
      <Text
        style={[{fontSize: Platform.isTV ? 25 : 20, color: style.textColor}]}>
        {playlist.title}
      </Text>
      <Text style={{fontSize: Platform.isTV ? 20 : 15, color: style.textColor}}>
        {playlist.originalData?.info?.last_updated}
      </Text>
      <GridFeedView
        items={data}
        onEndReached={fetchMore}
        contentContainerStyle={{paddingBottom: 50}}
      />
    </View>
  );
}
