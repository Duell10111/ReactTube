import {useNavigation} from "@react-navigation/native";
import {Image} from "expo-image";
import React, {useMemo, useState} from "react";
import {Pressable, StyleSheet, View} from "react-native";

import {ActionBar, type ActionBarItem} from "./ActionBar";
import type {VideoDetailViewModel} from "./videoDetailModel";

import useChannelDetails from "@/hooks/useChannelDetails";
import {useTranslation} from "@/localization";
import type {NativeStackProp} from "@/navigation/types";
import {AppButton, AppText, Divider} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

const avatarSize = 40;

interface VideoDetailHeaderProps {
  actions: ActionBarItem[];
  model: VideoDetailViewModel;
  /** Subscription as the screen holds it, which leads the video info. */
  subscribed: boolean;
  /** Trims the description preview where vertical space is scarce. */
  compact?: boolean;
  onSubscribe: (subscribed: boolean) => void;
  onOpenDescription?: () => void;
}

/**
 * Metadata block of the video detail surface, in the order the plan asks for:
 * title, views and date, creator with subscribe, then the actions. Each block
 * is a row of its own, so none of them competes with the video above it.
 */
export function VideoDetailHeader({
  actions,
  model,
  subscribed,
  compact = false,
  onSubscribe,
  onOpenDescription,
}: VideoDetailHeaderProps) {
  const {theme} = useAppTheme();

  return (
    <View style={[styles.container, {gap: theme.spacing.md}]}>
      <View
        style={[
          styles.text,
          {gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm},
        ]}>
        <AppText numberOfLines={compact ? 2 : 3} variant={"titleMedium"}>
          {model.title}
        </AppText>
        {model.metadataLine ? (
          <AppText color={"textSecondary"} variant={"bodySmall"}>
            {model.metadataLine}
          </AppText>
        ) : null}
      </View>
      <ChannelRow
        model={model}
        onSubscribe={onSubscribe}
        subscribed={subscribed}
      />
      <ActionBar compact={compact} items={actions} />
      {!compact && model.description && onOpenDescription ? (
        <DescriptionPreview
          description={model.description}
          onPress={onOpenDescription}
        />
      ) : null}
      <Divider />
    </View>
  );
}

interface ChannelRowProps {
  model: VideoDetailViewModel;
  subscribed: boolean;
  onSubscribe: (subscribed: boolean) => void;
}

function ChannelRow({model, subscribed, onSubscribe}: ChannelRowProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const navigation = useNavigation<NativeStackProp>();
  const channelId = model.channel?.id;
  const {channel} = useChannelDetails(channelId ?? "");
  const avatarUrl = channel?.metadata?.thumbnail?.[0]?.url;

  if (!model.channel) {
    return null;
  }

  return (
    <View
      style={[
        styles.channelRow,
        {gap: theme.spacing.md, paddingHorizontal: theme.spacing.sm},
      ]}>
      <Pressable
        accessibilityHint={t("video.player.channel")}
        accessibilityLabel={model.channel.name}
        accessibilityRole={"button"}
        disabled={!channelId}
        onPress={() =>
          channelId && navigation.navigate("ChannelScreen", {channelId})
        }
        style={[styles.channelIdentity, {gap: theme.spacing.md}]}>
        <Image
          accessibilityIgnoresInvertColors
          contentFit={"cover"}
          source={avatarUrl ? {uri: avatarUrl} : undefined}
          style={[styles.avatar, {backgroundColor: theme.colors.surfaceRaised}]}
        />
        <AppText numberOfLines={1} style={styles.channelName} variant={"label"}>
          {model.channel.name}
        </AppText>
      </Pressable>
      <AppButton
        label={subscribed ? t("video.subscribed") : t("video.subscribe")}
        onPress={() => onSubscribe(!subscribed)}
        variant={subscribed ? "secondary" : "primary"}
      />
    </View>
  );
}

interface DescriptionPreviewProps {
  description: string;
  onPress: () => void;
}

function DescriptionPreview({description, onPress}: DescriptionPreviewProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const [focused, setFocused] = useState(false);
  const preview = useMemo(
    () => description.replace(/\s+/g, " ").trim(),
    [description],
  );

  return (
    <Pressable
      accessibilityHint={t("video.description.title")}
      accessibilityLabel={t("video.action.description")}
      accessibilityRole={"button"}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({pressed}) => [
        {
          marginHorizontal: theme.spacing.sm,
          padding: theme.spacing.md,
          borderRadius: theme.radii.card,
          borderWidth: 3,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          backgroundColor:
            pressed || focused
              ? theme.colors.surfacePressed
              : theme.colors.surface,
        },
      ]}>
      <AppText color={"textSecondary"} numberOfLines={2} variant={"bodySmall"}>
        {preview}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  text: {
    width: "100%",
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  channelIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  channelName: {
    flex: 1,
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
  },
});
