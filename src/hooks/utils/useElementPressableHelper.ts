import {CommonActions, useNavigation, useRoute} from "@react-navigation/native";

import {ElementData, VideoData} from "@/extraction/Types";
import {NativeStackProp, RootRouteProp} from "@/navigation/types";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("ELEMENT_PRESSABLE_HELPER");

export default function useElementPressableHelper() {
  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();

  const onPress = (element: ElementData) => {
    if (
      element.type === "video" ||
      element.type === "reel" ||
      element.type === "mix"
    ) {
      LOGGER.debug("State: ", navigation.getState());
      LOGGER.debug("Route name: ", route.name);
      LOGGER.debug("Nav Endpoint: ", element.navEndpoint);
      const startDuration = getStartTimeIfNeeded(element);
      LOGGER.debug(`Start duration: ${startDuration}`);

      if (route.name === "VideoScreen") {
        LOGGER.debug("Replacing Video Screen");
        navigation.replace("VideoScreen", {
          videoId: element.id,
          navEndpoint: element.navEndpoint,
          reel: element.type === "reel",
          startSeconds: startDuration,
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
              videoId: element.id,
              navEndpoint: element.id,
              reel: element.type === "reel",
              startSeconds: startDuration,
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
          videoId: element.id,
          navEndpoint: element.navEndpoint,
          reel: element.type === "reel",
          startSeconds: startDuration,
        });
      }
    }
  };

  return {
    onPress,
  };
}

// Calculate resume time as not provided in Nav Endpoint most of the time
function getStartTimeIfNeeded(element: VideoData) {
  if (element.thumbnailOverlays?.videoProgress) {
    if (element.durationSeconds) {
      return element.durationSeconds * element.thumbnailOverlays?.videoProgress;
    } else if (element.duration) {
      return (
        secondsToReadableString(element.duration) *
        element.thumbnailOverlays?.videoProgress
      );
    }
  }
}

function secondsToReadableString(string: string) {
  const [seconds, minutes, hours] = string
    .trim()
    .split(":")
    .map(Number)
    .reverse();
  // console.log("Hours string: ", hours, minutes, seconds);

  // Alles in Sekunden umrechnen
  return (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0);
}
