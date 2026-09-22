import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useState} from "react";
import {Image, StyleSheet, View} from "react-native";
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
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {AppText, Chip, ErrorState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

type Tab = "Playlist" | "Lyrics" | "Related";

type Props = NativeStackScreenProps<RootStackParamList, "MusicPlayerScreen">;

export function MusicPlayerScreen({navigation}: Props) {
  const {bottom} = useSafeAreaInsets();
  const {currentItem, playbackError} = useMusikPlayerContext();
  const {download} = useDownloaderContext();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const [openTab, setOpenTab] = useState<Tab>();

  const {save} = usePlaylistManagerContext();

  usePhoneOrientationLocker();

  if (openTab) {
    return (
      <View
        style={[
          styles.container,
          {backgroundColor: theme.colors.background, paddingBottom: bottom},
        ]}>
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
    <View
      style={[
        styles.container,
        {backgroundColor: theme.colors.background, paddingBottom: bottom},
      ]}>
      <View style={[styles.modePicker, {gap: theme.spacing.sm}]}>
        <Chip label={t("music.song")} selected />
        <Chip disabled label={t("music.video")} />
      </View>
      <View style={styles.coverContainer}>
        <Image
          style={{width: "100%", height: "100%"}}
          source={{uri: currentItem?.thumbnailImage.url}}
          resizeMode={"contain"}
        />
      </View>
      <View
        style={[
          styles.bottomContainer,
          {gap: theme.spacing.sm, paddingHorizontal: theme.spacing.sm},
        ]}>
        <MusicPlayerTitle />
        {playbackError ? <ErrorState message={playbackError.message} /> : null}
        <MusicPlayerSlider />
        <View style={styles.buttonContainer}>
          <MusicPlayerActionButton
            iconName={"playlist-add"}
            iconType={"material"}
            title={t("common.save")}
            onPress={() => {
              if (currentItem) {
                save([currentItem.id]);
              }
            }}
          />
          <MusicPlayerActionButton
            iconName={"download"}
            iconType={"antdesign"}
            title={t("video.action.download")}
            onPress={() => {
              if (currentItem) {
                showMessage({
                  type: "info",
                  message: t("music.downloadStarted"),
                });
                download(currentItem.id)
                  .then(() =>
                    showMessage({
                      type: "success",
                      message: t("music.downloadComplete"),
                    }),
                  )
                  .catch(error => {
                    showMessage({
                      type: "warning",
                      message: t("music.downloadFailed"),
                      description: String(error?.message ?? error),
                    });
                  });
              }
            }}
          />
          <MusicPlayerActionButton
            iconName={"user"}
            iconType={"antdesign"}
            title={t("music.author")}
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
          <AppText
            accessibilityRole={"button"}
            style={styles.bottomActionTextStyle}
            onPress={() => setOpenTab("Playlist")}>
            {t("music.queue")}
          </AppText>
          <AppText color={"textDisabled"} style={styles.bottomActionTextStyle}>
            {t("music.lyrics")}
          </AppText>
          <AppText
            accessibilityRole={"button"}
            style={styles.bottomActionTextStyle}
            onPress={() => setOpenTab("Related")}>
            {t("music.related")}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modePicker: {
    alignSelf: "center",
    flexDirection: "row",
  },
  coverContainer: {
    width: "100%",
    flex: 0.7,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomContainer: {
    flex: 0.55,
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
    textAlign: "center",
  },
});
