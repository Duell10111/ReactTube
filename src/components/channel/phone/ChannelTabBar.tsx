import {ScrollView, StyleSheet} from "react-native";

import type {ChannelContentTypes} from "@/hooks/channel/useChannelData";
import {useTranslation} from "@/localization";
import {Chip} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface ChannelTabBarProps {
  tabs: {value: ChannelContentTypes; label: string}[];
  value: ChannelContentTypes;
  onValueChange: (value: ChannelContentTypes) => void;
  /** Horizontal padding, so the chips line up with the feed's cards. */
  inset: number;
  testID?: string;
}

export function ChannelTabBar({
  tabs,
  value,
  onValueChange,
  inset,
  testID,
}: ChannelTabBarProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  return (
    <ScrollView
      accessibilityLabel={t("channel.tabs")}
      accessibilityRole={"tablist"}
      contentContainerStyle={[
        styles.row,
        {
          gap: theme.spacing.sm,
          paddingHorizontal: inset,
          paddingVertical: theme.spacing.sm,
        },
      ]}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{backgroundColor: theme.colors.background}}
      testID={testID}>
      {tabs.map(tab => (
        <Chip
          key={tab.value}
          accessibilityRole={"tab"}
          label={tab.label}
          onPress={() => onValueChange(tab.value)}
          selected={tab.value === value}
          testID={`channel-tab-${tab.value.toLowerCase()}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {alignItems: "center"},
});
