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
import {CommonActions, useNavigation, useRoute} from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import {useShelfVideoSelector} from "../context/ShelfVideoSelector";
import {NativeStackProp, RootRouteProp} from "../navigation/types";
import {useAppStyle} from "../context/AppStyleContext";
import Logger from "../utils/Logger";

const LOGGER = Logger.extend("VIDEOCARD");

interface Props {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  videoId: string;
  title: string;
  views: string;
  duration?: string;
  thumbnailURL?: string;
  author?: string;
  date?: string;
  disabled?: boolean;
}

export default function VideoCard({style, textStyle, ...data}: Props) {
  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();
  const {setSelectedVideo, onElementFocused} = useShelfVideoSelector();
  const {style: appStyle} = useAppStyle();

  return (
    <View style={[styles.viewContainer, style]}>
      <VideoTouchable
        // onFocus={() => console.log("Focus")}
        style={styles.segmentContainer}
        onPress={() => {
          if (data.disabled) {
            return;
          }
          LOGGER.debug("State: ", navigation.getState());
          LOGGER.debug("Route name: ", route.name);
          if (route.name === "VideoScreen") {
            LOGGER.debug("Replacing Video Screen");
            navigation.replace("VideoScreen", {videoId: data.videoId});
          } else if (
            navigation
              .getState()
              .routes.find(route => route.name == "VideoScreen")
          ) {
            LOGGER.debug("Remove all existing Video Screens");
            navigation.dispatch(state => {
              const routes = state.routes.filter(r => r.name !== "VideoScreen");

              routes.push({
                name: "VideoScreen",
                params: {videoId: data.videoId},
              });

              return CommonActions.reset({
                ...state,
                routes,
                index: routes.length - 1,
              });
            });
          } else {
            navigation.navigate("VideoScreen", {videoId: data.videoId});
          }
        }}
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
        <Text style={styles.timeStyle}>{data.duration}</Text>
      </VideoTouchable>
      <Text style={[styles.titleStyle, {color: appStyle.textColor}, textStyle]}>
        {data.title}
      </Text>
      {data.author ? (
        <Text style={[{color: appStyle.textColor}, textStyle]}>
          {data.author}
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
  timeStyle: {
    position: "absolute",
    right: 10,
    bottom: 10,
    color: "white",
    backgroundColor: "black",
    padding: 5,
    fontSize: 20,
  },
});
