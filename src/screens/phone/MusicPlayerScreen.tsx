import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {ButtonGroup} from "@rneui/base";
import {Duration} from "luxon";
import React, {useMemo, useState} from "react";
import {Image, StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicPlayerActionButton} from "@/components/music/player/MusicPlayerActionButton";
import {MusicPlayerPlayerButtons} from "@/components/music/player/MusicPlayerPlayerButtons";
import {MusicPlayerPlaylistList} from "@/components/music/player/MusicPlayerPlaylistList";
import {MusicPlayerRelatedTab} from "@/components/music/player/MusicPlayerRelatedTab";
import {MusicPlayerSlider} from "@/components/music/player/MusicPlayerSlider";
import {MusicPlayerTitle} from "@/components/music/player/MusicPlayerTitle";
import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import usePhoneOrientationLocker from "@/hooks/ui/usePhoneOrientationLocker";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

type Tab = "Playlist" | "Lyrics" | "Related";

type Props = NativeStackScreenProps<RootStackParamList, "MusicPlayerScreen">;

export function MusicPlayerScreen({route, navigation}: Props) {
  const {bottom} = useSafeAreaInsets();
  const {currentItem} = useMusikPlayerContext();
  const {download} = useDownloaderContext();

  const [openTab, setOpenTab] = useState<Tab>();

  const {save} = usePlaylistManagerContext();

  const hlsAudio = useMemo(
    () => currentItem?.originalData?.streaming_data?.hls_manifest_url,
    [currentItem],
  );

  // const {videoData, hlsAudio} = useMusicPlayer(
  //   route.params.navEndpoint ?? route.params.videoId,
  // );

  // const [playing, setPlaying] = useState(false);

  // console.log("VideoData: ", currentItem);
  // console.log("VideoDataPlaylist", currentItem?.playlist?.current_index);
  // console.log(
  //   "VideoDataPlaylistData",
  //   currentItem?.playlist?.content?.map(v => v.title),
  // );

  usePhoneOrientationLocker();

  if (openTab) {
    return (
      <View style={[styles.container, {paddingBottom: bottom}]}>
        <MusicBottomPlayerBar onPressOverride={() => setOpenTab(undefined)} />
        {openTab === "Playlist" ? (
          <MusicPlayerPlaylistList />
        ) : (
          <MusicPlayerRelatedTab />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, {paddingBottom: bottom}]}>
      <View style={{width: 150, alignSelf: "center"}}>
        <ButtonGroup
          buttons={["Song", "Video"]}
          // buttonStyle={{width: 50}}
          selectedIndex={0}
          containerStyle={{
            marginBottom: 10,
            borderRadius: 25,
            backgroundColor: "#55555555",
            borderColor: "#55555555",
            height: 30,
          }}
          buttonStyle={{borderRadius: 25}}
          selectedButtonStyle={{backgroundColor: "#11111166"}}
          innerBorderStyle={{color: "transparent"}}
          textStyle={{color: "white"}}
        />
      </View>
      <View style={styles.coverContainer}>
        <Image
          style={{width: "100%", height: "100%"}}
          source={{uri: currentItem?.thumbnailImage.url}}
          resizeMode={"contain"}
        />
        {/*<Video*/}
        {/*  source={{uri: hlsAudio}}*/}
        {/*  style={{width: "80%", aspectRatio: 1, backgroundColor: "orange"}}*/}
        {/*  playInBackground*/}
        {/*  controls*/}
        {/*  paused={!playing}*/}
        {/*  onEnd={callbacks.onEndReached}*/}
        {/*  // muted*/}
        {/*/>*/}
      </View>
      <View style={styles.bottomContainer}>
        <MusicPlayerTitle />
        <MusicPlayerSlider />
        <View style={styles.buttonContainer}>
          <MusicPlayerActionButton
            iconName={"playlist-add"}
            iconType={"material"}
            title={"Save"}
            onPress={() => {
              if (currentItem) {
                save([currentItem.id]);
              }
            }}
          />
          <MusicPlayerActionButton
            iconName={"download"}
            iconType={"antdesign"}
            title={"Download"}
            onPress={() => {
              if (currentItem) {
                download(currentItem.id)
                  .then(() =>
                    showMessage({type: "success", message: "Started download"}),
                  )
                  .catch(error => {
                    showMessage({
                      type: "warning",
                      message: "Error starting download",
                      description: error.message,
                    });
                  });
              }
            }}
          />
          {/* TODO: Adapt UI for author press */}
          <MusicPlayerActionButton
            iconName={"user"}
            iconType={"antdesign"}
            title={"Author"}
            onPress={() => {
              const id = currentItem?.channel_id ?? currentItem?.channel?.id;
              if (id) {
                navigation.navigate("MusicChannelScreen", {artistId: id});
              }
            }}
          />
        </View>
        <MusicPlayerPlayerButtons />
        <View style={styles.bottomActionsContainer}>
          <Text
            style={styles.bottomActionTextStyle}
            onPress={() => setOpenTab("Playlist")}>
            {"Next titles"}
          </Text>
          <Text style={styles.bottomActionTextStyle}>{"Lyrics?"}</Text>
          <Text
            style={styles.bottomActionTextStyle}
            onPress={() => setOpenTab("Related")}>
            {"Related"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "red",
  },
  coverContainer: {
    width: "100%",
    flex: 0.7,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "blue",
  },
  bottomContainer: {
    flex: 0.55,
    // backgroundColor: "blue",
    marginHorizontal: 5,
  },
  buttonContainer: {
    width: "100%",
    minHeight: 50,
    justifyContent: "flex-start",
    flexDirection: "row",
    paddingVertical: 10,
  },
  bottomActionsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  bottomActionTextStyle: {
    color: "white",
  },
});

function secondsToReadableString(seconds: number) {
  const dur = Duration.fromObject({seconds});
  return dur.toFormat("mm:ss");
}
