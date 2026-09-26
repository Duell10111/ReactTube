import {StyleSheet, View} from "react-native";

import {TabNavigator} from "@/components/my-youtube/TabNavigator";
import useMyYoutubeScreen from "@/hooks/tv/useMyYoutubeScreen";
import {useDrawerContext} from "@/navigation/DrawerContext";
import {MediaFeed} from "@/ui/patterns";
import {TVFocusRegion} from "@/ui/tv";

export function MyYoutubeScreenTV() {
  const {data, tabs, selectTab, fetchMore, loading, error} =
    useMyYoutubeScreen();
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

  // The screen has two focus regions side by side. The feed brings its own,
  // so wrapping it in a second one here only put two guides in competition
  // over the same moves; the tab column is the one that still needs one, so
  // returning from the grid lands on the tab that is open.
  return (
    <View style={styles.container}>
      <TVFocusRegion style={styles.tabs}>
        <TabNavigator tabs={tabs} onPress={tab => selectTab(tab)} />
      </TVFocusRegion>
      <View style={styles.content}>
        <MediaFeed
          error={error}
          items={data}
          loading={loading}
          onElementFocused={() => setHideDrawer?.(true)}
          onEndReached={fetchMore}
          testID={"my-youtube-feed"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flex: 1,
  },
  tabs: {
    width: 250,
  },
  // The screen fills the navigation content plane, so the grid takes the
  // remaining width instead of measuring the whole window.
  content: {
    flex: 1,
    height: "100%",
  },
});
