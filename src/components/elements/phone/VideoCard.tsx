import {Icon} from "@rneui/base";
import {Image} from "expo-image";
import _ from "lodash";
import React, {useMemo} from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  View,
  ViewStyle,
} from "react-native";

import ChannelIcon from "@/components/video/ChannelIcon";
import {useAppStyle} from "@/context/AppStyleContext";
import {VideoData} from "@/extraction/Types";

interface VideoCardProps {
  element: VideoData;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  width?: ViewStyle["width"];
}

export function VideoCard({element, style, onPress, width}: VideoCardProps) {
  const {style: appStyle} = useAppStyle();

  const progressVideo = element?.thumbnailOverlays?.videoProgress
    ? element.thumbnailOverlays.videoProgress * 100
    : undefined;

  const subtitleContent = useMemo(() => {
    return _.chain([
      element.author?.name,
      element.short_views,
      element.publishDate,
    ])
      .compact()
      .value();
  }, [element]);

  return (
    <View
      testID={"video-card"}
      style={[
        styles.container,
        {minWidth: 150, maxWidth: width},
        {width},
        style,
      ]}>
      <TouchableNativeFeedback onPress={onPress}>
        <View style={[styles.segmentContainer]}>
          <Image
            style={styles.imageStyle}
            resizeMode={"cover"}
            source={{
              uri: element.thumbnailImage?.url,
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
      </TouchableNativeFeedback>
      <View style={styles.metadataContainer}>
        {element.author?.thumbnail ? (
          <ChannelIcon
            channelId={element.author?.id ?? ""}
            thumbnailUrl={element.author?.thumbnail.url}
            imageStyle={{width: 50, height: 50}}
          />
        ) : null}
        <View style={styles.titleContainer}>
          <Text style={[styles.titleStyle, {color: appStyle.textColor}]}>
            {element.title}
          </Text>
          {subtitleContent.length > 0 ? (
            <Text style={[styles.subtitleStyle, {color: appStyle.textColor}]}>
              {subtitleContent.join(" · ")}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor: "blue",
    marginVertical: 5,
    flex: 0,
  },
  segmentContainer: {
    backgroundColor: "#aaaaaa",
    // borderRadius: 25,
    overflow: "hidden",
    aspectRatio: 1.7,
    alignItems: "center",
  },
  imageStyle: {
    width: "100%",
    height: "100%",
    // backgroundColor: "grey", // TODO: REMOVE?
  },
  metadataContainer: {
    width: "100%",
    flexDirection: "row",
    // backgroundColor: "purple",
  },
  titleContainer: {
    justifyContent: "flex-start",
    marginStart: 10,
    marginEnd: 10,
    // backgroundColor: "red",
    width: "85%",
  },
  titleStyle: {
    fontSize: 15,
    maxHeight: 50,
    flexWrap: "wrap",
    paddingEnd: 20,
  },
  subtitleStyle: {
    fontSize: 12,
  },
  countContainer: {
    position: "absolute",
    right: 10,
    bottom: 10,
    color: "white",
    backgroundColor: "black",
    padding: 5,
    fontSize: 15,
  },
  liveContainer: {
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: "black",
    padding: 5,
    fontSize: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  liveStyle: {
    fontSize: 15,
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
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: "red",
    width: "100%",
    height: 3,
  },
});
