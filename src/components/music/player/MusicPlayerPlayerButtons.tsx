import {Icon} from "@rneui/base";
import {StyleSheet, View} from "react-native";

import {useMusikPlayerContext} from "../../../context/MusicPlayerContext";

export function MusicPlayerPlayerButtons() {
  const {playing, play, pause, next, previous} = useMusikPlayerContext();

  return (
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
