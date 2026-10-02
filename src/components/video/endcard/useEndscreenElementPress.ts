import {useNavigation} from "@react-navigation/native";
import * as Linking from "expo-linking";
import {useCallback} from "react";
import {DeviceEventEmitter} from "react-native";

import {PausePlayerEvent} from "@/components/video/videoPlayer/VideoPlayer";
import type {YTEndscreenElement} from "@/extraction/Types";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("VIDEO_ENDCARD");

/** Opens what an end card points at: a video, a playlist, a channel, or a site. */
export function useEndscreenElementPress() {
  const navigation = useNavigation<RootNavProp>();

  return useCallback(
    (element: YTEndscreenElement) => {
      switch (element.style) {
        case "CHANNEL":
          navigation.navigate("ChannelScreen", {
            channelId: element.navEndpoint.payload.browseId,
          });
          // The channel screen sits on top of the player, which keeps running.
          DeviceEventEmitter.emit(PausePlayerEvent);
          return;
        case "VIDEO":
          navigation.navigate("VideoScreen", {
            navEndpoint: element.navEndpoint,
            videoId: element.navEndpoint?.payload?.videoId,
          });
          return;
        case "PLAYLIST":
          if (element.navEndpoint?.payload?.videoId) {
            navigation.navigate("VideoScreen", {
              navEndpoint: element.navEndpoint,
              videoId: element.navEndpoint.payload.videoId,
            });
          } else if (element.navEndpoint?.payload?.playlistId) {
            navigation.navigate("PlaylistScreen", {
              playlistId: element.navEndpoint.payload.playlistId,
            });
          }
          return;
        case "WEBSITE":
          Linking.openURL(element.navEndpoint.payload.url).catch(LOGGER.warn);
          return;
        default:
          LOGGER.warn(`Unknown end card type ${element.style}`);
      }
    },
    [navigation],
  );
}
