import {Image} from "expo-image";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";
import {VideoData} from "@/extraction/Types";

interface PlaylistListItemProps {
  element: VideoData;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function PlaylistListItem({
  element,
  style,
  onPress,
}: PlaylistListItemProps) {
  const {style: appStyle} = useAppStyle();

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={onPress}>
      <Image
        source={{uri: element.thumbnailImage.url}}
        style={styles.imageStyle}
      />
      <View style={styles.textContainer}>
        <Text
          style={[styles.titleStyle, {color: appStyle.textColor}]}
          numberOfLines={2}>
          {element.title}
        </Text>
        <Text style={[styles.subtitleStyle, {color: appStyle.textColor}]}>
          {element.author?.name ?? element.originalNode.type}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
  },
  imageStyle: {
    aspectRatio: 1.7,
    borderRadius: 5,
  },
  textContainer: {
    justifyContent: "flex-start",
    flexShrink: 1,
    paddingStart: 10,
  },
  titleStyle: {
    fontSize: 16,
    textAlign: "left",
  },
  subtitleStyle: {
    fontSize: 12,
  },
});
