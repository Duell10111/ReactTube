import React from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import {HorizontalElementsList} from "@/components/elements/tv/HorizontalElementsList";
import {useAppStyle} from "@/context/AppStyleContext";
import {HorizontalData} from "@/extraction/ShelfExtraction";

interface Props {
  headerText?: string;
  content: HorizontalData;
  horizontalListContainerStyle?: StyleProp<ViewStyle>;
  horizontalListSegmentStyle?: StyleProp<ViewStyle>;
}

export default function PageSectionList({
  headerText,
  content,
  horizontalListContainerStyle,
  horizontalListSegmentStyle,
}: Props) {
  const {style} = useAppStyle();

  return (
    <View style={styles.containerStyle}>
      {/*<View style={styles.border} />*/}
      {headerText ? (
        <Text
          style={[
            styles.textStyle,
            {color: style.textColor},
            !Platform.isTV ? {fontSize: 20} : undefined,
          ]}>
          {headerText}
        </Text>
      ) : null}
      <HorizontalElementsList
        // containerStyle={{marginBottom: 0}}
        elements={content.parsedData}
        containerStyle={horizontalListContainerStyle}
        videoSegmentStyle={horizontalListSegmentStyle}
      />
      {/*<View style={styles.border} />*/}
    </View>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    marginVertical: 0,
    flex: 1,
    width: "100%", // Use Full Width when used
    alignItems: "flex-start",
    // backgroundColor: "blue",
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
