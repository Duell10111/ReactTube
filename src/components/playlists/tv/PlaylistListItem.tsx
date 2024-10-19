import {useNavigation} from "@react-navigation/native";
import {Image} from "expo-image";
import React, {useState} from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";
import {VideoData} from "@/extraction/Types";
import {NativeStackProp} from "@/navigation/types";

interface PlaylistListItem {
  element: VideoData;
}

export function PlaylistListItem({element}: PlaylistListItem) {
  const [focus, setFocus] = useState(false);
  const navigation = useNavigation<NativeStackProp>();
  const {style} = useAppStyle();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={{flexDirection: "row"}}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onPress={() => {
          navigation.navigate("VideoScreen", {
            videoId: element.id,
            navEndpoint: element.navEndpoint,
            reel: element.type === "reel",
          });
        }}>
        <View
          style={[
            styles.segmentContainer,
            focus ? {borderColor: "white"} : {},
          ]}>
          <Image
            style={styles.imageStyle}
            source={{uri: element.thumbnailImage.url}}
          />
          {element.duration ? (
            <Text style={styles.countContainer}>{element.duration}</Text>
          ) : null}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.titleStyle, {color: style.textColor}]}>
            {element.title}
          </Text>
          {element.type === "video" &&
          element.short_views &&
          element.publishDate ? (
            <Text
              style={{
                color: style.textColor,
              }}>{`${element.short_views} • ${element.publishDate}`}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    // backgroundColor: "blue",
  },
  // imageStyle: {
  //   backgroundColor: "#aaaaaa",
  //   borderRadius: 25,
  //   overflow: "hidden",
  //   borderWidth: 5,
  //   borderColor: "black",
  //   aspectRatio: 1.7,
  //   width: 300,
  // },
  segmentContainer: {
    width: 300,
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
  countContainer: {
    position: "absolute",
    right: 10,
    bottom: 10,
    color: "white",
    backgroundColor: "black",
    padding: 5,
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  titleStyle: {
    fontSize: 20,
  },
});
