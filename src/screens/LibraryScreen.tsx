import React from "react";
import {Platform, View} from "react-native";

import GridView from "../components/GridView";
import useLibrary from "../hooks/useLibrary";

import GridFeedView from "@/components/grid/GridFeedView";
import {LibraryScreen} from "@/components/screens/phone/LibraryScreen";

export default function LibraryDrawerItem() {
  const {content, fetchMore, parsedContent} = useLibrary();

  console.log(parsedContent);

  if (Platform.isTV) {
    // Not used atm as new Grid causes lacks
    // const {onScreenFocused} = useDrawerContext();

    return (
      // <ShelfVideoSelectorProvider onElementFocused={onScreenFocused}>
      <GridFeedView items={parsedContent} />
      // </ShelfVideoSelectorProvider>
    );
  }

  return <LibraryScreen items={parsedContent} />;

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
