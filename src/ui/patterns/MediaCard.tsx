import {useNavigation} from "@react-navigation/native";
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

import {MediaCardThumbnail} from "./MediaCardThumbnail";
import {createMediaCardViewModel} from "./mediaCardModel";
import {resolveMediaCardAuthorRoute} from "./mediaCardRouting";
import {resolveThumbnailUrl} from "./thumbnailSource";
import {useMediaCardPress} from "./useMediaCardPress";

import {useVideoMenu} from "@/context/VideoMenuContext";
import type {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import type {NativeStackProp} from "@/navigation/types";
import {AppIconButton, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export interface MediaCardProps {
  element: ElementData;
  width?: DimensionValue;
  onPress?: () => void;
  /** Opens the video menu by default, like the overflow action. */
  onLongPress?: () => void;
  /**
   * Renders the overflow action. Videos and shorts open the video menu by
   * default; other elements show the action only when this is passed.
   */
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
}

const avatarSize = 36;
// Widens the small avatar to a comfortable touch target.
const avatarHitSlop = 6;

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
  const navigation = useNavigation<NativeStackProp>();
  const {open: openVideoMenu} = useVideoMenu();
  const authorRoute = useMemo(
    () => resolveMediaCardAuthorRoute(element),
    [element],
  );
  const defaultMenu =
    openVideoMenu && (element.type === "video" || element.type === "reel")
      ? () => openVideoMenu(element)
      : undefined;
  const overflow = onOverflow ?? defaultMenu;
  const avatar =
    model.author?.thumbnailUrl && !centered ? (
      <Image
        accessibilityIgnoresInvertColors
        contentFit={"cover"}
        source={{
          uri: resolveThumbnailUrl(model.author.thumbnailUrl, avatarSize),
        }}
        style={[styles.avatar, {backgroundColor: theme.colors.surfaceRaised}]}
      />
    ) : null;

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
      onLongPress={onLongPress ?? defaultMenu}
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
        {avatar && authorRoute ? (
          <Pressable
            accessibilityHint={t("media.hint.channel")}
            accessibilityLabel={model.author?.name}
            accessibilityRole={"button"}
            hitSlop={avatarHitSlop}
            onPress={() => {
              if (authorRoute.routeName === "MusicChannelScreen") {
                navigation.navigate(authorRoute.routeName, authorRoute.params);
              } else {
                navigation.navigate(authorRoute.routeName, authorRoute.params);
              }
            }}
            testID={"media-card-author"}>
            {avatar}
          </Pressable>
        ) : (
          avatar
        )}
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
        {overflow ? (
          <AppIconButton
            accessibilityLabel={t("media.moreOptions")}
            icon={"more-vert"}
            onPress={overflow}
            testID={"media-card-overflow"}
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
