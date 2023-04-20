import React from "react";
import {YTNodes, Helpers} from "../utils/Youtube";
import {StyleSheet, Text, View} from "react-native";
import HorizontalVideoList from "./HorizontalVideoList";
import Logger from "../utils/Logger";

const LOGGER = Logger.extend("PAGE");

interface Props {
  node: Helpers.YTNode;
}

export default function PageSection({node}: Props) {
  if (node.is(YTNodes.RichShelf)) {
    return (
      <View>
        <Text style={styles.textStyle}>{node.title.text}</Text>
        <HorizontalVideoList nodes={node.contents} />
      </View>
    );
  } else if (node.is(YTNodes.Shelf) && node.content?.is(YTNodes.VerticalList)) {
    return (
      <View>
        <Text style={styles.textStyle}>{node.title.text}</Text>
        <HorizontalVideoList nodes={node.content.contents} />
      </View>
    );
  } else if (
    node.is(YTNodes.Shelf) &&
    node.content?.is(YTNodes.HorizontalList)
  ) {
    return (
      <View>
        <Text style={styles.textStyle}>{node.title.text}</Text>
        <HorizontalVideoList nodes={node.content.contents} />
      </View>
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
