import React, {useState} from "react";
import {Alert} from "react-native";
import {IconButton, Menu} from "react-native-paper";

import {useWatchLibrary} from "@/context/WatchLibraryContext";
import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

interface Props {
  /** A YouTube or local playlist id; for albums their `OLAK5uy_…` playlist. */
  playlistId: string;
}

/** Header menu that links a playlist to the Apple Watch library. */
export function WatchPlaylistMenu({playlistId: id}: Props) {
  const {
    available,
    linkedPlaylists,
    linkPlaylist,
    unlinkPlaylist,
    setLinkedPlaylistAutoDownload,
  } = useWatchLibrary();
  const [showMenu, setShowMenu] = useState(false);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  // The menu only holds Apple Watch actions so far.
  if (!available) {
    return null;
  }

  const link = linkedPlaylists[id];

  const confirmUnlink = () => {
    Alert.alert(
      t("watchLibrary.unlink.title"),
      t("watchLibrary.unlink.message"),
      [
        {
          text: t("watchLibrary.unlink.keepDownloads"),
          onPress: () => unlinkPlaylist(id, false),
        },
        {
          text: t("watchLibrary.unlink.deleteDownloads"),
          style: "destructive",
          onPress: () => unlinkPlaylist(id, true),
        },
        {text: t("common.cancel"), style: "cancel"},
      ],
    );
  };

  return (
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
      {link ? (
        <>
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              setLinkedPlaylistAutoDownload(id, !link.autoDownload);
            }}
            title={t("watchLibrary.link.autoDownload")}
            leadingIcon={
              link.autoDownload
                ? "checkbox-marked-outline"
                : "checkbox-blank-outline"
            }
          />
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              confirmUnlink();
            }}
            title={t("watchLibrary.link.remove")}
            leadingIcon={"close-circle-outline"}
          />
        </>
      ) : (
        <Menu.Item
          onPress={() => {
            setShowMenu(false);
            linkPlaylist(id, false);
          }}
          title={t("watchLibrary.link.add")}
          leadingIcon={"watch"}
        />
      )}
    </Menu>
  );
}
