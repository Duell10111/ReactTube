import {StyleSheet, Text, TVFocusGuideView, View} from "react-native";

import {VideoMetadata} from "./VideoPlayer";

import {MetadataButton} from "@/components/video/videoPlayer/metadata/MetadataButton";

interface MetadataContainerProps {
  metadata: VideoMetadata;
  resolution?: string;
  pause: () => void;
}

export default function MetadataContainer({
  metadata,
  resolution,
  pause,
}: MetadataContainerProps) {
  return (
    <TVFocusGuideView autoFocus>
      <View style={styles.container}>
        <View style={styles.titleMetadata}>
          <Text style={styles.title} numberOfLines={2}>
            {metadata.title}
          </Text>
          <Text
            style={
              styles.author
            }>{`${metadata.author} ○ ${metadata.views} ○ ${metadata.videoDate}${resolution ? ` ○ ${resolution}` : ""}`}</Text>
        </View>

        {/*Spacer Container*/}
        <View style={{flex: 1}} />
        {/*TODO: Add Author,Pro and Contra Section*/}
        <View style={styles.buttonMetadata}>
          <MetadataButton
            imageUrl={metadata.authorThumbnailUrl}
            // TODO: Outsource pause event in VideoScreen?
            onPress={() => {
              pause();
              metadata.onAuthorPress();
            }}
          />
          <MetadataButton iconType={"antdesign"} iconName={"like2"} />
          <MetadataButton iconType={"antdesign"} iconName={"dislike2"} />
        </View>
      </View>
    </TVFocusGuideView>
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
  buttonMetadata: {
    alignSelf: "flex-end",
    // backgroundColor: "blue",
    flexDirection: "row",
  },
});
