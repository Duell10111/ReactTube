import React, {useCallback} from "react";
import {FlatList, Text, View} from "react-native";
import useHomeScreen from "../hooks/useHomeScreen";
import PageSegment from "../components/PageSegment";
import {YTNodes, Helpers} from "../utils/Youtube";
import HomeShelf from "../components/HomeShelf";
import Logger from "../utils/Logger";

const LOGGER = Logger.extend("HOME");

export default function HomeScreen() {
  const {content, fetchMore} = useHomeScreen();

  // console.log("Content: ", JSON.stringify(content, null, 4));
  if (!content) {
    return null;
  }
  return (
    <HomeShelf
      shelfItem={content}
      onEndReached={() => {
        console.log("End reached");
        fetchMore().catch(console.warn);
      }}
    />
  );

  // else {
  //   LOGGER.warn("Unknown type: ", content.type);
  //   LOGGER.debug("Type: ", typeof content);
  //   // console.log("Unknown type detected: ", JSON.stringify(content, null, 4));
  //   return null;
  // }
}
