import React from "react";
import {StyleSheet, TouchableOpacity} from "react-native";
import FastImage from "react-native-fast-image";
import useChannelDetails from "../../hooks/useChannelDetails";
import {useNavigation} from "@react-navigation/native";
import {NativeStackProp} from "../../navigation/types";

interface Props {
  channelId: string;
}

export default function ChannelIcon({channelId}: Props) {
  const {channel} = useChannelDetails(channelId);

  const navigation = useNavigation<NativeStackProp>();

  const thumbnail = channel?.metadata?.thumbnail?.[0].url;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() =>
        navigation.navigate("ChannelScreen", {channelId: channelId})
      }>
      <FastImage
        style={styles.image}
        source={{
          uri:
            thumbnail ??
            "https://www.cleverfiles.com/howto/wp-content/uploads/2018/03/minion.jpg",
        }}
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
