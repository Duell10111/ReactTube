import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import {useNavigation, useRoute} from "@react-navigation/native";
import {NativeStackProp, RootRouteProp} from "../../navigation/types";
import VideoTouchable from "../general/VideoTouchable";
import FastImage from "react-native-fast-image";
import {useAppStyle} from "../../context/AppStyleContext";

interface Props {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  playlistId: string;
  title: string;
  duration?: string;
  thumbnailURL?: string;
  author?: string;
}

export default function PlaylistCard({style, textStyle, ...data}: Props) {
  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();
  const {style: appStyle} = useAppStyle();

  return (
    <View style={[styles.viewContainer, style]}>
      <VideoTouchable
        // onFocus={() => console.log("Focus")}
        style={styles.segmentContainer}
        onPress={() => {
          if (route.name === "PlaylistScreen") {
            navigation.replace("PlaylistScreen", {playlistId: data.playlistId});
          } else {
            navigation.navigate("PlaylistScreen", {
              playlistId: data.playlistId,
            });
          }
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
    backgroundColor: "grey", // TODO: REMOVE???
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
