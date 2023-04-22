import VideoTouchable from "./general/VideoTouchable";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import React from "react";
import {useNavigation, useRoute} from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import {useShelfVideoSelector} from "../context/ShelfVideoSelector";
import {NativeStackProp, RootRouteProp} from "../navigation/types";

interface Props {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  videoId: string;
  title: string;
  views: string;
  duration?: string;
  thumbnailURL?: string;
  author?: string;
}

export default function VideoCard({style, textStyle, ...data}: Props) {
  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();
  const {setSelectedVideo} = useShelfVideoSelector();

  return (
    <View style={[styles.viewContainer, style]}>
      <VideoTouchable
        // onFocus={() => console.log("Focus")}
        style={styles.segmentContainer}
        onPress={() => {
          if (route.name === "VideoScreen") {
            navigation.replace("VideoScreen", {videoId: data.videoId});
          } else {
            navigation.navigate("VideoScreen", {videoId: data.videoId});
          }
        }}
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
        <Text style={styles.timeStyle}>{data.duration}</Text>
      </VideoTouchable>
      <Text style={[styles.titleStyle, textStyle]}>{data.title}</Text>
      {data.author ? <Text style={textStyle}>{data.author}</Text> : null}
      <Text style={[styles.viewsStyle, textStyle]}>{data.views}</Text>
    </View>
  );
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
  viewsStyle: {},
  timeStyle: {
    position: "absolute",
    right: 10,
    bottom: 10,
    color: "white",
    backgroundColor: "black",
    padding: 1,
  },
});
