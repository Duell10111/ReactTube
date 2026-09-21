import {useNavigation} from "@react-navigation/native";
import React from "react";
import {StyleSheet, TVFocusGuideView, View} from "react-native";

import {VideoMetadata} from "./VideoPlayer";

import {MetadataButton} from "@/components/video/videoPlayer/metadata/MetadataButton";
import {useTranslation} from "@/localization";
import {RootNavProp} from "@/navigation/RootStackNavigator";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MetadataContainerProps {
  metadata: VideoMetadata;
  resolution?: string;
  pause: () => void;
  onJumpToStart: () => void;
  /** Reports that focus reached the controls above the bottom panel. */
  onControlFocus?: () => void;
}

const metadataSeparator = " · ";

export default function MetadataContainer({
  metadata,
  resolution,
  pause,
  onJumpToStart,
  onControlFocus,
}: MetadataContainerProps) {
  const navigation = useNavigation<RootNavProp>();
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  const subtitle = [
    metadata.author,
    metadata.views,
    metadata.videoDate,
    resolution,
  ]
    .filter(Boolean)
    .join(metadataSeparator);

  return (
    <TVFocusGuideView autoFocus>
      <View style={[styles.container, {gap: theme.spacing.lg}]}>
        <View
          style={[
            styles.titleMetadata,
            {
              gap: theme.spacing.xs,
              padding: theme.spacing.md,
              borderRadius: theme.radii.panel,
              backgroundColor: theme.colors.scrim,
            },
          ]}>
          <AppText numberOfLines={2} variant={"titleLarge"}>
            {metadata.title}
          </AppText>
          <AppText color={"textSecondary"} variant={"bodySmall"}>
            {subtitle}
          </AppText>
        </View>
        <View style={styles.spacer} />
        <View style={styles.buttonMetadata}>
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.player.channel")}
            imageUrl={metadata.authorThumbnailUrl}
            // TODO: Outsource pause event in VideoScreen?
            onPress={() => {
              pause();
              metadata.onAuthorPress();
            }}
          />
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.action.like")}
            active={metadata.liked}
            icon={"thumb-up"}
            onPress={metadata.onLike}
          />
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.action.dislike")}
            active={metadata.disliked}
            icon={"thumb-down"}
            onPress={metadata.onDislike}
          />
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.action.save")}
            icon={"playlist-add"}
            onPress={metadata.onSaveVideo}
          />
          {metadata.onShowDetails ? (
            <MetadataButton
              onFocus={onControlFocus}
              accessibilityLabel={t("video.player.details")}
              icon={"info-outline"}
              onPress={metadata.onShowDetails}
            />
          ) : null}
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.player.jumpToStart")}
            icon={"skip-previous"}
            onPress={onJumpToStart}
          />
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.player.reload")}
            icon={"refresh"}
            onPress={metadata.onRefresh}
          />
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.player.settings")}
            icon={"settings"}
            onPress={() => navigation.navigate("VideoPlayerSettings")}
          />
        </View>
      </View>
    </TVFocusGuideView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "95%",
    alignSelf: "center",
    flexDirection: "row",
  },
  titleMetadata: {
    maxWidth: "40%",
  },
  spacer: {
    flex: 1,
  },
  buttonMetadata: {
    alignSelf: "flex-end",
    flexDirection: "row",
  },
});
