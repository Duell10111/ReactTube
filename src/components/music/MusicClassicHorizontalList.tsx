import React from "react";
import {Platform, StyleSheet, Text, View} from "react-native";

import {MusicHorizontalElementsList} from "@/components/music/MusicHorizontalElementsList";
import {useAppStyle} from "@/context/AppStyleContext";
import {HorizontalData} from "@/extraction/ShelfExtraction";

interface MusicClassicHorizontalListProps {
  data: HorizontalData;
}

export function MusicClassicHorizontalList({
  data,
}: MusicClassicHorizontalListProps) {
  const {style} = useAppStyle();

  return (
    <View style={styles.containerStyle}>
      {/*<View style={styles.border} />*/}
      <Text
        style={[
          styles.textStyle,
          {color: style.textColor},
          !Platform.isTV ? {fontSize: 20} : undefined,
        ]}>
        {data.title}
      </Text>
      <MusicHorizontalElementsList
        containerStyle={{marginBottom: 0}}
        elements={data.parsedData}
        videoSegmentStyle={{maxWidth: 100, marginHorizontal: 5}}
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
