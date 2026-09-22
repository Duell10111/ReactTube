import {useCallback} from "react";
import {FlatList, ListRenderItem, StyleSheet} from "react-native";

import {Tab} from "@/components/my-youtube/Tab";
import {YTMyYoutubeTab} from "@/extraction/Types";
import {useAppTheme} from "@/ui/theme";

interface TabNavigatorProps {
  tabs: YTMyYoutubeTab[];
  onPress?: (tab: YTMyYoutubeTab) => void;
}

export function TabNavigator({tabs, onPress}: TabNavigatorProps) {
  const {theme} = useAppTheme();
  const renderItem = useCallback<ListRenderItem<YTMyYoutubeTab>>(({item}) => {
    return <Tab title={item.title} onPress={() => onPress?.(item)} />;
  }, []);

  return (
    <FlatList
      contentContainerStyle={{gap: theme.spacing.xs, padding: theme.spacing.sm}}
      style={[styles.container, {backgroundColor: theme.colors.surface}]}
      data={tabs}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
  },
});
