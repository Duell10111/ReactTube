import React from "react";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import {Text, View} from "react-native";
import LoadingComponent from "../components/general/LoadingComponent";
import usePlaylistDetails from "../hooks/usePlaylistDetails";
import HomeShelf from "../components/HomeShelf";
import Logger from "../utils/Logger";
import {YTNodes} from "../utils/Youtube";
import SectionList from "../components/channel/SectionList";
import {recursiveTypeLogger} from "../utils/YTNodeLogger";
import {useAppStyle} from "../context/AppStyleContext";

const LOGGER = Logger.extend("PLAYLIST");

type Props = NativeStackScreenProps<RootStackParamList, "PlaylistScreen">;

export default function PlaylistScreen({route}: Props) {
  const {playlistId} = route.params;
  const {playlist, data, fetchMore} = usePlaylistDetails(playlistId);

  const {style} = useAppStyle();

  if (!playlist) {
    return <LoadingComponent />;
  }

  LOGGER.debug("Playlist: ", recursiveTypeLogger([playlist.page_contents]));

  return (
    <View style={{margin: 20, flex: 1}}>
      <Text style={[{fontSize: 25, color: style.textColor}]}>
        {playlist.info.title}
      </Text>
      <Text style={{fontSize: 20, color: style.textColor}}>
        {playlist.info.last_updated}
      </Text>
      {/*{playlist.page_contents.is(YTNodes.SectionList) ? (*/}
      {/*  <SectionList*/}
      {/*    node={playlist.page_contents}*/}
      {/*    onEndReached={() => LOGGER.debug("End reached")}*/}
      {/*  />*/}
      {/*) : null}*/}
      <HomeShelf shelfItem={data} onEndReached={() => fetchMore()} />
    </View>
  );
}
