import {RouteProp, useNavigation, useRoute} from "@react-navigation/native";
import {Image} from "expo-image";
import React, {useCallback, useMemo} from "react";
import {
  SectionList,
  StyleSheet,
  View,
  type SectionListRenderItem,
} from "react-native";

import type {SubscribedChannel} from "@/extraction/subscribedChannels";
import {useTranslation} from "@/localization";
import type {
  RootNavProp,
  RootStackParamList,
} from "@/navigation/RootStackNavigator";
import {AppListItem, AppText, EmptyState} from "@/ui/components";
import {groupSubscribedChannels} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion, useTVOverscanInsets} from "@/ui/tv";

const AVATAR_SIZE = 40;

interface ChannelSection {
  title: string;
  data: SubscribedChannel[];
}

/**
 * Every subscribed channel, opened from the channel row above the
 * subscriptions feed. The list arrives as a route parameter, so the screen
 * shows instantly instead of loading the feed a second time.
 */
export default function SubscribedChannelsScreen() {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const navigation = useNavigation<RootNavProp>();
  const {params} =
    useRoute<RouteProp<RootStackParamList, "SubscribedChannelsScreen">>();
  const overscan = useTVOverscanInsets();

  const sections = useMemo<ChannelSection[]>(() => {
    const {withNewContent, others} = groupSubscribedChannels(params.channels);

    return [
      {title: t("subscriptions.channels.newContent"), data: withNewContent},
      {title: t("subscriptions.channels.others"), data: others},
    ].filter(section => section.data.length > 0);
  }, [params.channels, t]);

  const renderItem = useCallback<
    SectionListRenderItem<SubscribedChannel, ChannelSection>
  >(
    ({item}) => (
      <AppListItem
        leading={
          <Image
            contentFit={"cover"}
            source={item.thumbnail ? {uri: item.thumbnail.url} : undefined}
            style={[
              styles.avatar,
              {backgroundColor: theme.colors.surfaceRaised},
            ]}
          />
        }
        onPress={() =>
          navigation.navigate("ChannelScreen", {channelId: item.id})
        }
        title={item.title}
      />
    ),
    [navigation, theme.colors.surfaceRaised],
  );

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <TVFocusRegion style={styles.container}>
        <SectionList
          ListEmptyComponent={
            <EmptyState
              message={t("subscriptions.channels.empty.message")}
              title={t("subscriptions.channels.empty.title")}
            />
          }
          contentContainerStyle={{
            gap: theme.spacing.xs,
            paddingTop: theme.spacing.lg + overscan.top,
            paddingBottom: theme.spacing.lg + overscan.bottom,
            paddingLeft: theme.spacing.lg + overscan.left,
            paddingRight: theme.spacing.lg + overscan.right,
          }}
          keyExtractor={channel => channel.id}
          renderItem={renderItem}
          renderSectionHeader={({section}) => (
            <AppText
              color={"textSecondary"}
              style={{
                paddingTop: theme.spacing.lg,
                paddingBottom: theme.spacing.xs,
              }}
              variant={"label"}>
              {section.title}
            </AppText>
          )}
          sections={sections}
          stickySectionHeadersEnabled={false}
          testID={"subscribed-channels-list"}
        />
      </TVFocusRegion>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
});
