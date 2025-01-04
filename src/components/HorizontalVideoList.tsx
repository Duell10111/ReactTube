import React, {useCallback} from "react";
import {FlatList, StyleProp, TextStyle, ViewStyle} from "react-native";

import ChannelSegment from "./ChannelSegment";
import VideoSegment from "./VideoSegment";
import Logger from "../utils/Logger";

import {ElementData} from "@/extraction/Types";

const LOGGER = Logger.extend("SEGMENT");

interface Props {
  videoSegmentStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  nodes: ElementData[];
  onEndReached?: () => void;
}

// OLD WAY: Should be replaced with HorizontalElementsList
export default function HorizontalVideoList({
  nodes,
  videoSegmentStyle,
  textStyle,
  onEndReached,
  containerStyle,
}: Props) {
  const renderItem = useCallback(
    ({item}: {item: ElementData}) => {
      if (item.type === "channel") {
        return <ChannelSegment element={item} />;
      } else {
        return (
          <VideoSegment
            element={item}
            textStyle={textStyle}
            style={videoSegmentStyle}
          />
        );
      }
    },
    [textStyle, videoSegmentStyle],
  );

  const keyExtractor = useCallback((item: ElementData, index: number) => {
    // Add index as sometimes a video occurs multiple times in a playlist for example
    return item.id + index;
  }, []);

  return (
    <FlatList
      contentContainerStyle={containerStyle}
      horizontal
      data={nodes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.7}
    />
  );
}
