import {MaterialIcons} from "@expo/vector-icons";
import React, {useMemo, useState} from "react";
import {Pressable, StyleSheet, View} from "react-native";

import {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {MediaCardThumbnail, createMediaCardViewModel} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface PlaylistManagerListProps {
  data: ElementData;
  onPress?: () => void;
}

/** Thumbnail width of a row, small enough to leave the name the most space. */
const thumbnailWidth = 96;

/**
 * A playlist as the save sheet lists it: the name carries the row, the
 * thumbnail only identifies it. The generic `MediaRow` put a feed-sized
 * thumbnail first and squeezed the name out of the sheet.
 */
export function PlaylistManagerListItem({
  data,
  onPress,
}: PlaylistManagerListProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const [focused, setFocused] = useState(false);
  const model = useMemo(() => {
    const card = createMediaCardViewModel(data, {translate: t});

    // The video count is the subtitle here, so the badge would say it twice on
    // a thumbnail this small.
    return {...card, badges: []};
  }, [data, t]);

  return (
    <Pressable
      accessibilityHint={t("playlist.manager.saveHint")}
      accessibilityLabel={model.accessibilityLabel}
      accessibilityRole={"button"}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({pressed}) => [
        styles.row,
        {
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radii.card,
          borderWidth: theme.controls.focusBorderWidth,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          backgroundColor: pressed
            ? theme.colors.surfacePressed
            : theme.colors.focusResting,
        },
      ]}
      testID={"playlist-manager-row"}>
      <View style={[styles.thumbnail, {width: thumbnailWidth}]}>
        <MediaCardThumbnail
          model={model}
          scale={"touch"}
          targetWidth={thumbnailWidth}
        />
      </View>
      <View style={styles.text}>
        <AppText numberOfLines={2} variant={"titleSmall"}>
          {model.title}
        </AppText>
        {model.metadataLine ? (
          <AppText color={"textSecondary"} variant={"bodySmall"}>
            {model.metadataLine}
          </AppText>
        ) : null}
      </View>
      {/* The row itself saves; the icon only says what pressing it does. */}
      <MaterialIcons
        color={theme.colors.textSecondary}
        importantForAccessibility={"no"}
        name={"bookmark-border"}
        size={theme.controls.iconSize}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnail: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
  },
});
