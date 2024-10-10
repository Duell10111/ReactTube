import {Icon} from "@rneui/base";
import {Image} from "expo-image";
import _ from "lodash";
import React, {useMemo} from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";

import ChannelIcon from "@/components/video/ChannelIcon";
import {useAppStyle} from "@/context/AppStyleContext";
import {PlaylistData} from "@/extraction/Types";

interface PlaylistCardProps {
  element: PlaylistData;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  width?: ViewStyle["width"];
}

export function PlaylistCard({element, style, onPress}: PlaylistCardProps) {
  const {style: appStyle} = useAppStyle();
  const {width} = useWindowDimensions();

  const subtitleContent = useMemo(() => {
    return _.chain([element.author?.name]).compact().value();
  }, [element]);

  return (
    <View style={[styles.container, {minWidth: 150, maxWidth: width}, style]}>
      <TouchableNativeFeedback onPress={onPress}>
        <View style={[styles.segmentContainer]}>
          <Image
            style={styles.imageStyle}
            resizeMode={"cover"}
            source={{
              uri: element.thumbnailImage?.url,
            }}
          />
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
});
