import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React, {useState} from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import Svg, {Defs, LinearGradient, Rect, Stop} from "react-native-svg";

import {ShortScrubber} from "@/components/shorts/phone/ShortScrubber";
import {useTranslation} from "@/localization";

export interface ShortAction {
  id: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  /** Count or name under the icon, as the YouTube app shows it. */
  caption: string;
  accessibilityLabel: string;
  active?: boolean;
  onPress?: () => void;
}

interface ShortOverlayProps {
  title: string;
  channelName?: string;
  avatarUrl?: string;
  onOpenChannel?: () => void;
  /** Left out when the subscription cannot be changed, e.g. signed out. */
  subscribed?: boolean;
  onToggleSubscription?: () => void;
  actions: ShortAction[];
  currentSeconds: number;
  durationSeconds?: number;
  onSeek: (seconds: number) => void;
  /** Tells the pager to hold still while the bar is dragged. */
  onScrubbingChange: (scrubbing: boolean) => void;
  insets: {bottom: number; left: number; right: number};
  /** Only the visible short takes touches. */
  interactive: boolean;
}

/**
 * The overlay of a phone short, modelled on the YouTube app: a fade instead
 * of a solid bar, channel, subscribe button and title at the bottom left, the
 * actions in a column on the right, and a thin progress bar along the edge
 * that can be dragged to seek. While it is dragged only the bar stays, so the
 * picture and the target time are not covered.
 */
export function ShortOverlay({
  title,
  channelName,
  avatarUrl,
  onOpenChannel,
  subscribed,
  onToggleSubscription,
  actions,
  currentSeconds,
  durationSeconds,
  onSeek,
  onScrubbingChange,
  insets,
  interactive,
}: ShortOverlayProps) {
  const {t} = useTranslation();
  const [scrubbing, setScrubbing] = useState(false);

  return (
    <View
      pointerEvents={interactive ? "box-none" : "none"}
      style={StyleSheet.absoluteFill}>
      <View pointerEvents={"none"} style={styles.fade}>
        <Svg height={"100%"} width={"100%"}>
          <Defs>
            <LinearGradient
              id={"shortOverlayFade"}
              x1={"0"}
              x2={"0"}
              y1={"0"}
              y2={"1"}>
              <Stop offset={"0"} stopColor={"#000"} stopOpacity={"0"} />
              <Stop offset={"1"} stopColor={"#000"} stopOpacity={"0.7"} />
            </LinearGradient>
          </Defs>
          <Rect
            fill={"url(#shortOverlayFade)"}
            height={"100%"}
            width={"100%"}
          />
        </Svg>
      </View>
      <View
        pointerEvents={scrubbing ? "none" : "box-none"}
        style={[
          styles.content,
          scrubbing && styles.hidden,
          {
            paddingBottom: insets.bottom + 16,
            paddingLeft: insets.left + 16,
            paddingRight: insets.right + 8,
          },
        ]}>
        <View pointerEvents={"box-none"} style={styles.info}>
          <View pointerEvents={"box-none"} style={styles.channelRow}>
            <Pressable
              accessibilityRole={"button"}
              disabled={!onOpenChannel}
              onPress={onOpenChannel}
              style={styles.channel}>
              {avatarUrl ? (
                <Image source={{uri: avatarUrl}} style={styles.avatar} />
              ) : null}
              {channelName ? (
                <Text numberOfLines={1} style={styles.channelName}>
                  {channelName}
                </Text>
              ) : null}
            </Pressable>
            {subscribed !== undefined && onToggleSubscription ? (
              <Pressable
                accessibilityRole={"button"}
                accessibilityState={{selected: subscribed}}
                onPress={onToggleSubscription}
                style={({pressed}) => [
                  styles.subscribe,
                  subscribed ? styles.subscribed : styles.unsubscribed,
                  pressed && styles.pressed,
                ]}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.subscribeLabel,
                    {color: subscribed ? "white" : "black"},
                  ]}>
                  {t(subscribed ? "video.subscribed" : "video.subscribe")}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
        </View>
        <View pointerEvents={"box-none"} style={styles.rail}>
          {actions.map(action => (
            <Pressable
              accessibilityLabel={action.accessibilityLabel}
              accessibilityRole={"button"}
              accessibilityState={
                action.active !== undefined
                  ? {selected: action.active}
                  : undefined
              }
              disabled={!action.onPress}
              key={action.id}
              onPress={action.onPress}
              style={({pressed}) => [styles.action, pressed && styles.pressed]}>
              <MaterialIcons
                color={"white"}
                name={action.icon}
                size={32}
                style={styles.shadow}
              />
              <Text numberOfLines={1} style={[styles.caption, styles.shadow]}>
                {action.caption}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ShortScrubber
        bottom={insets.bottom}
        currentSeconds={currentSeconds}
        durationSeconds={durationSeconds}
        onScrubbingChange={next => {
          setScrubbing(next);
          onScrubbingChange(next);
        }}
        onSeek={onSeek}
      />
    </View>
  );
}

const textShadow = {
  textShadowColor: "#00000099",
  textShadowOffset: {width: 0, height: 1},
  textShadowRadius: 3,
};

const styles = StyleSheet.create({
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
  },
  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 10,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  channel: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  channelName: {
    flexShrink: 1,
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    ...textShadow,
  },
  subscribe: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  unsubscribed: {
    backgroundColor: "white",
  },
  subscribed: {
    backgroundColor: "#FFFFFF33",
  },
  subscribeLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    color: "white",
    fontSize: 15,
    ...textShadow,
  },
  rail: {
    alignItems: "center",
    gap: 18,
    paddingBottom: 4,
  },
  action: {
    alignItems: "center",
    minWidth: 56,
    gap: 2,
  },
  caption: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  shadow: textShadow,
  pressed: {
    opacity: 0.6,
  },
  hidden: {
    opacity: 0,
  },
});
