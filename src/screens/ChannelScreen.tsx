import React from "react";
import {View} from "react-native";
import useChannelDetails from "../hooks/useChannelDetails";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import Logger from "../utils/Logger";
import ChannelHeader from "../components/channel/ChannelHeader";
import LoadingComponent from "../components/general/LoadingComponent";
import Channel from "../components/channel/Channel";

const LOGGER = Logger.extend("CHANNEL");

type Props = NativeStackScreenProps<RootStackParamList, "ChannelScreen">;

export default function ChannelScreen({route}: Props) {
  const {channelId} = route.params;
  const {channel} = useChannelDetails(channelId);

  if (!channel) {
    return <LoadingComponent />;
  }

  return (
    <View style={{margin: 20, flex: 1}}>
      <ChannelHeader
        channelName={channel?.metadata.title ?? ""}
        imgURL={channel?.metadata?.thumbnail?.[0].url ?? ""}
      />
      <Channel channel={channel} />
    </View>
  );
}
