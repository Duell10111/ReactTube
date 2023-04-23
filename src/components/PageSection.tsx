import React from "react";
import {YTNodes, Helpers} from "../utils/Youtube";
import {StyleSheet} from "react-native";
import Logger from "../utils/Logger";
import HomeShelf from "./HomeShelf";
import PageSectionList from "./segments/PageSectionList";

const LOGGER = Logger.extend("PAGE");

interface Props {
  node: Helpers.YTNode;
}

export default function PageSection({node}: Props) {
  if (node.is(YTNodes.RichShelf)) {
    return (
      <PageSectionList headerText={node.title.text} content={node.contents} />
    );
  } else if (node.is(YTNodes.ReelShelf)) {
    return (
      <PageSectionList headerText={node.title.text} content={node.contents} />
    );
  } else if (node.is(YTNodes.Shelf) && node.content?.is(YTNodes.VerticalList)) {
    return (
      <PageSectionList
        headerText={node.title.text}
        content={node.content.contents}
      />
    );
  } else if (
    node.is(YTNodes.Shelf) &&
    node.content?.is(YTNodes.HorizontalList)
  ) {
    return (
      <PageSectionList
        headerText={node.title.text}
        content={node.content.contents}
      />
    );
  } else if (node.is(YTNodes.PlaylistVideoList)) {
    //TODO: Use Vertical List?
    return (
      <HomeShelf shelfItem={node.videos.array()} onEndReached={() => {}} />
    );
  } else {
    LOGGER.info("Unknown PageSection type: ", node.type);
  }
  return null;
}

const styles = StyleSheet.create({
  textStyle: {
    fontSize: 25,
  },
});
