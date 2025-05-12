import {useFocusEffect, useNavigation} from "@react-navigation/native";
import {Icon} from "@rneui/base";
import React, {useEffect, useState} from "react";
import {Platform, TVEventControl} from "react-native";

import Logger from "../utils/Logger";

import LoadingComponent from "@/components/general/LoadingComponent";
import GridFeedView from "@/components/grid/GridFeedView";
import {TVRefreshButton} from "@/components/home/tv/TVRefreshButton";
import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import useGridColumnsPreferred from "@/hooks/home/useGridColumnsPreferred";
import useHomeScreen from "@/hooks/tv/useHomeScreen";
import usePhoneOrientationLocker from "@/hooks/ui/usePhoneOrientationLocker";
import {useDrawerContext} from "@/navigation/DrawerContext";
import {RootNavProp} from "@/navigation/RootStackNavigator";

const LOGGER = Logger.extend("HOME");

// TODO: Do not fetch Home if not logged in?
// Alternative: Show trending screen instead?

export default function HomeScreen() {
  const [fetchDate, setFetchDate] = useState(Date.now());
  const {content, fetchMore, refresh, refreshing} = useHomeScreen();

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
    if (Platform.isTV) {
      TVEventControl.disableTVMenuKey();
    }
  });

  const columns = useGridColumnsPreferred();

  usePhoneOrientationLocker();

  if (!content) {
    return <LoadingComponent />;
  }

  return (
    <>
      {/*TODO: Replace with GridFeedView on Phone and maybe create a variant for TV and Tablet also?*/}
      <ShelfVideoSelectorProvider>
        <GridFeedView
          items={content}
          onEndReached={fetchMore}
          ListHeaderComponent={
            <TVRefreshButton
              onPress={() => refresh()}
              refreshing={refreshing}
            />
          }
        />
      </ShelfVideoSelectorProvider>
      {/*<GridView*/}
      {/*  columns={columns}*/}
      {/*  shelfItem={content}*/}
      {/*  onEndReached={() => {*/}
      {/*    console.log("End reached");*/}
      {/*    fetchMore().catch(console.warn);*/}
      {/*  }}*/}
      {/*  onElementFocused={onScreenFocused}*/}
      {/*  onRefresh={refresh}*/}
      {/*  refreshing={refreshing}*/}
      {/*/>*/}
    </>
  );
}
