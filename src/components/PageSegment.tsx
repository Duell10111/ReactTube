import React from "react";
import {YTNodes, Helpers} from "../utils/Youtube";
import PageSection from "./PageSection";
import VideoSegment from "./VideoSegment";

interface Props {
  segment: Helpers.YTNode;
}

export default function PageSegment({segment}: Props) {
  // console.log(JSON.stringify(segment, null, 4));
  // return <Text>test</Text>;
  if (segment.is(YTNodes.RichItem)) {
    return <VideoSegment element={segment.content} style={{padding: 20}} />;
  } else if (segment.is(YTNodes.RichSection)) {
    return <PageSection node={segment.content} />;
  } else if (segment.is(YTNodes.Video)) {
    return <VideoSegment element={segment} style={{padding: 20}} />;
  } else if (segment.is(YTNodes.Shelf)) {
    return <PageSection node={segment} />;
  } else if (segment.is(YTNodes.ReelShelf)) {
    return <PageSection node={segment} />;
  } else {
    console.log("Unknown PageSegment type: ", segment.type);
    return null;
  }
}
