import {useNavigation, useRoute} from "@react-navigation/native";
import React from "react";
import {Platform, StyleProp, TextStyle, ViewStyle} from "react-native";

import PlaylistCardPhone from "./phone/PlaylistCardPhone";
import PlaylistCardTV from "./tv/PlaylistCardTV";
import {Author, Thumbnail} from "../../extraction/Types";
import {NativeStackProp, RootRouteProp} from "../../navigation/types";

interface Props {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  playlistId: string;
  title: string;
  videoCount?: string;
  thumbnail?: Thumbnail;
  author?: Author;
  music?: boolean;
}

export default function PlaylistCard({...data}: Props) {
  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();

  const onPress = () => {
    const routeName = data.music ? "MusicPlaylistScreen" : "PlaylistScreen";
    if (route.name === routeName) {
      navigation.replace(routeName, {playlistId: data.playlistId});
    } else {
      navigation.navigate(routeName, {
        playlistId: data.playlistId,
      });
    }
  };

  if (Platform.isTV) {
    return (
      <PlaylistCardTV
        {...data}
        author={data.author?.name}
        thumbnailURL={data.thumbnail?.url}
        onPress={onPress}
      />
    );
  }

  return <PlaylistCardPhone {...data} onPress={onPress} />;
}
