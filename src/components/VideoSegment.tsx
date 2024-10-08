import React from "react";
import {Platform, StyleProp, TextStyle, ViewStyle} from "react-native";

import PlaylistCard from "./segments/PlaylistCard";
import VideoCard from "./segments/VideoCard";
import Logger from "../utils/Logger";
import {Helpers} from "../utils/Youtube";

import {ElementData} from "@/extraction/Types";

const LOGGER = Logger.extend("SEGMENT");

interface SegmentProps {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  element: Helpers.YTNode | ElementData;
}

export default function VideoSegment({
  element,
  textStyle,
  ...props
}: SegmentProps) {
  const style = props.style ?? defaultStyle;

  if (!(element instanceof Helpers.YTNode)) {
    if (element.type === "video" || element.type === "reel") {
      return (
        <VideoCard
          style={[style, element.type === "reel" ? reelStyle : {}]}
          textStyle={textStyle}
          videoId={element.id}
          reel={element.type === "reel"}
          title={element.title}
          views={element.short_views}
          duration={element.duration}
          author={element.author}
          thumbnail={element.thumbnailImage}
          date={element.publishDate}
          livestream={element.livestream}
          navEndpoint={element.navEndpoint}
          progressPercentage={
            element.thumbnailOverlays?.videoProgress
              ? element.thumbnailOverlays.videoProgress * 100
              : undefined
          }
          music={element.music}
        />
      );
    } else if (element.type === "mix") {
      return (
        <VideoCard
          style={style}
          textStyle={textStyle}
          videoId={element.id}
          navEndpoint={element.navEndpoint}
          title={element.title}
          views={element.short_views}
          duration={element.duration}
          author={element.author}
          thumbnail={element.thumbnailImage}
          date={element.publishDate}
          music={element.music}
          mix
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
  } else {
    LOGGER.error("Used old way in VideoSegment!");
    // TODO: Remove once not needed anymore!
  }
  return null;
}

const defaultStyle = Platform.isTV ? {padding: 20} : {};

const reelStyle: StyleProp<ViewStyle> = Platform.isTV
  ? {width: 350, height: 750}
  : {};
