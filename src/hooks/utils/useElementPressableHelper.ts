import {CommonActions, useNavigation, useRoute} from "@react-navigation/native";

import {ElementData} from "@/extraction/Types";
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
    }
  };

  return {
    onPress,
  };
}
