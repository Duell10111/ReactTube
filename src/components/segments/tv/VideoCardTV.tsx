import React from "react";
import {useShelfVideoSelector} from "../../../context/ShelfVideoSelector";
import {useAppStyle} from "../../../context/AppStyleContext";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import VideoTouchable from "../../general/VideoTouchable";
import FastImage from "react-native-fast-image";
import {Icon} from "@rneui/base";
import {Author} from "../../../extraction/Types";

interface Props {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  videoId: string;
  title: string;
  views: string;
  duration?: string;
  thumbnailURL?: string;
  author?: Author;
  date?: string;
  disabled?: boolean;
  livestream?: boolean;
}

export default function VideoCardTV({
  style,
  textStyle,
  onPress,
  ...data
}: Props) {
  const {setSelectedVideo, onElementFocused} = useShelfVideoSelector();
  const {style: appStyle} = useAppStyle();

  return (
    <View style={[styles.viewContainer, style]}>
      <VideoTouchable
        // onFocus={() => console.log("Focus")}
        style={styles.segmentContainer}
        onPress={onPress}
        onFocus={onElementFocused}
        onLongPress={() => {
          setSelectedVideo(data.videoId);
        }}>
        <FastImage
          style={styles.imageStyle}
          source={{
            uri:
              data.thumbnailURL ??
              "https://www.cleverfiles.com/howto/wp-content/uploads/2018/03/minion.jpg",
          }}
        />
        {data.duration ? (
          <Text style={styles.countContainer}>{data.duration}</Text>
        ) : null}
        {data.livestream ? (
          <View style={styles.liveContainer}>
            <Icon name={"record"} type={"material-community"} color={"red"} />
            <Text style={styles.liveStyle}>Live</Text>
          </View>
        ) : null}
      </VideoTouchable>
      <Text style={[styles.titleStyle, {color: appStyle.textColor}, textStyle]}>
        {data.title}
      </Text>
      {data.author ? (
        <Text style={[{color: appStyle.textColor}, textStyle]}>
          {data.author?.name}
        </Text>
      ) : null}
      <Text style={[styles.viewsStyle, {color: appStyle.textColor}, textStyle]}>
        {data.views}
      </Text>
      {data.date ? (
        <Text style={[{color: appStyle.textColor}, textStyle]}>
          {data.date}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  viewContainer: {
    width: 500,
    height: 400,
    marginHorizontal: 20,
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
    backgroundColor: "grey", // TODO: REMOVE?
  },
  titleStyle: {
    fontSize: 25,
    maxWidth: "100%",
  },
  viewsStyle: {},
  countContainer: {
    position: "absolute",
    right: 10,
    bottom: 10,
    color: "white",
    backgroundColor: "black",
    padding: 5,
    fontSize: 20,
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
});