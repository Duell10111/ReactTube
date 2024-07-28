import {StyleSheet, Text, View} from "react-native";

import {useMusikPlayerContext} from "../../../context/MusicPlayerContext";

export function MusicPlayerTitle() {
  const {currentItem} = useMusikPlayerContext();

  return (
    <View style={styles.textContainer}>
      <Text style={styles.titleStyle}>{currentItem?.title}</Text>
      <Text style={styles.subtitleStyle}>{currentItem?.author?.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
