import {useFocusEffect, useNavigation} from "@react-navigation/native";
import {Icon} from "@rneui/base";
import React, {useEffect, useState} from "react";
import {Platform, TVEventControl} from "react-native";

import GridView from "../components/GridView";
import LoadingComponent from "../components/general/LoadingComponent";
import useGridColumnsPreferred from "../hooks/home/useGridColumnsPreferred";
import useHomeScreen from "../hooks/useHomeScreen";
import {useDrawerContext} from "../navigation/DrawerContext";
import {RootNavProp} from "../navigation/RootStackNavigator";
import Logger from "../utils/Logger";

import GridFeedView from "@/components/grid/GridFeedView";
import usePhoneOrientationLocker from "@/hooks/ui/usePhoneOrientationLocker";

const LOGGER = Logger.extend("HOME");

// TODO: Do not fetch Home if not logged in?
// Alternative: Show trending screen instead?

export default function HomeScreen() {
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

  usePhoneOrientationLocker();

  if (!content) {
    return <LoadingComponent />;
  }

  return (
    <>
      {/*TODO: Replace with GridFeedView on Phone and maybe create a variant for TV and Tablet also?*/}
      {/*<GridFeedView items={parsedData} />*/}
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
