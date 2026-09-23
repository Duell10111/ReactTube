import React from "react";
import {StyleSheet, View} from "react-native";

import {useTranslation} from "@/localization";
import {AppText, Chip} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MusicSectionHeaderProps {
  title?: string;
  /** Kicker above the title, e.g. "SENDER". */
  strapline?: string;
  onPlayAll?: () => void;
}

/**
 * Title row of a music shelf. Music leads with the title and keeps the shelf's
 * own action on the same line, which is why this is not the feed's plain
 * section header.
 */
export function MusicSectionHeader({
  title,
  strapline,
  onPlayAll,
}: MusicSectionHeaderProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  if (!title && !strapline) {
    return null;
  }

  return (
    <View style={[styles.container, {gap: theme.spacing.xs}]}>
      {strapline ? (
        <View
          style={[
            styles.strapline,
            {
              backgroundColor: theme.colors.live,
              borderRadius: theme.radii.control / 2,
              paddingHorizontal: theme.spacing.xs,
            },
          ]}>
          <AppText
            numberOfLines={1}
            style={styles.straplineText}
            variant={"labelSmall"}>
            {strapline.toUpperCase()}
          </AppText>
        </View>
      ) : null}
      <View style={[styles.row, {gap: theme.spacing.md}]}>
        {title ? (
          <AppText
            accessibilityRole={"header"}
            numberOfLines={2}
            style={styles.title}
            variant={"titleLarge"}>
            {title}
          </AppText>
        ) : (
          <View style={styles.title} />
        )}
        {onPlayAll ? (
          <Chip label={t("music.playAll")} onPress={onPlayAll} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
  },
  strapline: {
    alignSelf: "flex-start",
  },
  straplineText: {
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  title: {
    flex: 1,
  },
});
