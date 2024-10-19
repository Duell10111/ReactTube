import {Image} from "expo-image";
import React, {useState} from "react";
import {StyleProp, StyleSheet, Text, View, ViewStyle} from "react-native";

import VideoTouchable from "@/components/general/VideoTouchable";
import {useAppStyle} from "@/context/AppStyleContext";
import {useShelfVideoSelector} from "@/context/ShelfVideoSelector";
import {PlaylistData} from "@/extraction/Types";

interface PlaylistCardProps {
  element: PlaylistData;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  width?: ViewStyle["width"];
}

export function PlaylistCard({
  element,
  style,
  onPress,
  width,
}: PlaylistCardProps) {
  const {style: appStyle} = useAppStyle();
  const {setSelectedVideo, onElementFocused} = useShelfVideoSelector();
  const [focus, setFocus] = useState(false);

  return (
    <VideoTouchable
      style={[styles.container, style, {width: width ?? 500}]}
      onPress={onPress}
      onFocus={() => {
        onElementFocused?.();
        setFocus(true);
      }}
      onBlur={() => setFocus(false)}
      onLongPress={() => {
        setSelectedVideo(element.id);
      }}>
      <View
        style={[styles.segmentContainer, focus ? {borderColor: "white"} : {}]}>
        <Image
          style={[styles.imageStyle]}
          source={{
            uri: element.thumbnailImage.url,
          }}
        />
        {element.videoCount ? (
          <View style={styles.countContainer}>
            <Text style={styles.countStyle}>
              {element.videoCount}
              {" Videos"}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.titleStyle, {color: appStyle.textColor}]}>
        {element.title}
      </Text>
      {element.author ? (
        <Text style={[{color: appStyle.textColor}]}>
          {element.author?.name}
        </Text>
      ) : null}
    </VideoTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
  segmentContainer: {
    backgroundColor: "#aaaaaa",
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 5,
    borderColor: "black",
    aspectRatio: 1.7,
  },
  imageStyle: {
    width: "100%",
    height: "100%",
    backgroundColor: "grey", // TODO: REMOVE?
  },
  titleStyle: {
    fontSize: 25,
    width: "100%",
    flexShrink: 1,
  },
  countContainer: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "black",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
  },
  countStyle: {
    color: "white",
    fontSize: 20,
  },
});
