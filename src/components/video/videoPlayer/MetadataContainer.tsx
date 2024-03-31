import {StyleSheet, Text, View} from "react-native";

import {VideoMetadata} from "./VideoPlayer";

interface MetadataContainerProps {
  metadata: VideoMetadata;
}

export default function MetadataContainer({metadata}: MetadataContainerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleMetadata}>
        <Text style={styles.title} numberOfLines={2}>
          {metadata.title}
        </Text>
        <Text
          style={
            styles.author
          }>{`${metadata.author} ○ ${metadata.views} ○ ${metadata.videoDate}`}</Text>
      </View>

      {/*TODO: Add Author,Pro and Contra Section*/}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "95%",
    alignSelf: "center",
    // backgroundColor: "red",
    flexDirection: "row",
  },
  titleMetadata: {
    borderRadius: 15,
    backgroundColor: "rgba(119,119,119,0.33)",
    maxWidth: "25%",
    padding: 10,
  },
  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
  },
  author: {
    color: "lightgrey",
    fontSize: 15,
  },
});
