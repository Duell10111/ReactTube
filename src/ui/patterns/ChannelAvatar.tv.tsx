import {Image} from "expo-image";
import React, {useRef, useState} from "react";
import {Animated, Pressable, StyleSheet, View} from "react-native";

import {
  getSubscribedChannelLabel,
  type ChannelAvatarProps,
} from "./subscribedChannelModel";

import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

const AVATAR_SIZE = 112;
const DOT_SIZE = 20;

/**
 * TV variant of the channel avatar. Focus is an outline around the avatar plus
 * the shared focus scale; the outline is reserved in every state, so moving
 * focus along the row never shifts the neighbors.
 */
export function ChannelAvatar({channel, onPress, testID}: ChannelAvatarProps) {
  const {theme, reduceMotion} = useAppTheme();
  const {t} = useTranslation();
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const focusBorderWidth = theme.controls.focusBorderWidth;
  const ringSize = AVATAR_SIZE + focusBorderWidth * 4;

  const animateTo = (value: number) => {
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }

    Animated.timing(scale, {
      toValue: value,
      duration: theme.motion.duration.standard,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityLabel={getSubscribedChannelLabel(channel, t)}
      accessibilityRole={"button"}
      onBlur={() => {
        setFocused(false);
        animateTo(1);
      }}
      onFocus={() => {
        setFocused(true);
        animateTo(theme.motion.tvFocusScale);
      }}
      onPress={onPress}
      style={[
        styles.container,
        {
          gap: theme.spacing.sm,
          // Room for the scaled avatar, so its outline is never clipped.
          paddingVertical: theme.spacing.sm,
          width: ringSize + theme.spacing.xl,
        },
      ]}
      testID={testID ?? "channel-avatar"}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderWidth: focusBorderWidth,
            borderColor: focused
              ? theme.colors.focus
              : theme.colors.focusResting,
            transform: [{scale}],
          },
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
      </Animated.View>
      <AppText
        color={focused ? "textPrimary" : "textSecondary"}
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
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  dot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 3,
  },
  name: {
    textAlign: "center",
    width: "100%",
  },
});
