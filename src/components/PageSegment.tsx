import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {useNavigation} from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import {YTNodes, Helpers} from "../utils/Youtube";

interface Props {
  segment: Helpers.YTNode;
}

export default function PageSegment({segment}: Props) {
  // console.log(JSON.stringify(segment, null, 4));
  if (segment.is(YTNodes.Video)) {
    return <Segment element={segment} />;
  } else {
    console.log("Unknown type: ", JSON.stringify(segment, null, 4));
    return null;
  }

  // return (
  //   <View>
  //     {segment.contents.map((value, index) => (
  //       <Segment key={index} element={value} />
  //     ))}
  //   </View>
  // );
}

interface SegmentProps {
  element: Helpers.YTNode;
}

function Segment({element}: SegmentProps) {
  const navigation = useNavigation();

  if (element.is(YTNodes.Video)) {
    // console.log("Segment: ", JSON.stringify(element.thumbnails.thumbnails[0]));
    return (
      <View style={styles.viewContainer}>
        <TouchableOpacity
          // onFocus={() => console.log("Focus")}
          style={styles.segmentContainer}
          onPress={() =>
            navigation.navigate("VideoScreen", {videoId: element.id})
          }>
          <FastImage
            style={styles.imageStyle}
            source={{
              uri: element.best_thumbnail?.url ?? "",
            }}
          />
        </TouchableOpacity>
        <Text style={styles.titleStyle}>{element.title.text}</Text>
        <Text>{element.author.name}</Text>
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
