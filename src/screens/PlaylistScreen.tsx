import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import {Platform} from "react-native";

import Logger from "../utils/Logger";

import PlaylistScreenPhone from "@/components/playlists/phone/PlaylistScreen";
import PlaylistScreenTV from "@/components/playlists/tv/PlaylistScreen";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

const LOGGER = Logger.extend("PLAYLIST");

type Props = NativeStackScreenProps<RootStackParamList, "PlaylistScreen">;

export default function PlaylistScreen({route}: Props) {
  const {playlistId} = route.params;

  if (Platform.isTV) {
    return <PlaylistScreenTV playlistId={playlistId} />;
  }

  return <PlaylistScreenPhone playlistId={playlistId} />;
}
