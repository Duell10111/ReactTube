import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useEffect, useState} from "react";
import {View} from "react-native";
import {IconButton, Menu} from "react-native-paper";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import usePlaylistDetails from "../../hooks/music/useMusicPlaylistDetails";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicPlaylistHeader} from "@/components/music/MusicPlaylistHeader";
import {MusicPlaylistList} from "@/components/music/MusicPlaylistList";
import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {ErrorState, Skeleton} from "@/ui/components";
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
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  // Top Menu
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <PlaylistMenu id={playlistId} />,
    });
  }, [navigation, playlistId]);

  if (loading) {
    return (
      <Skeleton
        accessibilityLabel={t("playlist.loading")}
        height={180}
        style={{margin: theme.spacing.xl}}
      />
    );
  }

  if (error || !playlist) {
    return <ErrorState onRetry={reload} />;
  }

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}>
      {/* ADD PLAYLIST LIST */}
      <MusicPlaylistList
        data={playlist.items}
        onFetchMore={() => fetchMore()}
        editable={playlist.editable}
        onDeleteItem={item => deleteItemFromPlaylist(item)}
        ListHeaderComponent={
          <MusicPlaylistHeader
            image={playlist.thumbnailImage}
            title={playlist.title}
            subtitle={playlist.description ?? ""}
            saved={liked}
            onSavePress={togglePlaylistLike}
            onPlayPress={() => {
              if (playlist.playEndpoint) {
                setPlaylistViaEndpoint(playlist.playEndpoint);
                navigation.navigate("MusicPlayerScreen");
              }
            }}
          />
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
