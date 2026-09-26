import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import {Icon} from "@rneui/base";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableHighlight,
  View,
} from "react-native";

import {useMusikPlayerContext} from "../../context/MusicPlayerContext";
import {RootStackParamList} from "../../navigation/RootStackNavigator";

import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {appChromeMetrics} from "@/ui/layout/appShell";
import {useAppTheme} from "@/ui/theme";

type NProp = NativeStackNavigationProp<RootStackParamList>;

interface MusicBottomPlayerBarProps {
  onPressOverride?: () => void;
}

export function MusicBottomPlayerBar({
  onPressOverride,
}: MusicBottomPlayerBarProps) {
  const {currentItem, playing, play, pause, playbackStatus} =
    useMusikPlayerContext();
  const navigation = useNavigation<NProp>();
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const isLoading =
    playbackStatus === "loading" || playbackStatus === "buffering";

  if (!currentItem) {
    return null;
  }

  return (
    <TouchableHighlight
      onPress={() =>
        !onPressOverride
          ? navigation.navigate("MusicPlayerScreen")
          : onPressOverride()
      }
      underlayColor={theme.colors.surfacePressed}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surfaceRaised,
            height: appChromeMetrics.miniPlayerHeight,
            paddingHorizontal: theme.spacing.sm,
            borderTopColor: theme.colors.divider,
          },
        ]}>
        <Image
          style={[styles.imageStyle, {borderRadius: theme.radii.control}]}
          source={{uri: currentItem?.thumbnailImage?.url}}
        />
        <View style={[styles.textContainer, {marginStart: theme.spacing.md}]}>
          <AppText numberOfLines={1} variant={"label"}>
            {currentItem.title}
          </AppText>
          <AppText
            color={"textSecondary"}
            numberOfLines={1}
            variant={"labelSmall"}>
            {currentItem.author?.name}
          </AppText>
        </View>
        <View
          style={[
            styles.buttonsContainer,
            {marginHorizontal: theme.spacing.sm},
          ]}>
          {isLoading ? (
            <ActivityIndicator
              accessibilityLabel={t("music.loading")}
              color={theme.colors.textPrimary}
            />
          ) : (
            <Icon
              accessibilityLabel={t(playing ? "music.pause" : "music.play")}
              name={!playing ? "play" : "pause"}
              type={"feather"}
              color={theme.colors.textPrimary}
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
      </View>
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  imageStyle: {
    width: 45,
    height: 45,
  },
  textContainer: {
    flex: 1,
    justifyContent: "space-evenly",
  },
  buttonsContainer: {
    flexDirection: "row",
    height: "100%",
    alignItems: "center",
    minWidth: appChromeMetrics.minimumTouchTarget,
    justifyContent: "center",
  },
});
