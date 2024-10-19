import {useFocusEffect} from "@react-navigation/native";
import React, {useState} from "react";
import {TVEventControl} from "react-native";

import LoadingComponent from "../components/general/LoadingComponent";
import useHomeScreen from "../hooks/useHomeScreen";
import Logger from "../utils/Logger";

import GridFeedView from "@/components/grid/GridFeedView";
import usePhoneOrientationLocker from "@/hooks/ui/usePhoneOrientationLocker";
import useTrending from "@/hooks/useTrending";

const LOGGER = Logger.extend("HOME");

export default function TrendingScreen() {
  const {data, fetchMore} = useTrending();
  const [fetchDate, setFetchDate] = useState(Date.now());
  const {refresh} = useHomeScreen();

  useFocusEffect(() => {
    if (Math.abs(Date.now() - fetchDate) > 43200000) {
      LOGGER.debug("Triggering refresh home content");
      refresh();
      setFetchDate(Date.now());
    } else {
      LOGGER.debug("Last fetch has been recently. Skipping refresh");
    }
  });

  useFocusEffect(() => {
    TVEventControl.disableTVMenuKey();
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
