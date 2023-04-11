import React from "react";
import {Helpers, YTNodes} from "../utils/Youtube";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import {useNavigation} from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import Logger from "../utils/Logger";

const LOGGER = Logger.extend("SEGMENT");

interface SegmentProps {
  style?: StyleProp<ViewStyle>;
  element: Helpers.YTNode;
}

export default function VideoSegment({element, style}: SegmentProps) {
  const navigation = useNavigation();

  if (element.is(YTNodes.Video)) {
    // console.log("Segment: ", JSON.stringify(element.thumbnails.thumbnails[0]));
    // console.log("Best Thumbnail ", element.best_thumbnail?.url);
    return (
      <View style={[styles.viewContainer, style]}>
        <TouchableOpacity
          // onFocus={() => console.log("Focus")}
          style={styles.segmentContainer}
          onPress={() =>
            navigation.navigate("VideoScreen", {videoId: element.id})
          }>
          <FastImage
            style={styles.imageStyle}
            source={{
              uri:
                element.best_thumbnail?.url?.split("?")?.[0] ??
                "https://www.cleverfiles.com/howto/wp-content/uploads/2018/03/minion.jpg",
            }}
          />
        </TouchableOpacity>
        <Text style={styles.titleStyle}>{element.title.text}</Text>
        <Text>{element.author.name}</Text>
      </View>
    );
  } else if (element.is(YTNodes.ReelItem)) {
    return (
      <View style={[styles.viewContainer, style]}>
        <TouchableOpacity
          // onFocus={() => console.log("Focus")}
          style={styles.segmentContainer}
          onPress={() =>
            navigation.navigate("VideoScreen", {videoId: element.id})
          }>
          <FastImage
            style={styles.imageStyle}
            source={{
              uri:
                element.thumbnails[0]?.url?.split("?")?.[0] ??
                "https://www.cleverfiles.com/howto/wp-content/uploads/2018/03/minion.jpg",
            }}
          />
        </TouchableOpacity>
        <Text style={styles.titleStyle}>{element.title.text}</Text>
      </View>
    );
  } else {
    console.log("Unknown Segment Type: ", JSON.stringify(element, null, 4));
  }

  return null;
}

const styles = StyleSheet.create({
  viewContainer: {
    width: 500,
    height: 400,
  },
  segmentContainer: {
    backgroundColor: "#aaaaaa",
    borderRadius: 25,
    overflow: "hidden",
    height: "70%",
  },
  imageStyle: {
    width: "100%",
    height: "100%",
    backgroundColor: "blue",
  },
  titleStyle: {
    fontSize: 25,
    maxWidth: "100%",
  },
});

export function keyExtractorVideo(videoNode: Helpers.YTNode): string {
  if (videoNode.is(YTNodes.Video)) {
    return videoNode.id;
  } else if (videoNode.is(YTNodes.ReelItem)) {
    return videoNode.id;
  } else if (videoNode.is(YTNodes.RichItem)) {
    return keyExtractorVideo(videoNode.content);
  } else {
    LOGGER.debug("Unknown keyExtractor type: ", videoNode.type);
  }
  return "";
}
