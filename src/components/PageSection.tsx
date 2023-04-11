import React from "react";
import {YTNodes} from "../utils/Youtube";
import {StyleSheet, Text, View} from "react-native";
import VerticalVideoList from "./VerticalVideoList";
import Logger from "../utils/Logger";

const LOGGER = Logger.extend("PAGE");

interface Props {
  node: YTNodes.RichSection;
}

export default function PageSection({node}: Props) {
  if (node.content.is(YTNodes.RichShelf)) {
    return (
      <View>
        <Text style={styles.textStyle}>{node.content.title.text}</Text>
        <VerticalVideoList nodes={node.content.contents} />
      </View>
    );
  } else {
    LOGGER.warn("Unknown PageSection type: ", node.type);
  }
  return null;
}

const styles = StyleSheet.create({
  textStyle: {
    fontSize: 25,
  },
});
