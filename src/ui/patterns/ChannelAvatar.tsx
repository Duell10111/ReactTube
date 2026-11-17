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
const DOT_SIZE = 12;

/**
 * A subscribed channel as a round avatar with its name below. A dot marks
 * channels with uploads the user has not seen yet.
 */
export function ChannelAvatar({channel, onPress, testID}: ChannelAvatarProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  return (
    <Pressable
      accessibilityLabel={getSubscribedChannelLabel(channel, t)}
      accessibilityRole={"button"}
      onPress={onPress}
      style={({pressed}) => [
        styles.container,
        {gap: theme.spacing.xs, opacity: pressed ? 0.7 : 1},
      ]}
      testID={testID ?? "channel-avatar"}>
      <View>
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
      <AppText numberOfLines={1} style={styles.name} variant={"labelSmall"}>
        {channel.title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: AVATAR_SIZE + 16,
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
