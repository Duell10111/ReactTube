import React from "react";
import {Platform, StyleProp, TextStyle, ViewStyle} from "react-native";

import PlaylistCard from "./segments/PlaylistCard";
import VideoCard from "./segments/VideoCard";
import Logger from "../utils/Logger";

import {ElementData} from "@/extraction/Types";

const LOGGER = Logger.extend("SEGMENT");

interface SegmentProps {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  element: ElementData;
}

// OLD WAY: Should be replaced with VideoCard in elements/tv
export default function VideoSegment({
  element,
  textStyle,
  ...props
}: SegmentProps) {
  const style = props.style ?? defaultStyle;

  if (
    element.type === "video" ||
    element.type === "reel" ||
    element.type === "mix"
  ) {
    return (
      <VideoCard
        style={[style, element.type === "reel" ? reelStyle : {}]}
        textStyle={textStyle}
        data={element}
      />
    );
  } else if (element.type === "playlist") {
    return (
      <PlaylistCard
        style={style}
        textStyle={textStyle}
        playlistId={element.id}
        title={element.title}
        thumbnail={element.thumbnailImage}
        videoCount={element.videoCount}
        author={element.author}
        music={element.music}
      />
    );
  } else {
    LOGGER.warn("Unknown element data: ", element.type);
  }
  return null;
}

const defaultStyle = Platform.isTV ? {padding: 20} : {};

const reelStyle: StyleProp<ViewStyle> = Platform.isTV
  ? {width: 350, height: 750}
  : {};
