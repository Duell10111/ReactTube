import {useNavigation} from "@react-navigation/native";
import {useState} from "react";
import {StyleSheet, View} from "react-native";
import {IconButton, Menu} from "react-native-paper";

import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {RootNavProp} from "@/navigation/RootStackNavigator";
import {MediaRow} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

interface MusicSearchListItemProps {
  data: ElementData;
}

export function MusicSearchListItem({data}: MusicSearchListItemProps) {
  const {navigate, push} = useNavigation<RootNavProp>();

  const {setCurrentItem, addAsNextItem} = useMusikPlayerContext();
  const {save} = usePlaylistManagerContext();
  const {download} = useDownloaderContext();

  const [showMenu, setShowMenu] = useState(false);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const onPress = () => {
    if (data.type === "video" || data.type === "mix") {
      setCurrentItem(data);
      navigate("MusicPlayerScreen");
    } else if (data.type === "playlist") {
      navigate("MusicPlaylistScreen", {
        playlistId: data.id,
      });
    } else if (data.type === "artist" || data.type === "channel") {
      push("MusicChannelScreen", {
        artistId: data.id,
      });
    } else if (data.type === "album") {
      push("MusicAlbumScreen", {
        albumId: data.id,
      });
    } else {
      console.warn(`Unknown type of MusicSearchListItem ${data.type}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <MediaRow element={data} onPress={onPress} />
      </View>
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
        {data.type === "video" ? (
          <>
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
            <Menu.Item
              onPress={() => {
                setShowMenu(false);
                addAsNextItem(data);
              }}
              title={t("music.playNext")}
              leadingIcon={"playlist-play"}
            />
          </>
        ) : null}
        {data.author?.id ? (
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              push("MusicChannelScreen", {
                artistId: data.author!.id,
              });
            }}
            title={t("music.openArtist")}
            leadingIcon={"account-music"}
          />
        ) : null}
        {data.type === "video" && data.artists && data.artists.length > 0 ? (
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              push("MusicChannelScreen", {
                artistId: data.artists![0].id,
              });
            }}
            title={t("music.openArtist")}
            leadingIcon={"account-music"}
          />
        ) : null}
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
