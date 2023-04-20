import React from "react";
import {Helpers, YTNodes} from "../utils/Youtube";
import {StyleProp, ViewStyle} from "react-native";
import Logger from "../utils/Logger";
import VideoCard from "./VideoCard";

const LOGGER = Logger.extend("SEGMENT");

interface SegmentProps {
  style?: StyleProp<ViewStyle>;
  element: Helpers.YTNode;
}

export default function VideoSegment({element, style}: SegmentProps) {
  if (element.is(YTNodes.Video)) {
    element.duration.text;
    return (
      <VideoCard
        style={style}
        videoId={element.id}
        title={element.title.text ?? ""}
        views={element.view_count.text ?? "0"}
        duration={element.duration.text ?? ""}
        author={element.author.name}
        thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
      />
    );
  } else if (element.is(YTNodes.GridVideo)) {
    return (
      <VideoCard
        style={style}
        videoId={element.id}
        title={element.title.text ?? ""}
        views={element.views.text ?? ""}
        thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
      />
    );
  } else if (element.is(YTNodes.CompactVideo)) {
    return (
      <VideoCard
        style={style}
        videoId={element.id}
        title={element.title.text ?? ""}
        views={element.view_count.text ?? ""}
        thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
      />
    );
  } else if (element.is(YTNodes.ReelItem)) {
    return (
      <VideoCard
        style={style}
        videoId={element.id}
        title={element.title.text ?? ""}
        views={element.views.text ?? ""}
        thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
      />
    );
  } else {
    LOGGER.debug("Unknown Video Segment Type: ", element.type);
  }

  return null;
}

export function keyExtractorVideo(videoNode: Helpers.YTNode): string {
  if (videoNode.is(YTNodes.Video)) {
    return videoNode.id;
  } else if (videoNode.is(YTNodes.ReelItem)) {
    return videoNode.id;
  } else if (videoNode.is(YTNodes.GridVideo)) {
    return videoNode.id;
  } else if (videoNode.is(YTNodes.CompactVideo)) {
    return videoNode.id;
  } else if (videoNode.is(YTNodes.RichItem)) {
    return keyExtractorVideo(videoNode.content);
  } else {
    LOGGER.debug("Unknown keyExtractor type: ", videoNode.type);
  }
  return "";
}
