import {CommonActions, useNavigation, useRoute} from "@react-navigation/native";
import {StyleProp, ViewStyle} from "react-native";

import {PlaylistCard} from "@/components/elements/tv/PlaylistCard";
import {VideoCard} from "@/components/elements/tv/VideoCard";
import {ElementData} from "@/extraction/Types";
import {NativeStackProp, RootRouteProp} from "@/navigation/types";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("ELEMENT_CARD");

interface ElementCardProps {
  element: ElementData;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  onPress?: () => void;
}

export function ElementCard({element, ...props}: ElementCardProps) {
  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();

  const onPress = () => {
    if (props.onPress) {
      props.onPress();
      return;
    }

    if (props.disabled) {
      return;
    }

    // TODO: Add init seconds params

    LOGGER.debug("State: ", navigation.getState());
    LOGGER.debug("Route name: ", route.name);
    LOGGER.debug("Nav Endpoint: ", element.navEndpoint);
    if (route.name === "VideoScreen") {
      LOGGER.debug("Replacing Video Screen");
      navigation.replace("VideoScreen", {
        videoId: element.id,
        navEndpoint: element.navEndpoint,
        reel: element.type === "reel",
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
      });
    }
  };

  if (
    element.type === "video" ||
    element.type === "reel" ||
    element.type === "mix"
  ) {
    return <VideoCard element={element} {...props} onPress={onPress} />;
  } else if (element.type === "channel") {
  } else if (element.type === "playlist") {
    return (
      <PlaylistCard
        element={element}
        {...props}
        onPress={() => {
          const routeName = element.music
            ? "MusicPlaylistScreen"
            : "PlaylistScreen";
          if (route.name === routeName) {
            navigation.replace(routeName, {playlistId: element.id});
          } else {
            navigation.navigate(routeName, {
              playlistId: element.id,
            });
          }
        }}
      />
    );
  }
  console.warn("Unknown ElementCard type: ", element.type);

  return null;
}
