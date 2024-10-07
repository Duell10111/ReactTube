import {Icon} from "@rneui/base";
import React from "react";
import {Image, StyleSheet, Text, View} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";
import {Thumbnail} from "@/extraction/Types";

interface MusicPlaylistHeaderProps {
  image: Thumbnail;
  title: string;
  subtitle: string;
  saved?: boolean;
  onPlayPress?: () => void;
  onSavePress?: () => void;
}

export function MusicPlaylistHeader({
  image,
  title,
  subtitle,
  saved,
  onPlayPress,
  onSavePress,
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
      <View style={styles.buttonContainer}>
        <Icon
          name={"play-sharp"}
          type={"ionicon"}
          raised
          onPress={onPlayPress}
        />
        {saved !== undefined ? (
          <Icon
            name={saved ? "bookmark" : "bookmark-o"}
            type={"font-awesome"}
            raised
            onPress={onSavePress}
          />
        ) : null}
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
});
