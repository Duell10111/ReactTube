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
import {Icon} from "@rneui/base";

interface Props {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  playlistId: string;
  title: string;
  videoCount?: string;
  thumbnailURL?: string;
  author?: string;
}

export default function PlaylistCard({
  style,
  textStyle,
  videoCount,
  ...data
}: Props) {
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
        <View style={styles.bottomBorder}>
          <Icon name={"book"} color={"white"} />
        </View>
        {videoCount ? (
          <View style={styles.countContainer}>
            <Text style={styles.countStyle}>{videoCount} Videos</Text>
          </View>
        ) : null}
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
    backgroundColor: "grey", // TODO: REMOVE???
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
