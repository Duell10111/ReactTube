import React, {useCallback} from "react";
import {Button, FlatList, Text, View} from "react-native";
import useHomeScreen from "../hooks/useHomeScreen";
import PageSegment from "../components/PageSegment";
import {YTNodes, Helpers} from "../utils/Youtube";
import HomeShelf from "../components/HomeShelf";
import Logger from "../utils/Logger";
import {useNavigation} from "@react-navigation/native";

const LOGGER = Logger.extend("HOME");

export default function HomeScreen() {
  const navigation = useNavigation();
  const {content, fetchMore} = useHomeScreen();

  // console.log("Content: ", JSON.stringify(content, null, 4));
  if (!content) {
    return null;
  }
  return (
    <>
      <Button title={"Search"} onPress={() => navigation.navigate("Search")} />
      <HomeShelf
        shelfItem={content}
        onEndReached={() => {
          console.log("End reached");
          fetchMore().catch(console.warn);
        }}
      />
    </>
  );

  // else {
  //   LOGGER.warn("Unknown type: ", content.type);
  //   LOGGER.debug("Type: ", typeof content);
  //   // console.log("Unknown type detected: ", JSON.stringify(content, null, 4));
  //   return null;
  // }
}
