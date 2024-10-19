import {CommonActions, useNavigation, useRoute} from "@react-navigation/native";
import {StyleProp, ViewStyle} from "react-native";

import {PlaylistCard} from "@/components/elements/phone/PlaylistCard";
import ReelCard from "@/components/elements/phone/ReelCard";
import {VideoCard} from "@/components/elements/phone/VideoCard";
import {ElementData} from "@/extraction/Types";
import useElementPressableHelper from "@/hooks/utils/useElementPressableHelper";
import {NativeStackProp, RootRouteProp} from "@/navigation/types";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("ELEMENT_CARD");

interface ElementCardProps {
  element: ElementData;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  onPress?: () => void;
  width?: ViewStyle["width"];
}

export function ElementCard({element, ...props}: ElementCardProps) {
  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();

  const {onPress: onPressHelper} = useElementPressableHelper();

  const onPress = () => {
    onPressHelper(element);
  };

  if (element.type === "video" || element.type === "mix") {
    return <VideoCard element={element} {...props} onPress={onPress} />;
  } else if (element.type === "reel") {
    return <ReelCard element={element} {...props} onPress={onPress} />;
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
