import {ScrollView, StyleSheet, View} from "react-native";

import {YTChipCloud, YTChipCloudChip} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppIconButton, Chip} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MusicSearchFilterHeaderProps {
  closeable?: boolean;
  onClose?: () => void;
  data: YTChipCloud;
  onClick?: (chip: YTChipCloudChip) => void;
}

export function MusicSearchFilterHeader({
  data,
  closeable,
  onClose,
  onClick,
}: MusicSearchFilterHeaderProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <View style={[styles.container, {gap: theme.spacing.sm}]}>
      {closeable ? (
        <AppIconButton
          accessibilityLabel={t("common.close")}
          icon={"close"}
          onPress={onClose}
        />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {data.chip_clouds.map(chip => (
          <Chip
            key={chip.text}
            label={chip.text}
            selected={chip.isSelected}
            onPress={() => onClick?.(chip)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    minHeight: 56,
    alignItems: "center",
    marginHorizontal: 5,
  },
});
