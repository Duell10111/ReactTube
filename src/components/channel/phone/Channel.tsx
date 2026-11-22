import {useNavigation} from "@react-navigation/native";
import React, {useCallback, useLayoutEffect, useMemo, useState} from "react";
import {
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import {ChannelHero} from "./ChannelHero";
import {ChannelTabBar} from "./ChannelTabBar";

import {getTVChannelTabs} from "@/components/channel/tv/channelModel";
import {getTVChannelHeader} from "@/extraction/tvChannelHeader";
import useChannelData, {
  type ChannelContentTypes,
} from "@/hooks/channel/useChannelData";
import {useTVChannelSubscription} from "@/hooks/channel/useTVChannelSubscription";
import {useTranslation} from "@/localization";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {AppButton, AppText} from "@/ui/components";
import {MediaFeed, SheetPanel, VideoDescriptionPanel} from "@/ui/patterns";
import {useFeedGeometry} from "@/ui/patterns/useFeedGeometry";
import {useAppTheme} from "@/ui/theme";
import type {YT} from "@/utils/Youtube";

interface Props {
  channel: YT.Channel;
  channelId: string;
}

/**
 * One scrolling feed under the channel hero. The section chips scroll with the
 * hero and stay pinned below the navigation bar once they reach it, so a long
 * feed never hides the way to another section.
 */
export function Channel({channel, channelId}: Props) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const navigation = useNavigation<RootNavProp>();
  const header = useMemo(() => getTVChannelHeader(channel), [channel]);
  const tabs = useMemo(
    () =>
      getTVChannelTabs(channel).filter(
        (tab): tab is ChannelContentTypes => tab !== "About",
      ),
    [channel],
  );
  const [selected, setSelected] = useState<ChannelContentTypes | undefined>(
    tabs[0],
  );
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tabBarOffset, setTabBarOffset] = useState<number>();
  const [pinned, setPinned] = useState(false);
  const {contentPadding, rowPadding} = useFeedGeometry();
  const subscription = useTVChannelSubscription(channelId);
  const labels: Record<ChannelContentTypes, string> = {
    Home: t("channel.tab.home"),
    Videos: t("channel.tab.videos"),
    Reels: t("channel.tab.shorts"),
    Live: t("channel.tab.live"),
    Playlists: t("channel.tab.playlists"),
  };
  const tabItems = tabs.map(value => ({value, label: labels[value]}));
  // A new section opens at the top of its feed, below the unpinned chips.
  const selectTab = useCallback((tab: ChannelContentTypes) => {
    setSelected(tab);
    setPinned(false);
  }, []);
  const title = header.title ?? t("channel.title");

  // The hero already names the channel; the bar takes the name over once the
  // hero has scrolled away.
  useLayoutEffect(() => {
    navigation.setOptions({title: pinned ? title : ""});
  }, [navigation, pinned, title]);

  const pinThreshold =
    tabBarOffset === undefined
      ? undefined
      : tabBarOffset + contentPadding.paddingTop;
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pinThreshold === undefined) return;
      const next = event.nativeEvent.contentOffset.y >= pinThreshold;
      setPinned(previous => (previous === next ? previous : next));
    },
    [pinThreshold],
  );

  const subscriptionLabel = !subscription.signedIn
    ? t("channel.signInToSubscribe")
    : subscription.subscribed !== undefined
      ? t(subscription.subscribed ? "video.subscribed" : "video.subscribe")
      : subscription.error
        ? t("common.retry")
        : t("video.subscribe");
  const onSubscribe = !subscription.signedIn
    ? () => navigation.navigate("LoginScreen")
    : subscription.subscribed === undefined
      ? subscription.retry
      : subscription.toggle;

  // The tab bar bleeds into the feed's side padding, so its chips can scroll
  // to the screen edge while the first one lines up with the cards.
  const bleed = {
    marginStart: -rowPadding.paddingStart,
    marginEnd: -rowPadding.paddingEnd,
  };

  const listHeader = (
    <View>
      <ChannelHero
        header={header}
        onAbout={() => setAboutOpen(true)}
        onSubscribe={onSubscribe}
        subscribed={subscription.subscribed}
        subscriptionError={subscription.error}
        subscriptionLabel={subscriptionLabel}
        subscriptionPending={subscription.pending}
      />
      {selected ? (
        <View
          onLayout={event => setTabBarOffset(event.nativeEvent.layout.y)}
          style={[bleed, pinned && styles.hidden]}>
          <ChannelTabBar
            inset={rowPadding.paddingStart}
            onValueChange={selectTab}
            tabs={tabItems}
            testID={"channel-tabs"}
            value={selected}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View
      style={[styles.screen, {backgroundColor: theme.colors.background}]}
      testID={"channel-screen"}>
      {selected ? (
        <ChannelFeed
          key={selected}
          channel={channel}
          header={listHeader}
          onScroll={handleScroll}
          type={selected}
        />
      ) : (
        <MediaFeed
          ListHeaderComponent={listHeader}
          emptyMessage={t("channel.empty.message")}
          emptyTitle={t("channel.empty.title")}
          items={[]}
        />
      )}
      {pinned && selected ? (
        <View
          style={[
            styles.pinned,
            {
              borderBottomColor: theme.colors.divider,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}>
          <ChannelTabBar
            inset={rowPadding.paddingStart}
            onValueChange={selectTab}
            tabs={tabItems}
            value={selected}
          />
        </View>
      ) : null}
      <SheetPanel
        onClose={() => setAboutOpen(false)}
        open={aboutOpen}
        subtitle={header.metadata}
        title={t("channel.aboutTitle", {channel: title})}>
        <VideoDescriptionPanel
          description={header.description || t("channel.noDescription")}
          inSheet
        />
      </SheetPanel>
    </View>
  );
}

interface ChannelFeedProps {
  channel: YT.Channel;
  type: ChannelContentTypes;
  header: React.ReactElement;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

function ChannelFeed({channel, type, header, onScroll}: ChannelFeedProps) {
  const {items, loading, error, paginationError, fetchMore, refresh} =
    useChannelData(channel, type);
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  return (
    <View style={styles.screen}>
      <MediaFeed
        ListHeaderComponent={header}
        emptyMessage={t("channel.empty.message")}
        emptyTitle={t("channel.empty.title")}
        error={error}
        items={items}
        loading={loading}
        onEndReached={paginationError ? undefined : fetchMore}
        onRefresh={refresh}
        onRetry={refresh}
        onScroll={onScroll}
        testID={`channel-${type.toLowerCase()}-feed`}
      />
      {paginationError ? (
        <View
          style={[
            styles.pagination,
            {
              backgroundColor: theme.colors.surface,
              gap: theme.spacing.md,
              padding: theme.spacing.md,
            },
          ]}>
          <AppText
            accessibilityRole={"alert"}
            color={"textSecondary"}
            style={styles.screen}
            variant={"bodySmall"}>
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
  hidden: {opacity: 0},
  pinned: {position: "absolute", top: 0, left: 0, right: 0},
  pagination: {flexDirection: "row", alignItems: "center"},
});
