import React from "react";
import {StyleSheet, TouchableOpacity} from "react-native";
import FastImage from "react-native-fast-image";
import useChannelDetails from "../../hooks/useChannelDetails";

interface Props {
  channelId: string;
}

export default function ChannelIcon({channelId}: Props) {
  const {channel} = useChannelDetails(channelId);

  return (
    <TouchableOpacity>
      <FastImage source={{uri: channel?.metadata.thumbnail?.[0]?.url}} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {},
  image: {
    width: 50,
    height: 50,
  },
});
