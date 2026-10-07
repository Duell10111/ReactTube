import {useFocusEffect} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {Image} from "expo-image";
import _ from "lodash";
import React, {useCallback, useEffect, useState} from "react";
import {
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {Checkbox} from "react-native-paper";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {ElementData} from "@/extraction/Types";
import {
  diffPlaylistSelection,
  normalizePlaylistId,
} from "@/hooks/playlist/playlistSelection";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import {useVideoPlaylistMembership} from "@/hooks/playlist/useVideoPlaylistMembership";
import usePlaylistDetails from "@/hooks/tv/usePlaylistDetails";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYLIST_MANAGER_CONTEXT");

export function PlaylistManagerContextMenu({
  route,
}: NativeStackScreenProps<RootStackParamList, "PlaylistManagerContextMenu">) {
  const {videoId} = route.params;
  const {
    playlists,
    fetchPlaylists,
    fetchMorePlaylists,
    saveVideoToPlaylist,
    removeVideoFromPlaylist,
  } = usePlaylistManager();
  const membership = useVideoPlaylistMembership(videoId);
  /** Playlists that contained the video when the dialog opened. */
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [playlistIds, setPlaylistIds] = useState<string[]>([]);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  useEffect(() => {
    fetchPlaylists().catch(LOGGER.warn);
  }, []);

  const markContained = useCallback((ids: string[]) => {
    const normalized = ids.map(normalizePlaylistId);
    setInitialIds(previous => _.uniq([...previous, ...normalized]));
    setPlaylistIds(previous => _.uniq([...previous, ...normalized]));
  }, []);

  useEffect(() => {
    if (membership.containing) {
      markContained([...membership.containing]);
    }
  }, [markContained, membership.containing]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        const {add, remove} = diffPlaylistSelection(initialIds, playlistIds);
        LOGGER.debug(
          `Video ${videoId}: adding to ${add}, removing from ${remove}`,
        );
        Promise.all([
          ...add.map(id => saveVideoToPlaylist([videoId], id)),
          ...remove.map(id => removeVideoFromPlaylist([videoId], id)),
        ]).catch(LOGGER.warn);
      };
    }, [initialIds, playlistIds, videoId]),
  );

  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}) => {
      const id = normalizePlaylistId(item.id);
      return (
        <PlaylistManagerItem
          data={item}
          videoIdToSave={videoId}
          // Only when YouTube's own answer is unavailable: scanning every
          // playlist costs a request per row and only sees its first page.
          fallbackCheck={membership.failed}
          onContained={() => markContained([id])}
          checked={playlistIds.includes(id)}
          onCheck={checked => {
            setPlaylistIds(previous =>
              checked
                ? _.uniq([...previous, id])
                : previous.filter(v => v !== id),
            );
          }}
        />
      );
    },
    [markContained, membership.failed, playlistIds, videoId],
  );

  return (
    <VideoMenuContainer>
      <FlatList
        data={playlists}
        renderItem={renderItem}
        onEndReached={fetchMorePlaylists}
        ListHeaderComponent={
          <AppText
            style={{marginBottom: theme.spacing.md}}
            variant={"titleMedium"}>
            {t("playlist.manager.saveVideo")}
          </AppText>
        }
      />
    </VideoMenuContainer>
  );
}

interface PlaylistManagerItemProps {
  data: ElementData;
  videoIdToSave: string;
  fallbackCheck: boolean;
  onContained: () => void;
  checked?: boolean;
  onCheck?: (check: boolean) => void;
}

function PlaylistManagerItem({
  data,
  videoIdToSave,
  fallbackCheck,
  onContained,
  checked,
  onCheck,
}: PlaylistManagerItemProps) {
  const [focus, setFocus] = useState(false);
  const {theme} = useAppTheme();

  return (
    <View
      style={[
        styles.listItemContainer,
        {
          backgroundColor: focus
            ? theme.colors.surfacePressed
            : theme.colors.surfaceRaised,
          borderColor: focus ? theme.colors.focus : theme.colors.focusResting,
        },
      ]}>
      <Pressable
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onPress={() => onCheck?.(!checked)}>
        <View
          style={{
            flexDirection: "row",
            marginStart: 5,
            alignItems: "center",
          }}>
          <Image
            style={styles.imageStyle}
            source={{uri: data.thumbnailImage.url}}
            contentFit={"cover"}
          />
          <View style={{flex: 1}}>
            <Checkbox.Item
              mode={"android"}
              labelStyle={{color: theme.colors.textPrimary}}
              label={data.title}
              status={checked ? "checked" : "unchecked"}
            />
          </View>
        </View>
      </Pressable>
      {fallbackCheck ? (
        <PlaylistContentCheck
          playlistId={data.id}
          videoId={videoIdToSave}
          onContained={onContained}
        />
      ) : null}
    </View>
  );
}

interface PlaylistContentCheckProps {
  playlistId: string;
  videoId: string;
  onContained: () => void;
}

/** Fallback membership check: looks for the video in the playlist's first page. */
function PlaylistContentCheck({
  playlistId,
  videoId,
  onContained,
}: PlaylistContentCheckProps) {
  const {data: playlistData} = usePlaylistDetails(playlistId);
  const contained = playlistData.some(p => p.id === videoId);

  useEffect(() => {
    if (contained) {
      onContained();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contained]);

  return null;
}

const styles = StyleSheet.create({
  listItemContainer: {
    borderWidth: 3,
    borderRadius: 12,
    marginVertical: 5,
  },
  imageStyle: {
    height: 50,
    aspectRatio: 1,
    borderRadius: 12,
  },
});
