import React, {useCallback} from "react";
import {FlatList} from "react-native";
import {Helpers, YTNodes} from "../utils/Youtube";
import VideoSegment, {keyExtractorVideo} from "./VideoSegment";
import Logger from "../utils/Logger";

const LOGGER = Logger.extend("SEGMENT");

interface Props {
  nodes: Helpers.YTNode[];
}

export default function VerticalVideoList({nodes}: Props) {
  const renderItem = useCallback(({item}: {item: Helpers.YTNode}) => {
    if (item.is(YTNodes.RichItem)) {
      return <VideoSegment element={item.content} style={{padding: 20}} />;
    } else {
      LOGGER.warn("Unknown Videolist type: ", item.type);
    }
    return null;
  }, []);

  const keyExtractor = useCallback((item: Helpers.YTNode) => {
    return keyExtractorVideo(item);
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
