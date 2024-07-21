import {Image, StyleSheet, Text, View} from "react-native";

import {VideoData} from "../../../extraction/Types";

interface MusicPlayerPlaylistListItemProps {
  data: VideoData;
}

export function MusicPlayerPlaylistListItem({
  data,
}: MusicPlayerPlaylistListItemProps) {
  return (
    <View>
      <Image source={{uri: data.thumbnailImage.url}} />
      <View style={styles.textContainer}>
        <Text style={styles.titleStyle}>{data.title}</Text>
        <Text style={styles.subtitleStyle}>{data.author?.name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
  },
  imageStyle: {
    width: 45,
    height: 45,
    borderRadius: 5,
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "space-evenly",
  },
  titleStyle: {
    fontSize: 15,
    color: "white",
  },
  subtitleStyle: {
    // fontSize: 15,
    fontWeight: "200",
    color: "white",
  },
});
