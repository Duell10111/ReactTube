import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import {Icon} from "@rneui/base";
import {Image, StyleSheet, Text, TouchableHighlight, View} from "react-native";

import {useMusikPlayerContext} from "../../context/MusicPlayerContext";
import {RootStackParamList} from "../../navigation/RootStackNavigator";

type NProp = NativeStackNavigationProp<RootStackParamList>;

interface MusicBottomPlayerBarProps {
  onPressOverride?: () => void;
}

export function MusicBottomPlayerBar({
  onPressOverride,
}: MusicBottomPlayerBarProps) {
  const {currentItem, playing, play, pause} = useMusikPlayerContext();
  const navigation = useNavigation<NProp>();

  if (!currentItem) {
    return null;
  }

  return (
    <TouchableHighlight
      onPress={() =>
        !onPressOverride
          ? navigation.navigate("MusicPlayerScreen")
          : onPressOverride()
      }>
      <View style={styles.container}>
        <Image
          style={styles.imageStyle}
          source={{uri: currentItem?.thumbnailImage?.url}}
        />
        <View style={styles.textContainer}>
          <Text style={styles.titleStyle}>{currentItem.title}</Text>
          <Text style={styles.subtitleStyle}>{currentItem.author?.name}</Text>
        </View>
        <View style={styles.buttonsContainer}>
          <Icon
            name={!playing ? "play" : "pause"}
            type={"feather"}
            color={"white"}
            onPress={() => {
              if (playing) {
                pause();
              } else {
                play();
              }
            }}
          />
        </View>
        <View style={styles.bottomLine} />
      </View>
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#33333333",
    paddingVertical: 5,
    alignItems: "center",
  },
  imageStyle: {
    width: 45,
    height: 45,
    borderRadius: 5,
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "space-evenly",
  },
  titleStyle: {
    fontSize: 15,
    color: "white",
  },
  subtitleStyle: {
    // fontSize: 15,
    fontWeight: "200",
    color: "white",
  },
  buttonsContainer: {
    flexDirection: "row",
    height: "100%",
    alignItems: "center",
    marginLeft: 5,
    marginRight: 15,
    // backgroundColor: "white",
  },
  bottomLine: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 1,
    backgroundColor: "#ffffffcc",
  },
});
