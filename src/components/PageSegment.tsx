import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {useNavigation} from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import {YTNodes, Helpers} from "../utils/Youtube";
import PageSection from "./PageSection";
import VideoSegment from "./VideoSegment";

interface Props {
  segment: Helpers.YTNode;
}

export default function PageSegment({segment}: Props) {
  // console.log(JSON.stringify(segment, null, 4));
  // return <Text>test</Text>;
  if (segment.is(YTNodes.RichItem)) {
    return <VideoSegment element={segment.content} style={{padding: 20}} />;
  } else if (segment.is(YTNodes.RichSection)) {
    return <PageSection node={segment} />;
  } else {
    console.log("Unknown PageSegment type: ", JSON.stringify(segment, null, 4));
    return null;
  }
}

interface SegmentProps {
  element: Helpers.YTNode;
}

function Segment({element}: SegmentProps) {
  const navigation = useNavigation();

  if (element.is(YTNodes.Video)) {
    // console.log("Segment: ", JSON.stringify(element.thumbnails.thumbnails[0]));
    console.log("Best Thumbnail ", element.best_thumbnail?.url);
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
              uri:
                element.best_thumbnail?.url?.split("?")?.[0] ??
                "https://www.cleverfiles.com/howto/wp-content/uploads/2018/03/minion.jpg",
            }}
          />
        </TouchableOpacity>
        <Text style={styles.titleStyle}>{element.title.text}</Text>
        <Text>{element.author.name}</Text>
      </View>
    );
  } else {
    console.log("Unknown Segment Type: ", JSON.stringify(element, null, 4));
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
