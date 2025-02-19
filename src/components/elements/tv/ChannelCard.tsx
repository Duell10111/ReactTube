import {useNavigation} from "@react-navigation/native";
import {Image} from "expo-image";
import React from "react";
import {StyleSheet, Text, TouchableOpacity} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";
import {ChannelData} from "@/extraction/Types";
import {NativeStackProp} from "@/navigation/types";

interface Props {
  element: ChannelData;
}

export default function ChannelCard({element}: Props) {
  const {style} = useAppStyle();
  const navigation = useNavigation<NativeStackProp>();

  return (
    <TouchableOpacity
      style={styles.touchContainer}
      onPress={() =>
        navigation.push("ChannelScreen", {
          channelId: element.id,
        })
      }>
      <Image
        style={styles.image}
        source={{
          uri: element.thumbnailImage.url,
        }}
      />
      <Text style={[styles.text, {color: style.textColor}]}>
        {element.title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#444444",
  },
  text: {
    fontSize: 25,
    fontWeight: "bold",
    marginTop: 10,
  },
});
