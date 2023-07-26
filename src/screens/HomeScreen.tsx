import React from "react";
import useHomeScreen from "../hooks/useHomeScreen";
import HomeShelf from "../components/HomeShelf";
import Logger from "../utils/Logger";
import LoadingComponent from "../components/general/LoadingComponent";
import {useDrawerContext} from "../navigation/DrawerContext";
import GridView from "../components/GridView";

const LOGGER = Logger.extend("HOME");

export default function HomeScreen() {
  const {content, fetchMore} = useHomeScreen();

  const {onScreenFocused} = useDrawerContext();

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
