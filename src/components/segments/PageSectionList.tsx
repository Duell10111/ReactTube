import React from "react";
import {Platform, StyleSheet, Text, View} from "react-native";

import {useAppStyle} from "../../context/AppStyleContext";
import {HorizontalData} from "../../extraction/ShelfExtraction";
import {Helpers} from "../../utils/Youtube";
import HorizontalVideoList from "../HorizontalVideoList";

interface Props {
  headerText?: string;
  content: Helpers.YTNode[] | HorizontalData;
}

export default function PageSectionList({headerText, content}: Props) {
  const {style} = useAppStyle();

  if (Array.isArray(content)) {
    console.warn("PageSectionList: OLDWAY!");
  }

  return (
    <View style={styles.containerStyle}>
      <View style={styles.border} />
      <Text
        style={[
          styles.textStyle,
          {color: style.textColor},
          !Platform.isTV ? {fontSize: 20} : undefined,
        ]}>
        {headerText}
      </Text>
      <HorizontalVideoList
        containerStyle={{marginBottom: 20}}
        nodes={Array.isArray(content) ? content : content.parsedData}
      />
      <View style={styles.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    marginVertical: 50,
  },
  textStyle: {
    fontSize: 25,
    paddingBottom: 10,
  },
  border: {
    width: "100%",
    height: 1,
    backgroundColor: "#888888",
  },
});
