import {StyleSheet, TVFocusGuideView, View} from "react-native";

import {TabNavigator} from "@/components/my-youtube/TabNavigator";
import useMyYoutubeScreen from "@/hooks/tv/useMyYoutubeScreen";
import {useDrawerContext} from "@/navigation/DrawerContext";
import {MediaFeed} from "@/ui/patterns";

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

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TabNavigator tabs={tabs} onPress={tab => selectTab(tab)} />
      </View>
      <View style={styles.content}>
        <TVFocusGuideView autoFocus>
          <MediaFeed
            error={error}
            items={data}
            loading={loading}
            onElementFocused={() => setHideDrawer?.(true)}
            onEndReached={fetchMore}
            testID={"my-youtube-feed"}
          />
        </TVFocusGuideView>
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
