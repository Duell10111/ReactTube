import {useFocusEffect} from "@react-navigation/native";
import {useCallback, useEffect} from "react";
import {Dimensions, StyleSheet, TVFocusGuideView, View} from "react-native";

import GridFeedView from "@/components/grid/GridFeedView";
import {TabNavigator} from "@/components/my-youtube/TabNavigator";
import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import useMyYoutubeScreen from "@/hooks/tv/useMyYoutubeScreen";
import {useDrawerContext} from "@/navigation/DrawerContext";

const {width} = Dimensions.get("window");

export function MyYoutubeScreenTV() {
  const {data, tabs, selectTab, fetchMore} = useMyYoutubeScreen();
  const {setHideDrawer} = useDrawerContext();

  // TODO: Reset Hide when leaving screen?!
  // useFocusEffect(
  //   useCallback(() => {
  //     // Do something when the screen is focused
  //     setHideDrawer?.(true);
  //     return () => {
  //       // Do something when the screen is unfocused
  //       // Useful for cleanup functions
  //       setHideDrawer?.(false);
  //     };
  //   }, []),
  // );

  return (
    <ShelfVideoSelectorProvider onElementFocused={() => setHideDrawer?.(true)}>
      <View style={styles.container}>
        <View style={{width: 250}}>
          <TabNavigator tabs={tabs} onPress={tab => selectTab(tab)} />
        </View>
        <View style={{width: width - 250, height: "100%"}}>
          <TVFocusGuideView autoFocus>
            <GridFeedView items={data} onEndReached={fetchMore} />
          </TVFocusGuideView>
        </View>
      </View>
    </ShelfVideoSelectorProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flex: 1,
  },
});
