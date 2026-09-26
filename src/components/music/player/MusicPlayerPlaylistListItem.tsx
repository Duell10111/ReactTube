import _ from "lodash";
import {Image, StyleSheet} from "react-native";

import {VideoData} from "@/extraction/Types";
import {AppListItem} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export const ITEM_HEIGHT = 72;

interface MusicPlayerPlaylistListItemProps {
  data: VideoData;
  currentItem?: boolean;
  onPress?: () => void;
}

export function MusicPlayerPlaylistListItem({
  currentItem,
  data,
  onPress,
}: MusicPlayerPlaylistListItemProps) {
  const {theme} = useAppTheme();

  return (
    <AppListItem
      leading={
        <Image
          style={[styles.imageStyle, {borderRadius: theme.radii.control}]}
          source={{uri: data.thumbnailImage.url}}
        />
      }
      onPress={onPress}
      selected={currentItem}
      style={styles.container}
      subtitle={_.chain([data.author?.name ?? "", data.duration])
        .compact()
        .value()
        .join(" • ")}
      title={data.title}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT,
  },
  imageStyle: {
    width: 45,
    height: 45,
  },
});
