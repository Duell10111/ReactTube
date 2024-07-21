import {Icon} from "@rneui/base";
import React from "react";
import {Image, StyleSheet, Text, View} from "react-native";

import {useAppStyle} from "../../context/AppStyleContext";
import {Thumbnail} from "../../extraction/Types";

interface MusicPlaylistHeaderProps {
  image: Thumbnail;
  title: string;
  subtitle: string;
  onPlayPress?: () => void;
}

export function MusicPlaylistHeader({
  image,
  title,
  subtitle,
  onPlayPress,
}: MusicPlaylistHeaderProps) {
  const {style} = useAppStyle();

  return (
    <View style={styles.metadataContainer}>
      <Image style={styles.imageStyle} source={{uri: image.url}} />
      <Text style={[styles.titleText, {color: style.textColor}]}>{title}</Text>
      <Text
        style={[styles.subtitleText, {fontSize: 15, color: style.textColor}]}>
        {subtitle}
      </Text>
      <View>
        <Icon
          name={"play-sharp"}
          type={"ionicon"}
          raised
          onPress={onPlayPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metadataContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  imageStyle: {
    width: 150,
    height: 150,
    borderRadius: 5,
    marginBottom: 5,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: "200",
  },
});
