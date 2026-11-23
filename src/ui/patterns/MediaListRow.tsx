import React, {useMemo} from "react";
import {Pressable, StyleSheet, View} from "react-native";

import {MediaCardThumbnail} from "./MediaCardThumbnail";
import {createMediaCardViewModel, mediaCardAspectRatio} from "./mediaCardModel";
import {useMediaCardPress} from "./useMediaCardPress";

import type {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

/** Share of the row the thumbnail takes, close to the YouTube app's lists. */
const thumbnailShare = 0.4;
const thumbnailMaxWidth = 240;

interface MediaListRowProps {
  element: ElementData;
  /** Width of the whole row; the thumbnail is sized from it. */
  width: number;
  testID?: string;
}

/**
 * Touch list entry: thumbnail on the left, title, channel, and counts beside
 * it. Lists that are read top to bottom, such as a playlist, use it instead of
 * full-width cards, so a phone shows several entries at once. Shorts keep the
 * wide frame of their neighbours, cropped to its centre.
 */
export const MediaListRow = React.memo(function MediaListRow({
  element,
  width,
  testID,
}: MediaListRowProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const onPress = useMediaCardPress(element);
  const model = useMemo(
    () =>
      createMediaCardViewModel(element, {
        translate: t,
        thumbnailAspectRatio: mediaCardAspectRatio.wide,
      }),
    [element, t],
  );
  const thumbnailWidth = Math.min(width * thumbnailShare, thumbnailMaxWidth);
  // The channel gets a line of its own, as in the YouTube app; the counts
  // follow below it.
  const [first, ...rest] = model.metadata;
  const authorLine = model.author?.name === first ? first : undefined;
  const countsLine = (authorLine ? rest : model.metadata).join(" · ");

  return (
    <Pressable
      accessibilityHint={model.accessibilityHint}
      accessibilityLabel={model.accessibilityLabel}
      accessibilityRole={"button"}
      onPress={onPress}
      style={({pressed}) => [
        styles.row,
        {
          width,
          gap: theme.spacing.md,
          borderRadius: theme.radii.card,
        },
        pressed && {backgroundColor: theme.colors.surfacePressed},
      ]}
      testID={testID ?? "media-list-row"}>
      <View style={{width: thumbnailWidth}}>
        <MediaCardThumbnail
          model={model}
          scale={"touch"}
          targetWidth={thumbnailWidth}
        />
      </View>
      <View style={[styles.text, {gap: theme.spacing.xs}]}>
        <AppText numberOfLines={2} variant={"titleSmall"}>
          {model.title}
        </AppText>
        {authorLine ? (
          <AppText
            color={"textSecondary"}
            numberOfLines={1}
            variant={"bodySmall"}>
            {authorLine}
          </AppText>
        ) : null}
        {countsLine ? (
          <AppText
            color={"textSecondary"}
            numberOfLines={1}
            variant={"bodySmall"}>
            {countsLine}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  text: {
    flex: 1,
  },
});
