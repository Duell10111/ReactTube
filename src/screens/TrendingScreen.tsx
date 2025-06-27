import {useFocusEffect} from "@react-navigation/native";
import React from "react";
import {Platform, TVEventControl} from "react-native";

import LoadingComponent from "../components/general/LoadingComponent";
import Logger from "../utils/Logger";

import GridFeedView from "@/components/grid/GridFeedView";
import usePhoneOrientationLocker from "@/hooks/ui/usePhoneOrientationLocker";
import useTrending from "@/hooks/useTrending";

const LOGGER = Logger.extend("HOME");

export default function TrendingScreen() {
  const {data, fetchMore} = useTrending();

  useFocusEffect(() => {
    if (Platform.isTV) {
      TVEventControl.disableTVMenuKey();
    }
  });

  usePhoneOrientationLocker();

  if (!data) {
    return <LoadingComponent />;
  }

  return (
    <>
      <GridFeedView
        items={data}
        onEndReached={() => {
          fetchMore().catch(console.warn);
        }}
      />
    </>
  );
}
