import React, {useMemo, useState} from "react";
import {Platform, Pressable, StyleSheet, View} from "react-native";

import {MediaCardThumbnail} from "./MediaCardThumbnail";
import {createMediaCardViewModel} from "./mediaCardModel";
import {useMediaCardPress} from "./useMediaCardPress";

import type {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MediaRowProps {
  element: ElementData;
  /** Marks the entry that is playing, which a queue needs and a feed does not. */
  selected?: boolean;
  /** Replaces the metadata line while the entry is the current one. */
  selectedLabel?: string;
  onPress?: () => void;
  testID?: string;
}

/**
 * Denser sibling of `MediaCard`: thumbnail beside the text instead of above
 * it. Lists that are about position rather than browsing — the queue first of
 * all — use this, because a column of full-width cards buries the entry that
 * is actually playing.
 */
export function MediaRow({
  element,
  selected = false,
  selectedLabel,
  onPress,
  testID,
}: MediaRowProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const [focused, setFocused] = useState(false);
  const defaultPress = useMediaCardPress(element);
  const model = useMemo(
    () => createMediaCardViewModel(element, {translate: t}),
    [element, t],
  );
  const subtitle = selected ? selectedLabel : model.metadataLine;

  return (
    <Pressable
      accessibilityHint={model.accessibilityHint}
      accessibilityLabel={
        selected && selectedLabel
          ? `${selectedLabel}. ${model.accessibilityLabel}`
          : model.accessibilityLabel
      }
      accessibilityRole={"button"}
      accessibilityState={{selected}}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress ?? defaultPress}
      style={({pressed}) => [
        styles.row,
        {
          gap: theme.spacing.md,
          padding: theme.spacing.sm,
          borderRadius: theme.radii.card,
          borderWidth: 3,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          backgroundColor:
            pressed || selected
              ? theme.colors.surfacePressed
              : theme.colors.focusResting,
        },
      ]}
      testID={testID ?? "media-row"}>
      <View style={[styles.thumbnail, {width: Platform.isTV ? 240 : 160}]}>
        <MediaCardThumbnail
          model={model}
          scale={Platform.isTV ? "tv" : "touch"}
        />
      </View>
      <View style={styles.text}>
        <AppText numberOfLines={2} variant={"titleSmall"}>
          {model.title}
        </AppText>
        {subtitle ? (
          <AppText
            color={selected ? "textPrimary" : "textSecondary"}
            variant={"bodySmall"}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
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
