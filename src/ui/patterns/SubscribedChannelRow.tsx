import React, {useCallback} from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type ListRenderItem,
} from "react-native";

import {ChannelAvatar} from "./ChannelAvatar";

import type {SubscribedChannel} from "@/extraction/subscribedChannels";
import {useTranslation} from "@/localization";
import {AppButton, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion} from "@/ui/tv";

interface SubscribedChannelRowProps {
  channels: SubscribedChannel[];
  /** The channel the feed is filtered to, if any. */
  selectedChannel?: SubscribedChannel;
  /** Filters the feed to a channel, or shows every channel for `undefined`. */
  onSelectChannel: (channel?: SubscribedChannel) => void;
  onOpenChannel: (channel: SubscribedChannel) => void;
  onSeeAll: () => void;
}

/**
 * The subscribed channels above the subscriptions feed: a title with an action
 * for the full list, and a horizontal row of avatars in YouTube's order.
 *
 * As in the YouTube app, an avatar filters the feed to that channel instead of
 * opening it; the header then offers the channel page and the way back to
 * every channel. Pressing the selected avatar again also clears the filter.
 */
export function SubscribedChannelRow({
  channels,
  selectedChannel,
  onSelectChannel,
  onOpenChannel,
  onSeeAll,
}: SubscribedChannelRowProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const selectedId = selectedChannel?.id;

  const renderItem = useCallback<ListRenderItem<SubscribedChannel>>(
    ({item}) => {
      const selected = item.id === selectedId;
      return (
        <ChannelAvatar
          channel={item}
          onPress={() => onSelectChannel(selected ? undefined : item)}
          selected={selected}
        />
      );
    },
    [onSelectChannel, selectedId],
  );

  if (channels.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        gap: theme.spacing.sm,
        // On TV the overscan margin already separates the row from the top.
        paddingTop: Platform.isTV ? 0 : theme.spacing.md,
        paddingBottom: theme.spacing.md,
      }}>
      {/*
       * The header spans the full width as a region of its own: the action
       * sits at the far end, and without the region an Up press from a
       * channel below the title found nothing above it and went nowhere.
       */}
      <TVFocusRegion style={[styles.header, {gap: theme.spacing.md}]}>
        <AppText numberOfLines={1} style={styles.title} variant={"titleMedium"}>
          {selectedChannel?.title ?? t("subscriptions.channels.title")}
        </AppText>
        {selectedChannel ? (
          <>
            <AppButton
              label={t("subscriptions.channels.viewChannel")}
              onPress={() => onOpenChannel(selectedChannel)}
              testID={"subscribed-channels-view-channel"}
              variant={"secondary"}
            />
            <AppButton
              label={t("subscriptions.channels.showAll")}
              onPress={() => onSelectChannel(undefined)}
              testID={"subscribed-channels-show-all"}
              variant={"secondary"}
            />
          </>
        ) : (
          <AppButton
            label={t("subscriptions.channels.all")}
            onPress={onSeeAll}
            testID={"subscribed-channels-see-all"}
            variant={"secondary"}
          />
        )}
      </TVFocusRegion>
      {/* Its own region, so returning to the row lands on the last channel. */}
      <TVFocusRegion>
        <FlatList
          contentContainerStyle={{gap: theme.spacing.sm}}
          data={channels}
          extraData={selectedId}
          horizontal
          initialNumToRender={8}
          keyExtractor={channel => channel.id}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={!Platform.isTV}
          testID={"subscribed-channels-row"}
        />
      </TVFocusRegion>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
  },
});
