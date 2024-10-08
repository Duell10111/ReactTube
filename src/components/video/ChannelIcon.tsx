import {useNavigation} from "@react-navigation/native";
import {Image, ImageStyle} from "expo-image";
import React from "react";
import {StyleProp, StyleSheet, TouchableOpacity} from "react-native";

import useChannelDetails from "../../hooks/useChannelDetails";
import {NativeStackProp} from "../../navigation/types";

interface Props {
  channelId: string;
  thumbnailUrl?: string;
  imageStyle?: StyleProp<ImageStyle>;
}

export default function ChannelIcon({
  channelId,
  thumbnailUrl,
  imageStyle,
}: Props) {
  const {channel} = useChannelDetails(channelId);

  const navigation = useNavigation<NativeStackProp>();

  const thumbnail = channel?.metadata?.thumbnail?.[0].url;

  const url = thumbnailUrl ?? thumbnail;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate("ChannelScreen", {channelId})}>
      <Image
        style={[styles.image, imageStyle]}
        source={
          url ? {uri: url} : require("../../../assets/grey-background.jpg")
        }
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {},
  image: {
    width: 75,
    height: 75,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "black",
  },
});
