import React from "react";
import {TVEventControl} from "react-native";
import useHomeScreen from "../hooks/useHomeScreen";
import Logger from "../utils/Logger";
import LoadingComponent from "../components/general/LoadingComponent";
import {useDrawerContext} from "../navigation/DrawerContext";
import GridView from "../components/GridView";
import {useFocusEffect} from "@react-navigation/native";

const LOGGER = Logger.extend("HOME");

export default function HomeScreen() {
  const {content, fetchMore} = useHomeScreen();

  const {onScreenFocused} = useDrawerContext();

  useFocusEffect(() => {
    TVEventControl.disableTVMenuKey();
  });

  if (!content) {
    return <LoadingComponent />;
  }

  return (
    <>
      <GridView
        shelfItem={content}
        onEndReached={() => {
          console.log("End reached");
          fetchMore().catch(console.warn);
        }}
        onElementFocused={onScreenFocused}
      />
    </>
  );
}
