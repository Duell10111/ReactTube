import React from "react";
import {StyleProp, ViewStyle} from "react-native";

import ChannelCard from "./ChannelCard";
import Logger from "../utils/Logger";

import {ChannelData} from "@/extraction/Types";

const LOGGER = Logger.extend("SEGMENT");

interface SegmentProps {
  style?: StyleProp<ViewStyle>;
  element: ChannelData;
}

export default function ChannelSegment({element}: SegmentProps) {
  if (element.author) {
    return (
      <ChannelCard
        id={element.id}
        channelName={element.author!.name}
        imageUrl={element.thumbnailImage.url}
      />
    );
  } else {
    LOGGER.warn(
      "Channel Element does not contain author name required: ",
      element.type,
    );
    return null;
  }
}
