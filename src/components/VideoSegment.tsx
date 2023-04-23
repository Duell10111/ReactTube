import React from "react";
import {Helpers, YTNodes} from "../utils/Youtube";
import {StyleProp, StyleSheet, TextStyle, ViewStyle} from "react-native";
import Logger from "../utils/Logger";
import VideoCard from "./VideoCard";
import PlaylistCard from "./segments/PlaylistCard";

const LOGGER = Logger.extend("SEGMENT");

interface SegmentProps {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  element: Helpers.YTNode;
}

export default function VideoSegment({
  element,
  textStyle,
  ...props
}: SegmentProps) {
  const style = props.style ?? defaultStyle;

  if (element.is(YTNodes.Video)) {
    element.duration.text;
    return (
      <VideoCard
        style={style}
        textStyle={textStyle}
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
        textStyle={textStyle}
        videoId={element.id}
        title={element.title.text ?? ""}
        views={element.views.text ?? ""}
        duration={element.duration?.text}
        thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
      />
    );
  } else if (element.is(YTNodes.CompactVideo)) {
    return (
      <VideoCard
        style={style}
        textStyle={textStyle}
        videoId={element.id}
        title={element.title.text ?? ""}
        views={element.view_count.text ?? ""}
        duration={element.duration.text}
        thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
      />
    );
  } else if (element.is(YTNodes.ReelItem)) {
    return (
      <VideoCard
        style={style}
        textStyle={textStyle}
        videoId={element.id}
        title={element.title.text ?? ""}
        views={element.views.text ?? ""}
        thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
      />
    );
  } else if (element.is(YTNodes.PlaylistVideo)) {
    return (
      <VideoCard
        style={style}
        textStyle={textStyle}
        videoId={element.id}
        title={element.title.text ?? ""}
        views={""}
        thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
      />
    );
  } else if (element.is(YTNodes.GridPlaylist)) {
    return (
      <PlaylistCard
        style={style}
        textStyle={textStyle}
        playlistId={element.id}
        title={element.title.text ?? ""}
        thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
      />
    );
  } else if (element.is(YTNodes.Playlist)) {
    return (
      <PlaylistCard
        style={style}
        textStyle={textStyle}
        playlistId={element.id}
        title={element.title.text ?? ""}
        thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
      />
    );
  } else {
    LOGGER.debug("Unknown Video Segment Type: ", element.type);
  }

  return null;
}

const defaultStyle = {padding: 20};
