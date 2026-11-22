import {Image} from "expo-image";
import React, {useMemo} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type PressableInstance,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, {Defs, LinearGradient, Rect, Stop} from "react-native-svg";

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
  focusRef?: React.Ref<PressableInstance>;
  /**
   * Crops the thumbnail to this aspect ratio instead of the shape's own, e.g.
   * a short cropped to the shape of the video cards around it on TV.
   */
  thumbnailAspectRatio?: number;
  /**
   * Puts title and metadata on the thumbnail instead of below it, for the
   * narrow cards of a dense shorts grid.
   */
  metadataOverlay?: boolean;
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
  thumbnailAspectRatio,
  metadataOverlay = false,
}: MediaCardProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const defaultPress = useMediaCardPress(element);
  const model = useMemo(
    () =>
      createMediaCardViewModel(element, {translate: t, thumbnailAspectRatio}),
    [element, t, thumbnailAspectRatio],
  );
  const centered = model.shape === "circle";
  // Every card in a shorts grid is a short; the badge would only repeat that
  // and cover the overlaid title.
  const thumbnailModel = useMemo(
    () => (metadataOverlay ? {...model, badges: []} : model),
    [metadataOverlay, model],
  );

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
        model={thumbnailModel}
        scale={"touch"}
        targetWidth={typeof width === "number" ? width : undefined}
      />
      {metadataOverlay ? (
        <View
          pointerEvents={"none"}
          style={[
            styles.overlay,
            {borderRadius: theme.radii.card, padding: theme.spacing.sm},
          ]}>
          <Svg height={"100%"} style={StyleSheet.absoluteFill} width={"100%"}>
            <Defs>
              <LinearGradient
                id={"mediaCardOverlay"}
                x1={"0"}
                x2={"0"}
                y1={"0"}
                y2={"1"}>
                <Stop offset={"0.5"} stopColor={"#000"} stopOpacity={"0"} />
                <Stop offset={"1"} stopColor={"#000"} stopOpacity={"0.8"} />
              </LinearGradient>
            </Defs>
            <Rect
              fill={"url(#mediaCardOverlay)"}
              height={"100%"}
              width={"100%"}
            />
          </Svg>
          <AppText numberOfLines={2} variant={"label"}>
            {model.title}
          </AppText>
          {model.metadataLine ? (
            <AppText numberOfLines={1} variant={"labelSmall"}>
              {model.metadataLine}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {metadataOverlay ? null : (
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
      )}
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
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "flex-end",
    overflow: "hidden",
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
