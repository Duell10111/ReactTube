import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {View} from "react-native";
import {IconButton, Menu} from "react-native-paper";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import usePlaylistDetails from "../../hooks/music/useMusicPlaylistDetails";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicPlaylistHeader} from "@/components/music/MusicPlaylistHeader";
import {MusicTrackList} from "@/components/music/sections/MusicTrackList";
import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {VideoData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {useAppTheme} from "@/ui/theme";

type Props = NativeStackScreenProps<RootStackParamList, "MusicPlaylistScreen">;

export function MusicPlaylistScreen({navigation, route}: Props) {
  const {playlistId} = route.params;
  const {
    playlist,
    fetchMore,
    liked,
    togglePlaylistLike,
    deleteItemFromPlaylist,
    loading,
    error,
    reload,
  } = usePlaylistDetails(playlistId);
  const {bottom, left, right} = useSafeAreaInsets();
  const {setPlaylistViaEndpoint, setCurrentItem} = useMusikPlayerContext();

  // A locally stored playlist carries no play endpoint. Starting its first
  // track is equivalent: the player fills the queue from `localPlaylistId`.
  const firstTrack = useMemo(
    () =>
      playlist?.items.find((item): item is VideoData => item.type === "video"),
    [playlist],
  );

  const playAll = useCallback(() => {
    if (playlist?.playEndpoint) {
      setPlaylistViaEndpoint(playlist.playEndpoint);
    } else if (firstTrack) {
      setCurrentItem(firstTrack);
    } else {
      return;
    }
    navigation.navigate("MusicPlayerScreen");
  }, [
    firstTrack,
    navigation,
    playlist,
    setCurrentItem,
    setPlaylistViaEndpoint,
  ]);

  // Top Menu
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <PlaylistMenu id={playlistId} />,
    });
  }, [navigation, playlistId]);

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}>
      <MusicTrackList
        editable={playlist?.editable}
        error={error}
        items={playlist?.items ?? []}
        loading={loading}
        onEndReached={fetchMore}
        onRemoveItem={item => deleteItemFromPlaylist(item)}
        onRetry={reload}
        testID={"music-playlist-list"}
        ListHeaderComponent={
          playlist ? (
            <MusicPlaylistHeader
              description={playlist.description}
              image={playlist.thumbnailImage}
              saved={liked}
              subtitle={playlist.subtitle}
              title={playlist.title}
              onSavePress={togglePlaylistLike}
              onPlayPress={
                playlist.playEndpoint || firstTrack ? playAll : undefined
              }
            />
          ) : null
        }
      />
      <MusicBottomPlayerBar />
    </View>
  );
}

interface PlaylistMenuProps {
  id: string;
}

function PlaylistMenu({id}: PlaylistMenuProps) {
  const {sendPlaylistToWatch} = useDownloaderContext();
  const [showMenu, setShowMenu] = useState(false);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

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
      <Menu.Item
        onPress={() => {
          setShowMenu(false);
          sendPlaylistToWatch(id);
        }}
        title={t("music.sendToWatch")}
        leadingIcon={"upload"}
      />
    </Menu>
  );
}
