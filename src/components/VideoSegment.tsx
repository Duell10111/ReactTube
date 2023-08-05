import React from "react";
import {Helpers, YTNodes} from "../utils/Youtube";
import {StyleProp, TextStyle, ViewStyle} from "react-native";
import Logger from "../utils/Logger";
import VideoCard from "./VideoCard";
import PlaylistCard from "./segments/PlaylistCard";
import {ElementData} from "../extraction/ElementData";

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
          title={element.title}
          views={element.short_views}
          duration={element.duration}
          author={element.author?.name}
          thumbnailURL={element.thumbnailImage?.url?.split("?")?.[0]}
          date={element.publishDate}
        />
      );
    } else if (element.type === "playlist") {
      return (
        <PlaylistCard
          style={style}
          textStyle={textStyle}
          playlistId={element.id}
          title={element.title}
          thumbnailURL={element.thumbnailImage.url?.split("?")?.[0]}
          videoCount={element.videoCount}
        />
      );
    } else {
      console.warn("Unknown element data: ", element.type);
    }
  } else {
    // console.warn("Used old way!")
    // TODO: Remove once not needed anymore!
    if (element.is(YTNodes.Video)) {
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
          date={element.published.text}
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
          date={element.published.text}
        />
      );
    } else if (element.is(YTNodes.Movie)) {
      // TODO: Currently not supported
      return (
        <VideoCard
          style={style}
          textStyle={textStyle}
          videoId={element.id}
          title={element.title.text ?? ""}
          views={""}
          duration={element.duration?.text}
          thumbnailURL={element.thumbnails[0]?.url?.split("?")?.[0]}
          disabled={true}
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
          date={element.published.text}
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
    } else if (element.is(YTNodes.Mix)) {
      // TODO: Support Mixes?
      return (
        <VideoCard
          style={style}
          textStyle={textStyle}
          videoId={element.id}
          title={element.title.text ?? ""}
          views={"MIX"}
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
  }
  return null;
}

const defaultStyle = {padding: 20};

const reelStyle: StyleProp<ViewStyle> = {width: 350, height: 750};
