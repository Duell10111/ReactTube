import {Icon} from "@rneui/base";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

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
    playbackStatus,
  } = useMusikPlayerContext();
  const isLoading =
    playbackStatus === "loading" || playbackStatus === "buffering";
  const {t} = useTranslation();
  const {theme} = useAppTheme();

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
        accessibilityLabel={t("music.repeat")}
        // @ts-ignore
        Component={TouchableOpacity}
        name={!repeat || repeat === "RepeatAll" ? "repeat" : "repeat-once"}
        type={"material-community"}
        size={25}
        color={repeat ? theme.colors.brand : theme.colors.textPrimary}
        containerStyle={{marginRight: 30}}
        onPress={onPressRepeat}
      />
      <Icon
        accessibilityLabel={t("music.previous")}
        // @ts-ignore
        Component={TouchableOpacity}
        name={"step-backward"}
        type={"antdesign"}
        size={25}
        color={theme.colors.textPrimary}
        containerStyle={{marginRight: 20}}
        onPress={previous}
      />
      {isLoading ? (
        <View
          style={[
            styles.loadingButton,
            {backgroundColor: theme.colors.textPrimary},
          ]}
          accessibilityLabel={t("music.loading")}>
          <ActivityIndicator color={theme.colors.background} size={"small"} />
        </View>
      ) : (
        <Icon
          accessibilityLabel={t(playing ? "music.pause" : "music.play")}
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
      )}
      <Icon
        accessibilityLabel={t("music.next")}
        // @ts-ignore
        Component={TouchableOpacity}
        name={"step-forward"}
        type={"antdesign"}
        size={25}
        color={theme.colors.textPrimary}
        containerStyle={{marginLeft: 20}}
        onPress={next}
      />
      <Icon
        accessibilityLabel={t("music.shuffle")}
        // @ts-ignore
        Component={TouchableOpacity}
        name={"shuffle"}
        type={"material-community"}
        size={25}
        color={shuffle ? theme.colors.brand : theme.colors.textPrimary}
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
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 200,
  },
  loadingButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 62,
    height: 62,
    borderRadius: 31,
  },
});
