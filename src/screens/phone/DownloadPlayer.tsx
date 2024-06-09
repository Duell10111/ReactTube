import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {StyleSheet, View} from "react-native";
import Video from "react-native-video";

import VideoComponent from "../../components/VideoComponent";
import {useVideo} from "../../downloader/DownloadDatabaseOperations";
import {RootStackParamList} from "../../navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "DownloadPlayer">;

export function DownloadPlayer({route}: Props) {
  const video = useVideo(route.params.id);

  if (!video) {
    return null;
  }

  return (
    <View style={{backgroundColor: "red", flex: 1}}>
      <VideoComponent url={video.fileUrl} />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: "blue",
  },
  activityIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});
