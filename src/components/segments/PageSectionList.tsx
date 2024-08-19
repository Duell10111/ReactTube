import React from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import {useAppStyle} from "../../context/AppStyleContext";
import {HorizontalData} from "../../extraction/ShelfExtraction";
import {Helpers} from "../../utils/Youtube";
import HorizontalVideoList from "../HorizontalVideoList";

interface Props {
  headerText?: string;
  content: Helpers.YTNode[] | HorizontalData;
  horizontalListSegmentStyle?: StyleProp<ViewStyle>;
}

export default function PageSectionList({
  headerText,
  content,
  horizontalListSegmentStyle,
}: Props) {
  const {style} = useAppStyle();

  if (Array.isArray(content)) {
    console.warn("PageSectionList: OLDWAY!");
  }

  return (
    <View style={styles.containerStyle}>
      {/*<View style={styles.border} />*/}
      <Text
        style={[
          styles.textStyle,
          {color: style.textColor},
          !Platform.isTV ? {fontSize: 20} : undefined,
        ]}>
        {headerText}
      </Text>
      <HorizontalVideoList
        containerStyle={{marginBottom: 0}}
        nodes={Array.isArray(content) ? content : content.parsedData}
        videoSegmentStyle={horizontalListSegmentStyle}
      />
      {/*<View style={styles.border} />*/}
    </View>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    marginVertical: 0,
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
