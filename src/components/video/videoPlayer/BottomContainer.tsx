import React from "react";
import {ScrollView, StyleSheet, TVFocusGuideView, View} from "react-native";

import ShelfVideoSelectorProvider from "../../../context/ShelfVideoSelector";

interface Props {
  children: React.ReactNode;
  onFocus?: () => void;
}

export default function BottomContainer({children, onFocus}: Props) {
  return (
    <View style={styles.container}>
      <ShelfVideoSelectorProvider onElementFocused={onFocus}>
        <ScrollView>
          <TVFocusGuideView autoFocus>{children}</TVFocusGuideView>
        </ScrollView>
      </ShelfVideoSelectorProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#080808dd",
    paddingTop: 10,
    height: "100%", // TODO: Adapt for playlist scrollview
  },
});
