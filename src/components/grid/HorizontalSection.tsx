import React from "react";
import {StyleProp, StyleSheet, Text, View, ViewStyle} from "react-native";

import {HorizontalElementsList} from "@/components/elements/phone/HorizontalElementsList";
import {useAppStyle} from "@/context/AppStyleContext";
import {HorizontalData} from "@/extraction/ShelfExtraction";

interface Props {
  headerText?: string;
  content: HorizontalData;
  horizontalListContainerStyle?: StyleProp<ViewStyle>;
  horizontalListSegmentStyle?: StyleProp<ViewStyle>;
}

export function HorizontalSection({
  headerText,
  content,
  horizontalListContainerStyle,
  horizontalListSegmentStyle,
}: Props) {
  const {style} = useAppStyle();
  return (
    <View style={styles.containerStyle}>
      {headerText ? (
        <Text style={[styles.textStyle, {color: style.textColor}]}>
          {headerText}
        </Text>
      ) : null}
      <HorizontalElementsList
        // containerStyle={{marginBottom: 0}}
        elements={content.parsedData}
        containerStyle={horizontalListContainerStyle}
        videoSegmentStyle={horizontalListSegmentStyle}
      />
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
});
