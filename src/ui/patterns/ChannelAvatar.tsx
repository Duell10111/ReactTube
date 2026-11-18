import {Image} from "expo-image";
import React from "react";
import {Pressable, StyleSheet, View} from "react-native";

import {
  getSubscribedChannelLabel,
  type ChannelAvatarProps,
} from "./subscribedChannelModel";

import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

const AVATAR_SIZE = 64;
const RING_WIDTH = 2;
// The ring keeps a gap to the avatar, so the selection reads as an outline.
const RING_SIZE = AVATAR_SIZE + RING_WIDTH * 4;
const DOT_SIZE = 12;

/**
 * A subscribed channel as a round avatar with its name below. A dot marks
 * channels with uploads the user has not seen yet, and a ring the channel the
 * feed is filtered to.
 */
export function ChannelAvatar({
  channel,
  selected = false,
  onPress,
  testID,
}: ChannelAvatarProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  return (
    <Pressable
      accessibilityLabel={getSubscribedChannelLabel(channel, t)}
      accessibilityRole={"button"}
      accessibilityState={{selected}}
      onPress={onPress}
      style={({pressed}) => [
        styles.container,
        {gap: theme.spacing.xs, opacity: pressed ? 0.7 : 1},
      ]}
      testID={testID ?? "channel-avatar"}>
      <View
        style={[
          styles.ring,
          {borderColor: selected ? theme.colors.brand : "transparent"},
        ]}>
        <Image
          contentFit={"cover"}
          source={channel.thumbnail ? {uri: channel.thumbnail.url} : undefined}
          style={[styles.avatar, {backgroundColor: theme.colors.surfaceRaised}]}
        />
        {channel.hasNewContent ? (
          <View
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.brand,
                borderColor: theme.colors.background,
              },
            ]}
          />
        ) : null}
      </View>
      <AppText
        color={selected ? "textPrimary" : "textSecondary"}
        numberOfLines={1}
        style={styles.name}
        variant={"labelSmall"}>
        {channel.title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: RING_SIZE + 8,
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_WIDTH,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  dot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
  },
  name: {
    textAlign: "center",
    width: "100%",
  },
});
