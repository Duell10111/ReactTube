import {useNavigation} from "@react-navigation/native";
import React, {useCallback, useMemo, useState} from "react";
import {
  StyleSheet,
  TVTextScrollView,
  View,
  type ScrollViewProps,
} from "react-native";

import ChannelButtons from "./ChannelButtons";
import {ChannelHero} from "./tv/ChannelHero";
import {getTVChannelTabs, type TVChannelTab} from "./tv/channelModel";

import {getTVChannelHeader} from "@/extraction/tvChannelHeader";
import useChannelData, {
  type ChannelContentTypes,
} from "@/hooks/channel/useChannelData";
import {useTVChannelSubscription} from "@/hooks/channel/useTVChannelSubscription";
import {useTranslation} from "@/localization";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {AppButton, AppText} from "@/ui/components";
import {MediaFeed} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion, useTVOverscanInsets} from "@/ui/tv";
import type {YT} from "@/utils/Youtube";

interface Props {
  channel: YT.Channel;
  channelId: string;
}

// RN TV's generated declaration drops ScrollView's props; the native component accepts them.
const DescriptionScrollView =
  TVTextScrollView as unknown as React.ComponentType<ScrollViewProps>;

export default function Channel({channel, channelId}: Props) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const contentInsets = useTVOverscanInsets();
  const navigation = useNavigation<RootNavProp>();
  const tabs = useMemo(() => getTVChannelTabs(channel), [channel]);
  const [selected, setSelected] = useState<TVChannelTab>(tabs[0]);
  const [collapsed, setCollapsed] = useState(false);
  const [aboutFocused, setAboutFocused] = useState(false);
  const header = useMemo(() => getTVChannelHeader(channel), [channel]);
  const subscription = useTVChannelSubscription(channelId);
  const labels: Record<TVChannelTab, string> = {
    Home: t("channel.tab.home"),
    Videos: t("channel.tab.videos"),
    Reels: t("channel.tab.shorts"),
    Live: t("channel.tab.live"),
    Playlists: t("channel.tab.playlists"),
    About: t("channel.tab.about"),
  };
  const expand = useCallback(() => setCollapsed(false), []);
  const collapse = useCallback(() => setCollapsed(true), []);
  const subscriptionLabel = !subscription.signedIn
    ? t("channel.signInToSubscribe")
    : subscription.subscribed !== undefined
      ? t(subscription.subscribed ? "video.subscribed" : "video.subscribe")
      : subscription.error
        ? t("common.retry")
        : undefined;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
          paddingTop: contentInsets.top,
        },
      ]}
      testID={"tv-channel-screen"}>
      <ChannelHero
        header={header}
        collapsed={collapsed}
        onAbout={() => setSelected("About")}
        subscriptionLabel={subscriptionLabel}
        subscriptionPending={subscription.pending}
        subscriptionError={subscription.error}
        onSubscribe={
          !subscription.signedIn
            ? () => navigation.navigate("LoginScreen")
            : subscription.subscribed === undefined
              ? subscription.retry
              : subscription.toggle
        }
      />
      <ChannelButtons
        buttons={tabs.map(value => ({value, label: labels[value]}))}
        value={selected}
        onValueChange={setSelected}
        onFocus={expand}
      />
      {selected === "About" ? (
        <TVFocusRegion
          style={[
            styles.about,
            {
              marginStart: contentInsets.left,
              marginEnd: contentInsets.right,
              paddingBottom: contentInsets.bottom,
              paddingTop: theme.spacing.lg,
            },
          ]}>
          <DescriptionScrollView
            contentContainerStyle={{padding: theme.spacing.lg}}
            onFocus={() => setAboutFocused(true)}
            onBlur={() => setAboutFocused(false)}
            style={[
              styles.screen,
              {
                borderWidth: theme.controls.focusBorderWidth,
                borderRadius: theme.radii.panel,
                borderColor: aboutFocused
                  ? theme.colors.focus
                  : theme.colors.focusResting,
              },
            ]}
            testID={"tv-channel-about"}>
            <AppText
              accessibilityRole={"header"}
              variant={"titleMedium"}
              style={{marginBottom: theme.spacing.lg}}>
              {t("channel.aboutTitle", {
                channel: header.title ?? t("channel.title"),
              })}
            </AppText>
            <AppText color={"textSecondary"} numberOfLines={0}>
              {header.description || t("channel.noDescription")}
            </AppText>
          </DescriptionScrollView>
        </TVFocusRegion>
      ) : (
        <ChannelRow
          key={selected}
          channel={channel}
          type={selected}
          onElementFocused={collapse}
        />
      )}
    </View>
  );
}

function ChannelRow({
  channel,
  type,
  onElementFocused,
}: {
  channel: YT.Channel;
  type: ChannelContentTypes;
  onElementFocused: () => void;
}) {
  const {items, loading, error, paginationError, fetchMore, refresh} =
    useChannelData(channel, type);
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const contentInsets = useTVOverscanInsets();
  return (
    <View onFocus={onElementFocused} style={styles.screen}>
      <MediaFeed
        contentInsets={contentInsets}
        items={items}
        loading={loading}
        error={error}
        onRetry={refresh}
        onEndReached={paginationError ? undefined : fetchMore}
        onElementFocused={onElementFocused}
        emptyTitle={t("channel.empty.title")}
        emptyMessage={t("channel.empty.message")}
        testID={`tv-channel-${type.toLowerCase()}-feed`}
      />
      {paginationError ? (
        <View
          style={[
            styles.pagination,
            {
              gap: theme.spacing.md,
              marginStart: contentInsets.left,
              marginEnd: contentInsets.right,
              paddingBottom: contentInsets.bottom,
            },
          ]}>
          <AppText
            accessibilityRole={"alert"}
            color={"textSecondary"}
            variant={"bodySmall"}
            style={styles.screen}>
            {t("channel.loadMoreError")}
          </AppText>
          <AppButton
            label={t("common.retry")}
            onPress={fetchMore}
            variant={"secondary"}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1},
  about: {flex: 1},
  pagination: {flexDirection: "row", alignItems: "center"},
});
