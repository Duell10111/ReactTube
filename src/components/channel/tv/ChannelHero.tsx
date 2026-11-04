import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import {
  ActivityIndicator,
  PixelRatio,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, {Defs, LinearGradient, Rect, Stop} from "react-native-svg";

import {getTVChannelLayout} from "./channelModel";

import type {getTVChannelHeader} from "@/extraction/tvChannelHeader";
import {useTranslation} from "@/localization";
import {AppButton, AppText} from "@/ui/components";
import {resolveThumbnailUrl} from "@/ui/patterns/thumbnailSource";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion, useTVOverscanInsets} from "@/ui/tv";

interface ChannelHeroProps {
  header: ReturnType<typeof getTVChannelHeader>;
  collapsed: boolean;
  onAbout: () => void;
  subscriptionLabel?: string;
  onSubscribe?: () => void;
  subscriptionPending?: boolean;
  subscriptionError?: boolean;
}

export function ChannelHero({
  header,
  collapsed,
  onAbout,
  subscriptionLabel,
  onSubscribe,
  subscriptionPending,
  subscriptionError,
}: ChannelHeroProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {height} = useWindowDimensions();
  const contentInsets = useTVOverscanInsets();
  const layout = getTVChannelLayout(height);
  const avatarSize = collapsed ? 40 : layout.avatarSize;
  const avatar = resolveThumbnailUrl(
    header.avatar,
    avatarSize,
    PixelRatio.get(),
  );

  return (
    <View
      style={[
        styles.hero,
        {
          height: collapsed ? layout.compactHeight : layout.heroHeight,
          backgroundColor: theme.colors.background,
        },
      ]}
      testID={collapsed ? "tv-channel-hero-compact" : "tv-channel-hero"}>
      {!collapsed && header.banner ? (
        <View pointerEvents={"none"} style={StyleSheet.absoluteFill}>
          <Image
            source={{uri: header.banner}}
            contentFit={"cover"}
            style={StyleSheet.absoluteFill}
            accessibilityIgnoresInvertColors
          />
          <Svg width={"100%"} height={"100%"} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient
                id={"channelHeroHorizontal"}
                x1={"0"}
                y1={"0"}
                x2={"1"}
                y2={"0"}>
                <Stop
                  offset={"0"}
                  stopColor={theme.colors.background}
                  stopOpacity={"1"}
                />
                <Stop
                  offset={"0.5"}
                  stopColor={theme.colors.background}
                  stopOpacity={"0.92"}
                />
                <Stop
                  offset={"1"}
                  stopColor={theme.colors.background}
                  stopOpacity={"0.18"}
                />
              </LinearGradient>
              <LinearGradient
                id={"channelHeroVertical"}
                x1={"0"}
                y1={"0"}
                x2={"0"}
                y2={"1"}>
                <Stop
                  offset={"0.55"}
                  stopColor={theme.colors.background}
                  stopOpacity={"0"}
                />
                <Stop
                  offset={"1"}
                  stopColor={theme.colors.background}
                  stopOpacity={"1"}
                />
              </LinearGradient>
            </Defs>
            <Rect
              width={"100%"}
              height={"100%"}
              fill={"url(#channelHeroHorizontal)"}
            />
            <Rect
              width={"100%"}
              height={"100%"}
              fill={"url(#channelHeroVertical)"}
            />
          </Svg>
        </View>
      ) : null}
      <View
        style={[
          styles.copy,
          {
            marginStart: contentInsets.left,
            marginEnd: contentInsets.right,
            paddingTop: collapsed ? theme.spacing.sm : theme.spacing.lg,
            gap: theme.spacing.sm,
          },
        ]}>
        <View style={[styles.identity, {gap: theme.spacing.lg}]}>
          {avatar ? (
            <Image
              source={{uri: avatar}}
              contentFit={"cover"}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: theme.radii.round,
                backgroundColor: theme.colors.surfaceRaised,
              }}
            />
          ) : (
            <MaterialIcons
              name={"account-circle"}
              size={avatarSize}
              color={theme.colors.textSecondary}
            />
          )}
          <View style={styles.name}>
            <AppText
              accessibilityRole={"header"}
              numberOfLines={1}
              style={{
                fontSize: collapsed ? 24 : layout.titleSize,
                lineHeight: collapsed ? 32 : layout.titleLineHeight,
                fontWeight: "700",
              }}>
              {header.title ?? t("channel.title")}
            </AppText>
            {!collapsed && header.metadata ? (
              <AppText
                color={"textSecondary"}
                variant={"bodySmall"}
                numberOfLines={1}>
                {header.metadata}
              </AppText>
            ) : null}
          </View>
        </View>
        {!collapsed ? (
          <>
            {header.description ? (
              <AppText
                color={"textSecondary"}
                variant={"bodySmall"}
                numberOfLines={layout.compact ? 1 : 2}
                style={styles.description}>
                {header.description}
              </AppText>
            ) : null}
            <TVFocusRegion
              autoFocus={false}
              style={[styles.actions, {gap: theme.spacing.md}]}>
              {subscriptionLabel && onSubscribe ? (
                <AppButton
                  label={subscriptionLabel}
                  onPress={onSubscribe}
                  accessibilityState={{busy: subscriptionPending}}
                  variant={"secondary"}
                  testID={"tv-channel-subscribe"}
                />
              ) : null}
              {subscriptionPending ? (
                <ActivityIndicator
                  accessibilityLabel={t("common.loading")}
                  color={theme.colors.textSecondary}
                />
              ) : null}
              <AppButton
                label={t("channel.moreAbout")}
                onPress={onAbout}
                variant={"secondary"}
              />
            </TVFocusRegion>
            {subscriptionError ? (
              <AppText
                accessibilityRole={"alert"}
                color={"error"}
                variant={"labelSmall"}>
                {t("channel.subscriptionError")}
              </AppText>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {overflow: "hidden"},
  copy: {flex: 1, justifyContent: "center"},
  identity: {flexDirection: "row", alignItems: "center"},
  name: {flex: 1},
  description: {maxWidth: "66%"},
  actions: {flexDirection: "row", alignSelf: "flex-start"},
});
