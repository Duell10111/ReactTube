import React, {useCallback} from "react";
import {FlatList, StyleProp, TextStyle} from "react-native";
import {Helpers, YTNodes} from "../utils/Youtube";
import VideoSegment from "./VideoSegment";
import Logger from "../utils/Logger";
import {keyExtractorItems} from "../utils/YTNodeKeyExtractor";
import ChannelSegment from "./ChannelSegment";

const LOGGER = Logger.extend("SEGMENT");

interface Props {
  textStyle?: StyleProp<TextStyle>;
  nodes: Helpers.YTNode[];
}

export default function HorizontalVideoList({nodes, textStyle}: Props) {
  const renderItem = useCallback(
    ({item}: {item: Helpers.YTNode}) => {
      if (item.is(YTNodes.RichItem)) {
        return <VideoSegment element={item.content} textStyle={textStyle} />;
      } else if (item.is(YTNodes.Video)) {
        return <VideoSegment element={item} textStyle={textStyle} />;
      } else if (item.is(YTNodes.GridVideo)) {
        return <VideoSegment element={item} textStyle={textStyle} />;
      } else if (item.is(YTNodes.CompactVideo)) {
        return <VideoSegment element={item} textStyle={textStyle} />;
      } else if (item.is(YTNodes.ReelItem)) {
        return <VideoSegment element={item} textStyle={textStyle} />;
      } else if (item.is(YTNodes.GridChannel)) {
        return <ChannelSegment element={item} />;
      } else {
        LOGGER.warn("Unknown Videolist type: ", item.type);
      }
      return null;
    },
    [textStyle],
  );

  const keyExtractor = useCallback((item: Helpers.YTNode) => {
    return keyExtractorItems(item);
  }, []);

  return (
    <FlatList
      horizontal
      data={nodes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
    />
  );
}
