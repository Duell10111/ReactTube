import React from "react";
import {Image, View} from "react-native";
import {pageElements, pageSegment} from "youtube-extractor/dist/src/types";
import VideoComponent from "./VideoComonent";

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
  if (element.type === "video") {
    return (
      <View>
        <Image
          source={{
            uri: element.thumbnails.thumbnails[0].url,
            height: element.thumbnails.thumbnails[0].height,
            width: element.thumbnails.thumbnails[0].width,
          }}
        />
        <VideoComponent videoId={element.videoId} />
      </View>
    );
  }

  return null;
}
