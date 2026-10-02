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
      {/* Fixed slot so swapping play/pause and the spinner never shifts the row. */}
      <View style={styles.primaryButtonSlot}>
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
            size={PRIMARY_ICON_SIZE}
            onPress={() => {
              if (playing) {
                pause();
              } else {
                play();
              }
            }}
          />
        )}
      </View>
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

// @rneui raised icons render as (2 * size + 4) square with a 7px margin.
const PRIMARY_ICON_SIZE = 30;
const PRIMARY_BUTTON_DIAMETER = PRIMARY_ICON_SIZE * 2 + 4;
const PRIMARY_BUTTON_SLOT = PRIMARY_BUTTON_DIAMETER + 2 * 7;

const styles = StyleSheet.create({
  playerItemsContainer: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 200,
  },
  primaryButtonSlot: {
    alignItems: "center",
    justifyContent: "center",
    width: PRIMARY_BUTTON_SLOT,
    height: PRIMARY_BUTTON_SLOT,
  },
  loadingButton: {
    alignItems: "center",
    justifyContent: "center",
    width: PRIMARY_BUTTON_DIAMETER,
    height: PRIMARY_BUTTON_DIAMETER,
    borderRadius: PRIMARY_BUTTON_DIAMETER / 2,
  },
});
