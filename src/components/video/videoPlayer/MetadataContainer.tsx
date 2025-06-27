import {useNavigation} from "@react-navigation/native";
import {StyleSheet, Text, TVFocusGuideView, View} from "react-native";

import {VideoMetadata} from "./VideoPlayer";

import {MetadataButton} from "@/components/video/videoPlayer/metadata/MetadataButton";
import {RootNavProp} from "@/navigation/RootStackNavigator";

interface MetadataContainerProps {
  metadata: VideoMetadata;
  resolution?: string;
  pause: () => void;
  onJumpToStart: () => void;
}

export default function MetadataContainer({
  metadata,
  resolution,
  pause,
  onJumpToStart,
}: MetadataContainerProps) {
  const navigation = useNavigation<RootNavProp>();

  return (
    <TVFocusGuideView autoFocus>
      <View style={styles.container}>
        <View style={styles.titleMetadata}>
          <Text style={styles.title} numberOfLines={2}>
            {metadata.title}
          </Text>
          <Text
            style={
              styles.subtitle
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
          <MetadataButton
            iconType={"antdesign"}
            iconName={"like2"}
            onPress={metadata.onLike}
            active={metadata.liked}
          />
          <MetadataButton
            iconType={"antdesign"}
            iconName={"dislike2"}
            onPress={metadata.onDislike}
            active={metadata.disliked}
          />
          <MetadataButton
            iconType={"material-community"}
            iconName={"playlist-plus"}
            onPress={metadata.onSaveVideo}
          />
          <MetadataButton
            iconType={"antdesign"}
            iconName={"stepbackward"}
            onPress={onJumpToStart}
          />
          <MetadataButton
            iconType={"font-awesome"}
            iconName={"refresh"}
            onPress={metadata.onRefresh}
          />
          <MetadataButton
            iconType={"feather"}
            iconName={"settings"}
            onPress={() => navigation.navigate("VideoPlayerSettings")}
          />
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
    backgroundColor: "rgba(119,119,119,0.5)",
    maxWidth: "40%",
    padding: 10,
  },
  title: {
    color: "white",
    fontSize: 35,
    fontWeight: "bold",
  },
  subtitle: {
    color: "white",
    fontSize: 20,
  },
  buttonMetadata: {
    alignSelf: "flex-end",
    // backgroundColor: "blue",
    flexDirection: "row",
  },
});
