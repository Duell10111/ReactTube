import {useCallback} from "react";
import {FlatList, ListRenderItem, StyleSheet} from "react-native";

import {Tab} from "@/components/my-youtube/Tab";
import {YTMyYoutubeTab} from "@/extraction/Types";

interface TabNavigatorProps {
  tabs: YTMyYoutubeTab[];
  onPress?: (tab: YTMyYoutubeTab) => void;
}

export function TabNavigator({tabs, onPress}: TabNavigatorProps) {
  const renderItem = useCallback<ListRenderItem<YTMyYoutubeTab>>(({item}) => {
    return <Tab title={item.title} onPress={() => onPress?.(item)} />;
  }, []);

  return (
    <FlatList style={styles.container} data={tabs} renderItem={renderItem} />
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
    backgroundColor: "#333333",
    borderStartWidth: 1,
    borderColor: "black",
  },
});
