import {useNavigation} from "@react-navigation/native";
import React, {useState} from "react";
import {IconButton, Menu} from "react-native-paper";

import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import type {VideoData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {useAppTheme} from "@/ui/theme";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

interface MusicTrackMenuProps {
  data: VideoData;
  /** Offers the remove action, for a playlist the user owns. */
  editable?: boolean;
  onRemove?: () => void;
}

/**
 * The overflow menu of a track row. Music puts one beside every entry, and it
 * carries the actions that would otherwise need the player to be open first.
 */
export function MusicTrackMenu({
  data,
  editable,
  onRemove,
}: MusicTrackMenuProps) {
  const {push} = useNavigation<RootNavProp>();
  const {addAsNextItem} = useMusikPlayerContext();
  const {save} = usePlaylistManagerContext();
  const {download} = useDownloaderContext();
  const [visible, setVisible] = useState(false);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const artist = data.artists?.[0] ?? data.author;

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <IconButton
          accessibilityLabel={t("media.moreOptions")}
          icon={"dots-vertical"}
          iconColor={theme.colors.textPrimary}
          size={20}
          onPress={() => setVisible(true)}
        />
      }>
      {editable ? (
        <Menu.Item
          onPress={() => {
            setVisible(false);
            onRemove?.();
          }}
          title={t("common.remove")}
          leadingIcon={"delete"}
        />
      ) : null}
      <Menu.Item
        onPress={() => {
          setVisible(false);
          addAsNextItem(data);
        }}
        title={t("music.playNext")}
        leadingIcon={"playlist-play"}
      />
      <Menu.Item
        onPress={() => {
          setVisible(false);
          save([data.id]);
        }}
        title={t("music.addToPlaylist")}
        leadingIcon={"playlist-plus"}
      />
      <Menu.Item
        onPress={() => {
          setVisible(false);
          showMessage({type: "info", message: t("music.downloadStarted")});
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
      {artist?.id ? (
        <Menu.Item
          onPress={() => {
            setVisible(false);
            push("MusicChannelScreen", {artistId: artist.id});
          }}
          title={t("music.openArtist")}
          leadingIcon={"account-music"}
        />
      ) : null}
    </Menu>
  );
}
