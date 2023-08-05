import React from "react";
import {YTNodes, Helpers} from "../utils/Youtube";
import PageSection from "./PageSection";
import VideoSegment from "./VideoSegment";
import {HorizontalData} from "../extraction/ShelfExtraction";
import PageSectionList from "./segments/PageSectionList";

interface Props {
  segment: Helpers.YTNode | HorizontalData;
}

export default function PageSegment({segment}: Props) {
  if (!(segment instanceof Helpers.YTNode)) {
    console.log("Title: ", segment.title);
    return <PageSectionList content={segment} headerText={segment.title} />;
  } else {
    if (segment.is(YTNodes.RichItem) && segment.content) {
      return <VideoSegment element={segment.content} />;
    } else if (segment.is(YTNodes.RichSection) && segment.content) {
      return <PageSection node={segment.content} />;
    } else if (segment.is(YTNodes.Video)) {
      return <VideoSegment element={segment} />;
    } else if (segment.is(YTNodes.PlaylistVideo)) {
      return <VideoSegment element={segment} />;
    } else if (segment.is(YTNodes.ReelItem)) {
      return <VideoSegment element={segment} />;
    } else if (segment.is(YTNodes.GridPlaylist)) {
      return <VideoSegment element={segment} />;
    } else if (segment.is(YTNodes.Playlist)) {
      return <VideoSegment element={segment} />;
    } else if (segment.is(YTNodes.Shelf)) {
      return <PageSection node={segment} />;
    } else if (segment.is(YTNodes.ReelShelf)) {
      return <PageSection node={segment} />;
    } else if (segment.is(YTNodes.ItemSection)) {
      return segment.contents && segment.contents.length > 0 ? (
        <PageSection node={segment.contents[0]} />
      ) : null;
    } else {
      console.log("Unknown PageSegment type: ", segment.type);
      return null;
    }
  }
  return null;
}
