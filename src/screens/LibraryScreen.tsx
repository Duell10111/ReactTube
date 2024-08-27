import React from "react";
import {Platform, View} from "react-native";

import GridView from "../components/GridView";
import useLibrary from "../hooks/useLibrary";

export default function LibraryDrawerItem() {
  const {content, fetchMore} = useLibrary();

  return (
    <View>
      <GridView
        shelfItem={content}
        onEndReached={() => fetchMore().catch(console.warn)}
        horizontalListSegmentStyle={!Platform.isTV ? {maxWidth: 50} : undefined}
      />
    </View>
  );
}
