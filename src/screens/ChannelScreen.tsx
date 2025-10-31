import {useFocusEffect} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import {Platform, TVEventControl} from "react-native";

import Channel from "../components/channel/Channel";
import ChannelHeader from "../components/channel/ChannelHeader";
import {Channel as ChannelPhone} from "../components/channel/phone/Channel";
import LoadingComponent from "../components/general/LoadingComponent";
import useChannelDetails from "../hooks/useChannelDetails";
import Logger from "../utils/Logger";

import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

const LOGGER = Logger.extend("CHANNEL");

type Props = NativeStackScreenProps<RootStackParamList, "ChannelScreen">;

export default function ChannelScreen({route}: Props) {
  const {channelId} = route.params;
  const {channel, parsedChannel} = useChannelDetails(channelId);

  // Workaround return issue
  useFocusEffect(() => {
    // Enable TV Menu Key to fix issue if video not loading
    if (Platform.isTV) {
      TVEventControl.enableTVMenuKey();
    }
  });

  if (!channel || !parsedChannel) {
    return <LoadingComponent />;
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
