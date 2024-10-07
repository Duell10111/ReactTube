import {Icon} from "@rneui/base";
import {Image} from "expo-image";
import React, {useState} from "react";
import {StyleProp, StyleSheet, Text, View, ViewStyle} from "react-native";

import VideoTouchable from "@/components/general/VideoTouchable";
import {useAppStyle} from "@/context/AppStyleContext";
import {useShelfVideoSelector} from "@/context/ShelfVideoSelector";
import {VideoData} from "@/extraction/Types";

interface VideoCardProps {
  element: VideoData;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  width?: ViewStyle["width"];
}

export function VideoCard({element, style, onPress, width}: VideoCardProps) {
  const {style: appStyle} = useAppStyle();
  const {setSelectedVideo, onElementFocused} = useShelfVideoSelector();
  const [focus, setFocus] = useState(false);

  const progressVideo = element?.thumbnailOverlays?.videoProgress
    ? element.thumbnailOverlays.videoProgress * 100
    : undefined;

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
        {element.duration ? (
          <Text style={styles.countContainer}>{element.duration}</Text>
        ) : null}
        {element.livestream ? (
          <View style={styles.liveContainer}>
            <Icon name={"record"} type={"material-community"} color={"red"} />
            <Text style={styles.liveStyle}>{"Live"}</Text>
          </View>
        ) : null}
        {element.type === "mix" ? (
          <View style={styles.bottomBorder}>
            <Icon name={"playlist-play"} color={"white"} />
          </View>
        ) : null}
        {progressVideo ? (
          <View style={[styles.progressBar, {width: `${progressVideo}%`}]} />
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
      {element.short_views ? (
        <Text style={[{color: appStyle.textColor}]}>{element.short_views}</Text>
      ) : null}
      {element.publishDate ? (
        <Text style={[{color: appStyle.textColor}]}>{element.publishDate}</Text>
      ) : null}
    </VideoTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    // flexDirection: "row",
    flex: 0,
    // width: "100%",
    // minWidth: 500,
    // maxWidth: "100%",
  },
  segmentContainer: {
    backgroundColor: "#aaaaaa",
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 5,
    borderColor: "black",
    aspectRatio: 1.7,
  },
  liveContainer: {
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: "black",
    padding: 5,
    fontSize: 20,
    flexDirection: "row",
  },
  liveStyle: {
    fontSize: 20,
    color: "red",
  },
  bottomBorder: {
    position: "absolute",
    left: 0,
    bottom: 0,
    right: 0,
    height: "20%",
    backgroundColor: "#111111bb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 15,
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
    color: "white",
    backgroundColor: "black",
    padding: 5,
    fontSize: 20,
  },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: "red",
    width: "100%",
    height: 3,
  },
});
