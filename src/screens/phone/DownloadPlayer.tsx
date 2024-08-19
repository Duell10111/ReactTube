import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {Audio} from "expo-av";
import {useEffect, useState} from "react";
import {StyleSheet, View} from "react-native";

import Button from "../../components/general/Button";
import {useVideo} from "../../downloader/DownloadDatabaseOperations";
import {getAbsoluteVideoURL} from "../../hooks/downloader/useDownloadProcessor";
import {RootStackParamList} from "../../navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "DownloadPlayer">;

export function DownloadPlayer({route}: Props) {
  const video = useVideo(route.params.id);
  const [sound, setSound] = useState<Audio.Sound>();

  async function playSound() {
    console.log("Loading Sound");
    const {sound: avSound} = await Audio.Sound.createAsync({
      uri: getAbsoluteVideoURL(video.fileUrl),
    });
    setSound(avSound);

    console.log("Playing Sound");
    await avSound.playAsync();
  }

  useEffect(() => {
    return sound
      ? () => {
          console.log("Unloading Sound");
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  if (!video) {
    return null;
  }

  return (
    <View>
      <Button title={"Play Sound"} onPress={playSound} />
    </View>
  );

  // return (
  //   <View style={{backgroundColor: "red", flex: 1}}>
  //     <Video
  //       source={{
  //         uri: "https://file-examples.com/wp-content/storage/2017/11/file_example_MP3_700KB.mp3",
  //       }}
  //       style={{width: "100%", height: 400, backgroundColor: "blue"}}
  //       useNativeControls
  //     />
  //   </View>
  // );
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
