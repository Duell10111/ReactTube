import React from "react";
import {Image, StyleSheet, Text, View} from "react-native";

interface Props {
  channelName: string;
  imgURL: string;
}

export default function ChannelHeader({imgURL, channelName}: Props) {
  return (
    <View style={styles.container}>
      <Image source={{uri: imgURL}} style={styles.img} />
      <Text style={styles.channelTitle}>{channelName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    margin: 20,
  },
  img: {
    borderRadius: 50,
    width: 75,
    height: 75,
  },
  channelTitle: {
    fontSize: 20,
    marginStart: 10,
  },
});
