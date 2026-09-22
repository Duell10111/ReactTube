import {useNavigation} from "@react-navigation/native";
import {useState} from "react";
import {StyleSheet, View} from "react-native";
import {Icon, IconButton, Menu} from "react-native-paper";

import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import {VideoData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {RootNavProp} from "@/navigation/RootStackNavigator";
import {MediaRow} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

interface MusicPlaylistItemProps {
  data: VideoData;
  index: number;
  editable?: boolean;
  onDeleteItem?: () => void;
}

export function MusicPlaylistItem({
  data,
  index,
  editable,
  onDeleteItem,
}: MusicPlaylistItemProps) {
  const {navigate} = useNavigation<RootNavProp>();

  const {setCurrentItem, addAsNextItem} = useMusikPlayerContext();
  const {save} = usePlaylistManagerContext();
  const {download} = useDownloaderContext();

  const [showMenu, setShowMenu] = useState(false);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <MediaRow
          element={data}
          onPress={() => {
            setCurrentItem(data);
            navigate("MusicPlayerScreen");
          }}
        />
      </View>
      {data.downloaded ? (
        <Icon source={"download"} color={theme.colors.success} size={22} />
      ) : null}
      <Menu
        visible={showMenu}
        onDismiss={() => setShowMenu(false)}
        anchor={
          <IconButton
            accessibilityLabel={t("media.moreOptions")}
            icon={"dots-vertical"}
            iconColor={theme.colors.textPrimary}
            size={24}
            onPress={() => setShowMenu(true)}
          />
        }>
        {editable ? (
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              onDeleteItem?.();
            }}
            title={t("common.remove")}
            leadingIcon={"delete"}
          />
        ) : null}
        <Menu.Item
          onPress={() => {
            setShowMenu(false);
            save([data.id]);
          }}
          title={t("music.addToPlaylist")}
          leadingIcon={"playlist-plus"}
        />
        <Menu.Item
          onPress={() => {
            setShowMenu(false);
            addAsNextItem(data);
          }}
          title={t("music.playNext")}
          leadingIcon={"playlist-play"}
        />
        <Menu.Item
          onPress={() => {
            setShowMenu(false);
            showMessage({
              type: "info",
              message: t("music.downloadStarted"),
            });
            download(data.id)
              .then(() =>
                showMessage({
                  type: "success",
                  message: t("music.downloadComplete"),
                }),
              )
              .catch(error =>
                showMessage({
                  type: "warning",
                  message: t("music.downloadFailed"),
                  description: String(error?.message ?? error),
                }),
              );
          }}
          title={t("video.action.download")}
          leadingIcon={"download"}
        />
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  row: {
    flex: 1,
  },
});
