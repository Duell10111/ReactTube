import React from "react";
import {Helpers} from "../../utils/Youtube";
import {StyleSheet, Text, View} from "react-native";
import HorizontalVideoList from "../HorizontalVideoList";
import {useAppStyle} from "../../context/AppStyleContext";

interface Props {
  headerText?: string;
  content: Helpers.YTNode[];
}

export default function PageSectionList({headerText, content}: Props) {
  const {style} = useAppStyle();

  return (
    <View>
      <Text style={[styles.textStyle, {color: style.textColor}]}>
        {headerText}
      </Text>
      <HorizontalVideoList nodes={content} />
    </View>
  );
}

const styles = StyleSheet.create({
  textStyle: {
    fontSize: 25,
  },
});
