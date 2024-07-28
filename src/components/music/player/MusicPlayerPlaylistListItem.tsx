import _ from "lodash";
import {Image, StyleSheet, Text, TouchableHighlight, View} from "react-native";

import {VideoData} from "../../../extraction/Types";

interface MusicPlayerPlaylistListItemProps {
  data: VideoData;
  currentItem?: boolean;
  onPress?: () => void;
}

export function MusicPlayerPlaylistListItem({
  currentItem,
  data,
  onPress,
}: MusicPlayerPlaylistListItemProps) {
  return (
    <TouchableHighlight onPress={onPress}>
      <View
        style={[
          styles.container,
          currentItem ? styles.selectedContainerStyle : undefined,
        ]}>
        <Image
          style={styles.imageStyle}
          source={{uri: data.thumbnailImage.url}}
        />
        <View style={styles.textContainer}>
          <Text style={styles.titleStyle}>{data.title}</Text>
          <Text style={styles.subtitleStyle}>{`${_.chain([
            data.author?.name ?? "",
            data.duration,
          ])
            .compact()
            .value()
            .join(" - ")}`}</Text>
        </View>
      </View>
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedContainerStyle: {
    backgroundColor: "#77777777",
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
