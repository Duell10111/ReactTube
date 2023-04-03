import React from "react";
import { Image, StyleSheet, TouchableOpacity, useWindowDimensions, View } from "react-native";
import {pageElements, pageSegment} from "youtube-extractor/dist/src/types";
import VideoComponent from "./VideoComonent";
import { useNavigation } from "@react-navigation/native";

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

  const {width} = useWindowDimensions();
  if (element.type === "video") {
    return (
      <TouchableOpacity onPress={() => navigation.navigate("VideoScreen", {videoId: element.videoId})}>
        <Image
          source={{
            uri: element.thumbnails.thumbnails[0].url,
            height: element.thumbnails.thumbnails[0].height,
            width: element.thumbnails.thumbnails[0].width,
          }}
        />
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  segmentContainer: {

  }
});
