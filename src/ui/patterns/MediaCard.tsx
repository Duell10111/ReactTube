import {Image} from "expo-image";
import React, {useMemo} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {MediaCardThumbnail} from "./MediaCardThumbnail";
import {createMediaCardViewModel} from "./mediaCardModel";
import {resolveThumbnailUrl} from "./thumbnailSource";
import {useMediaCardPress} from "./useMediaCardPress";

import type {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppIconButton, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export interface MediaCardProps {
  element: ElementData;
  width?: DimensionValue;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Renders the overflow action. Left out while a surface has no menu yet. */
  onOverflow?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * Marks the entry that is playing in the list the card sits in, with an
   * accent badge carrying `selectedLabel` on the thumbnail.
   */
  selected?: boolean;
  selectedLabel?: string;
  /** Reports focus on TV, where a row keeps its playing entry in view. */
  onFocusChange?: (focused: boolean) => void;
  /** The pressable itself, e.g. as a TV focus guide destination. */
  focusRef?: React.Ref<View>;
}

const avatarSize = 36;

/**
 * Touch media card for phone and tablet. Borderless by design: the thumbnail
 * is the card, the metadata sits directly below it.
 */
function MediaCardTouch({
  element,
  width,
  onPress,
  onLongPress,
  onOverflow,
  style,
  testID,
  selected = false,
  selectedLabel,
  focusRef,
}: MediaCardProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const defaultPress = useMediaCardPress(element);
  const model = useMemo(
    () => createMediaCardViewModel(element, {translate: t}),
    [element, t],
  );
  const centered = model.shape === "circle";

  return (
    <Pressable
      accessibilityHint={model.accessibilityHint}
      accessibilityLabel={
        selected && selectedLabel
          ? `${selectedLabel}. ${model.accessibilityLabel}`
          : model.accessibilityLabel
      }
      accessibilityRole={"button"}
      accessibilityState={selected ? {selected} : undefined}
      onLongPress={onLongPress}
      onPress={onPress ?? defaultPress}
      style={({pressed}) => [
        styles.container,
        {width, gap: theme.spacing.sm, borderRadius: theme.radii.card},
        pressed && {backgroundColor: theme.colors.surfacePressed},
        style,
      ]}
      ref={focusRef}
      testID={testID ?? "media-card"}>
      <MediaCardThumbnail
        highlightLabel={selected ? selectedLabel : undefined}
        model={model}
        scale={"touch"}
        targetWidth={typeof width === "number" ? width : undefined}
      />
      <View
        style={[
          styles.metadata,
          {
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.sm,
          },
          centered && styles.metadataCentered,
        ]}>
        {model.author?.thumbnailUrl && !centered ? (
          <Image
            accessibilityIgnoresInvertColors
            contentFit={"cover"}
            source={{
              uri: resolveThumbnailUrl(model.author.thumbnailUrl, avatarSize),
            }}
            style={[
              styles.avatar,
              {backgroundColor: theme.colors.surfaceRaised},
            ]}
          />
        ) : null}
        <View style={styles.metadataText}>
          <AppText
            align={centered ? "center" : undefined}
            variant={"titleSmall"}>
            {model.title}
          </AppText>
          {model.metadataLine ? (
            <AppText
              align={centered ? "center" : undefined}
              color={"textSecondary"}
              variant={"bodySmall"}>
              {model.metadataLine}
            </AppText>
          ) : null}
        </View>
        {onOverflow ? (
          <AppIconButton
            accessibilityLabel={t("media.moreOptions")}
            icon={"more-vert"}
            onPress={onOverflow}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

/** Keeps a feed row from re-rendering every card when one of them changes. */
export const MediaCard = React.memo(MediaCardTouch);

MediaCard.displayName = "MediaCard";

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
  },
  metadata: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  metadataCentered: {
    flexDirection: "column",
    alignItems: "center",
  },
  metadataText: {
    flex: 1,
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
  },
});
