import {useFocusEffect, useNavigation} from "@react-navigation/native";
import {Icon} from "@rneui/base";
import React, {useEffect, useState} from "react";
import {Platform, TVEventControl} from "react-native";
import DeviceInfo from "react-native-device-info";
import {OrientationLocker} from "react-native-orientation-locker";

import GridView from "../components/GridView";
import LoadingComponent from "../components/general/LoadingComponent";
import useGridColumnsPreferred from "../hooks/home/useGridColumnsPreferred";
import useHomeScreen from "../hooks/useHomeScreen";
import Logger from "../utils/Logger";

import useTrending from "@/hooks/useTrending";
import {useDrawerContext} from "@/navigation/DrawerContext";
import {RootNavProp} from "@/navigation/RootStackNavigator";

const LOGGER = Logger.extend("HOME");

export default function TrendingScreen() {
  const {data} = useTrending();
  const [fetchDate, setFetchDate] = useState(Date.now());
  const {content, fetchMore, refresh} = useHomeScreen();

  const {onScreenFocused} = useDrawerContext();

  const navigation = useNavigation<RootNavProp>();

  useFocusEffect(() => {
    if (Math.abs(Date.now() - fetchDate) > 43200000) {
      LOGGER.debug("Triggering refresh home content");
      refresh();
      setFetchDate(Date.now());
    } else {
      LOGGER.debug("Last fetch has been recently. Skipping refresh");
    }
  });

  useEffect(() => {
    if (!Platform.isTV) {
      navigation.setOptions({
        headerRight: () => (
          <Icon
            name={"search"}
            onPress={() => navigation.navigate("Search")}
            color={"white"}
            style={{marginEnd: 10}}
          />
        ),
      });
    }
  }, [navigation]);

  useFocusEffect(() => {
    TVEventControl.disableTVMenuKey();
  });

  const columns = useGridColumnsPreferred();

  if (!content) {
    return <LoadingComponent />;
  }

  return (
    <>
      {!Platform.isTV && !DeviceInfo.isTablet() ? (
        <OrientationLocker orientation={"PORTRAIT"} />
      ) : null}
      <GridView
        columns={columns}
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
