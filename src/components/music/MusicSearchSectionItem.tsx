import {Pressable, StyleSheet, View} from "react-native";

import {MusicSearchListItem} from "@/components/music/MusicSearchListItem";
import MusicSearchSectionButtonItem from "@/components/music/MusicSearchSectionButtonItem";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {VideoData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MusicSearchSectionItemProps {
  data: HorizontalData;
  onPress?: () => void;
}

export default function MusicSearchSectionItem({
  data,
  onPress,
}: MusicSearchSectionItemProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  if (data.thumbnail && data.buttons?.length && data.buttons.length > 0) {
    return <MusicSearchSectionButtonItem data={data} />;
  }

  return (
    <View style={[styles.container, {marginHorizontal: theme.spacing.sm}]}>
      <Pressable
        accessibilityRole={"button"}
        style={styles.headerContainer}
        onPress={onPress}>
        <AppText style={styles.titleStyle} variant={"titleMedium"}>
          {data.title}
        </AppText>
        <AppText
          color={"textSecondary"}
          style={styles.moreText}
          variant={"label"}>
          {t("common.more")}
        </AppText>
      </Pressable>
      <View style={styles.itemContainer}>
        {data.parsedData.map(element => (
          <MusicSearchListItem key={element.id} data={element as VideoData} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  titleStyle: {
    flex: 1,
  },
  moreText: {
    marginHorizontal: 10,
  },
  itemContainer: {},
});
