import React, {useCallback} from "react";
import {Button, FlatList, Text, TouchableOpacity, View} from "react-native";
import useHomeScreen from "../hooks/useHomeScreen";
import PageSegment from "../components/PageSegment";
import {YTNodes, Helpers} from "../utils/Youtube";
import HomeShelf from "../components/HomeShelf";
import Logger from "../utils/Logger";
import {useNavigation} from "@react-navigation/native";
import {Icon} from "@rneui/base";
import {NativeStackProp} from "../navigation/types";

const LOGGER = Logger.extend("HOME");

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackProp>();
  const {content, fetchMore} = useHomeScreen();

  // console.log("Content: ", JSON.stringify(content, null, 4));
  if (!content) {
    return null;
  }
  return (
    <>
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
