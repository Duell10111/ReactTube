import React, {useEffect} from "react";
import {Platform, TVEventControl} from "react-native";
import useHomeScreen from "../hooks/useHomeScreen";
import Logger from "../utils/Logger";
import LoadingComponent from "../components/general/LoadingComponent";
import {useDrawerContext} from "../navigation/DrawerContext";
import GridView from "../components/GridView";
import {useFocusEffect, useNavigation} from "@react-navigation/native";
import {OrientationLocker} from "react-native-orientation-locker";
import {Icon} from "@rneui/base";
import DeviceInfo from "react-native-device-info";
import useGridColumnsPreferred from "../hooks/home/useGridColumnsPreferred";

const LOGGER = Logger.extend("HOME");

export default function HomeScreen() {
  const {content, fetchMore} = useHomeScreen();

  const {onScreenFocused} = useDrawerContext();

  const navigation = useNavigation();

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
