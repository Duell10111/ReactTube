import {StyleSheet, View} from "react-native";

import {MusicSearchTopResult} from "@/components/music/MusicSearchTopResult";
import {isMusicTopResult} from "@/components/music/musicSearchModel";
import {MusicTrackRow} from "@/components/music/sections/MusicTrackRow";
import {musicSurfacePadding} from "@/components/music/sections/musicSectionModel";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {useTranslation} from "@/localization";
import {AppText, Chip} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MusicSearchSectionItemProps {
  data: HorizontalData;
  onPress?: () => void;
}

/** One shelf of the unfiltered music search: the top result or a titled list. */
export default function MusicSearchSectionItem({
  data,
  onPress,
}: MusicSearchSectionItemProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  if (isMusicTopResult(data)) {
    return (
      <View
        style={{
          paddingHorizontal: musicSurfacePadding,
          paddingBottom: theme.spacing.lg,
        }}>
        <MusicSearchTopResult data={data} />
      </View>
    );
  }

  if (data.parsedData.length === 0) {
    return null;
  }

  return (
    <View style={{paddingBottom: theme.spacing.lg}}>
      {data.title ? (
        <View
          style={[
            styles.header,
            {
              gap: theme.spacing.md,
              paddingHorizontal: musicSurfacePadding,
              paddingBottom: theme.spacing.xs,
            },
          ]}>
          <AppText
            accessibilityRole={"header"}
            numberOfLines={1}
            style={styles.title}
            variant={"titleLarge"}>
            {data.title}
          </AppText>
          {onPress ? <Chip label={t("common.more")} onPress={onPress} /> : null}
        </View>
      ) : null}
      <View style={{paddingHorizontal: musicSurfacePadding - theme.spacing.xs}}>
        {data.parsedData.map((element, index) => (
          <MusicTrackRow
            element={element}
            key={`${element.id}-${index}`}
            videoFrame
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
  },
});
