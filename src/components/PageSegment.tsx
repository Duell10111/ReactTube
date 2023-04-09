import React from "react";
import {Image, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {pageElements, pageSegment} from "youtube-extractor/dist/src/types";
import {useNavigation} from "@react-navigation/native";
import {selectThumbnail} from "../utils/ThumbnailSelector";
import FastImage from "react-native-fast-image";

interface Props {
  segment: pageSegment;
}

export default function PageSegment({segment}: Props) {
  return (
    <View>
      {segment.contents.map((value, index) => (
        <Segment key={index} element={value} />
      ))}
    </View>
  );
}

interface SegmentProps {
  element: pageElements;
}

function Segment({element}: SegmentProps) {
  const navigation = useNavigation();

  if (element.type === "video") {
    selectThumbnail(element.thumbnails.thumbnails);
    console.log("Segment: ", JSON.stringify(element.thumbnails.thumbnails[0]));
    return (
      <View style={styles.viewContainer}>
        <TouchableOpacity
          // onFocus={() => console.log("Focus")}
          style={styles.segmentContainer}
          onPress={() =>
            navigation.navigate("VideoScreen", {videoId: element.videoId})
          }>
          <FastImage
            style={styles.imageStyle}
            source={{
              uri: element.thumbnails.thumbnails[0].url,
            }}
          />
        </TouchableOpacity>
        <Text style={styles.titleStyle}>{element.title}</Text>
        <Text>{element.channelData.channelName}</Text>
      </View>
    );
  }

  return null;
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
});
