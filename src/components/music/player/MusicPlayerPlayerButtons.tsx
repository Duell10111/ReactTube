import {Icon} from "@rneui/base";
import {StyleSheet, TouchableOpacity, View} from "react-native";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";

export function MusicPlayerPlayerButtons() {
  const {
    playing,
    play,
    pause,
    next,
    previous,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
  } = useMusikPlayerContext();

  const onPressRepeat = () => {
    switch (repeat) {
      case "RepeatAll":
        setRepeat("RepeatOne");
        break;
      case "RepeatOne":
        setRepeat(undefined);
        break;
      default:
        setRepeat("RepeatAll");
    }
  };

  return (
    <View style={styles.playerItemsContainer}>
      <Icon
        // @ts-ignore
        Component={TouchableOpacity}
        name={!repeat || repeat === "RepeatAll" ? "repeat" : "repeat-once"}
        type={"material-community"}
        size={25}
        color={repeat ? "blue" : "white"}
        containerStyle={{marginRight: 30}}
        onPress={onPressRepeat}
      />
      <Icon
        // @ts-ignore
        Component={TouchableOpacity}
        name={"step-backward"}
        type={"antdesign"}
        size={25}
        color={"white"}
        containerStyle={{marginRight: 20}}
        onPress={previous}
      />
      <Icon
        // @ts-ignore
        Component={TouchableOpacity}
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
        // @ts-ignore
        Component={TouchableOpacity}
        name={"step-forward"}
        type={"antdesign"}
        size={25}
        color={"white"}
        containerStyle={{marginLeft: 20}}
        onPress={next}
      />
      <Icon
        // @ts-ignore
        Component={TouchableOpacity}
        name={"shuffle"}
        type={"material-community"}
        size={25}
        color={shuffle ? "rgb(66,115,241)" : "white"}
        containerStyle={{marginLeft: 30}}
        onPress={() => setShuffle(!shuffle)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  playerItemsContainer: {
    flexDirection: "row",
    width: "100%",
    // backgroundColor: "green",
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 200,
  },
});
