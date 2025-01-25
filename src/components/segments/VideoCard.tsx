import {CommonActions, useNavigation, useRoute} from "@react-navigation/native";
import React from "react";
import {Platform, StyleProp, TextStyle, ViewStyle} from "react-native";
import DeviceInfo from "react-native-device-info";

import ReelCardPhone from "./phone/ReelCardPhone";
import VideoCardPhone from "./phone/VideoCardPhone";
import VideoCardTV from "./tv/VideoCardTV";
import Logger from "../../utils/Logger";
import {YTNodes} from "../../utils/Youtube";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {Author, Thumbnail} from "@/extraction/Types";
import {NativeStackProp, RootRouteProp} from "@/navigation/types";

const LOGGER = Logger.extend("VIDEOCARD");

interface Props {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  videoId: string;
  navEndpoint?: YTNodes.NavigationEndpoint;
  title: string;
  views?: string;
  reel?: boolean;
  duration?: string;
  thumbnail?: Thumbnail;
  author?: Author;
  date?: string;
  disabled?: boolean;
  livestream?: boolean;
  mix?: boolean;
  progressPercentage?: number;
  music?: boolean;
  onPress?: () => void;
}

export default function VideoCard({style, ...data}: Props) {
  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();

  const onPress = () => {
    if (data.disabled) {
      return;
    }

    if (data.music) {
      // @ts-ignore
      setPlaylistViaEndpoint(data.navEndpoint);
      navigation.navigate("MusicPlayerScreen");
      return;
    }

    // TODO: Add init seconds params

    LOGGER.debug("State: ", navigation.getState());
    LOGGER.debug("Route name: ", route.name);
    LOGGER.debug("Nav Endpoint: ", data.navEndpoint);
    if (route.name === "VideoScreen") {
      LOGGER.debug("Replacing Video Screen");
      navigation.replace("VideoScreen", {
        videoId: data.videoId,
        navEndpoint: data.navEndpoint,
        reel: data.reel,
      });
    } else if (
      // @ts-ignore
      navigation.getState().routes.find(r => r.name === "VideoScreen")
    ) {
      LOGGER.debug("Remove all existing Video Screens");
      navigation.dispatch(state => {
        // @ts-ignore
        const routes = state.routes.filter(r => r.name !== "VideoScreen");
        routes.push({
          // @ts-ignore
          name: "VideoScreen",
          // @ts-ignore
          params: {
            videoId: data.videoId,
            navEndpoint: data.navEndpoint,
            reel: data.reel,
          },
        });

        return CommonActions.reset({
          ...state,
          routes,
          index: routes.length - 1,
        });
      });
    } else {
      navigation.navigate("VideoScreen", {
        videoId: data.videoId,
        navEndpoint: data.navEndpoint,
        reel: data.reel,
      });
    }
  };

  if (Platform.isTV) {
    return (
      <VideoCardTV
        {...data}
        thumbnailURL={data.thumbnail?.url}
        onPress={onPress}
      />
    );
  }

  if (data.reel) {
    return <ReelCardPhone {...data} onPress={onPress} />;
  }

  return (
    <VideoCardPhone
      {...data}
      onPress={onPress}
      style={[
        style,
        DeviceInfo.isTablet() ? {maxWidth: 375, padding: 10} : undefined,
      ]}
      imageContainerStyle={
        DeviceInfo.isTablet() ? {borderRadius: 25} : undefined
      }
    />
  );
}
