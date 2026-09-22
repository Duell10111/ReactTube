import {useFocusEffect} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import {Platform, TVEventControl} from "react-native";

import Channel from "../components/channel/Channel";
import ChannelHeader from "../components/channel/ChannelHeader";
import {Channel as ChannelPhone} from "../components/channel/phone/Channel";
import useChannelDetails from "../hooks/useChannelDetails";

import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {ErrorState, Skeleton} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

type Props = NativeStackScreenProps<RootStackParamList, "ChannelScreen">;

export default function ChannelScreen({route}: Props) {
  const {channelId} = route.params;
  const {channel, parsedChannel, loading, error, reload} =
    useChannelDetails(channelId);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  // Workaround return issue
  useFocusEffect(() => {
    // Enable TV Menu Key to fix issue if video not loading
    if (Platform.isTV) {
      TVEventControl.enableTVMenuKey();
    }
  });

  if (loading) {
    return (
      <Skeleton
        accessibilityLabel={t("channel.loading")}
        height={180}
        style={{margin: theme.spacing.xl}}
      />
    );
  }

  if (error || !channel || !parsedChannel) {
    return (
      <ErrorState
        message={t("channel.error.message")}
        onRetry={reload}
        title={t("channel.error.title")}
      />
    );
  }

  if (!Platform.isTV) {
    return <ChannelPhone channel={parsedChannel} />;
  }

  return (
    <ShelfVideoSelectorProvider>
      <ChannelHeader
        channelName={channel?.metadata.title ?? ""}
        imgURL={channel?.metadata?.thumbnail?.[0].url ?? ""}
      />
      <Channel channel={channel} />
    </ShelfVideoSelectorProvider>
  );
}
