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
}

const avatarSize = 36;

/**
 * Touch media card for phone and tablet. Borderless by design: the thumbnail
 * is the card, the metadata sits directly below it.
 */
export function MediaCard({
  element,
  width,
  onPress,
  onLongPress,
  onOverflow,
  style,
  testID,
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
      accessibilityLabel={model.accessibilityLabel}
      accessibilityRole={"button"}
      onLongPress={onLongPress}
      onPress={onPress ?? defaultPress}
      style={({pressed}) => [
        styles.container,
        {width, gap: theme.spacing.sm, borderRadius: theme.radii.card},
        pressed && {backgroundColor: theme.colors.surfacePressed},
        style,
      ]}
      testID={testID ?? "media-card"}>
      <MediaCardThumbnail model={model} scale={"touch"} />
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
            source={{uri: model.author.thumbnailUrl}}
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
