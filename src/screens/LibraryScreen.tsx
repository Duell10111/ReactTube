import React from "react";
import {Platform} from "react-native";

import useLibrary from "../hooks/useLibrary";

import GridFeedView from "@/components/grid/GridFeedView";
import {LibraryScreen} from "@/components/screens/phone/LibraryScreen";
import {LibraryScreenTV} from "@/screens/LibraryScreenTV";

export default function LibraryDrawerItem() {
  // const {content, fetchMore, parsedContent} = useLibrary();

  // console.log(parsedContent);

  if (Platform.isTV) {
    return <LibraryScreenTV />;

    // Not used atm as new Grid causes lacks
    // const {onScreenFocused} = useDrawerContext();

    // TODO: Add more for library horizontal sections to get complete view like in YT App on TV
    // return (
    //   // <ShelfVideoSelectorProvider onElementFocused={onScreenFocused}>
    //   <GridFeedView items={parsedContent} />
    //   // </ShelfVideoSelectorProvider>
    // );
  }

  return <LibraryScreen />;
}
