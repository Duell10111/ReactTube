import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {ButtonGroup, Icon} from "@rneui/base";
import {Duration} from "luxon";
import {useMemo} from "react";
import {Image, StyleSheet, Text, View} from "react-native";
import {Slider} from "react-native-awesome-slider";
import Animated, {
  runOnJS,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {useMusikPlayerContext} from "../../context/MusicPlayerContext";
import {RootStackParamList} from "../../navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "MusicPlayerScreen">;

export function MusicPlayerScreen({route, navigation}: Props) {
  const {bottom} = useSafeAreaInsets();

  const {
    currentItem,
    play,
    pause,
    previous,
    next,
    seek,
    playing,
    currentTime,
    duration,
  } = useMusikPlayerContext();

  const hlsAudio = useMemo(
    () => currentItem?.originalData?.streaming_data?.hls_manifest_url,
    [currentItem],
  );

  // const {videoData, hlsAudio} = useMusicPlayer(
  //   route.params.navEndpoint ?? route.params.videoId,
  // );

  // const [playing, setPlaying] = useState(false);

  // console.log("VideoData: ", currentItem);
  console.log("VideoDataPlaylist", currentItem?.playlist?.current_index);
  console.log(
    "VideoDataPlaylistData",
    currentItem?.playlist?.content?.map(v => v.title),
  );
  const sharedValue = useSharedValue(1);
  const min = useSharedValue(0);
  const max = useSharedValue(1);
  const currentProgressString = useSharedValue("");
  const durationString = useSharedValue("");

  const parseProgress = (seconds: number) => {
    currentProgressString.value = secondsToReadableString(seconds);
  };

  useDerivedValue(() => {
    return runOnJS(parseProgress)(currentTime.value);
  }, [currentTime]);

  const parseDuration = (seconds: number) => {
    durationString.value = secondsToReadableString(seconds);
  };

  useDerivedValue(() => {
    return runOnJS(parseDuration)(duration.value);
  }, [duration]);

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
        <View style={styles.textContainer}>
          <Text style={styles.titleStyle}>{currentItem?.title}</Text>
          <Text style={styles.subtitleStyle}>{currentItem?.author?.name}</Text>
        </View>
        <View>
          <Slider
            style={{flex: 0, height: 50}}
            progress={currentTime}
            minimumValue={min}
            maximumValue={duration}
            bubble={seconds => {
              const dur = Duration.fromObject({seconds});
              return dur.toFormat("mm:ss");
            }}
            onSlidingComplete={seconds => {
              console.log(`Slide to ${seconds}`);
              seek(seconds);
            }}
          />
          <Animated.Text
            style={{position: "absolute", left: 0, bottom: 0, color: "white"}}>
            {currentProgressString.value}
          </Animated.Text>
          <Animated.Text
            style={{position: "absolute", right: 0, bottom: 0, color: "white"}}>
            {durationString.value}
          </Animated.Text>
        </View>
        <View style={styles.buttonContainer} />
        <View style={styles.playerItemsContainer}>
          <Icon
            name={"stepbackward"}
            type={"antdesign"}
            size={25}
            color={"white"}
            containerStyle={{marginRight: 20}}
            onPress={previous}
          />
          <Icon
            name={!playing ? "play" : "pause"}
            type={"feather"}
            raised
            size={30}
            onPress={() => {
              if (playing) {
                pause();
              } else {
                play();
              }
            }}
          />
          <Icon
            name={"stepforward"}
            type={"antdesign"}
            size={25}
            color={"white"}
            containerStyle={{marginLeft: 20}}
            onPress={next}
          />
        </View>
        <View style={styles.bottomActionsContainer}>
          <Text>{"Bottom actions"}</Text>
          <Text>{"Next titles"}</Text>
          <Text>{"Lyrics?"}</Text>
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
  textContainer: {
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "red",
    flex: 1, // Expand titles in case of space
  },
  titleStyle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  subtitleStyle: {
    color: "white",
  },
  playerItemsContainer: {
    flexDirection: "row",
    width: "100%",
    // backgroundColor: "green",
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 200,
  },
  buttonContainer: {
    width: "100%",
    minHeight: 50,
  },
  bottomActionsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
  },
});

function secondsToReadableString(seconds: number) {
  const dur = Duration.fromObject({seconds});
  return dur.toFormat("mm:ss");
}
