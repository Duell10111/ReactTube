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
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
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
  const {playlists, fetchPlaylists, fetchMorePlaylists, saveVideoToPlaylist} =
    usePlaylistManager();
  const [playlistIds, setPlaylistIds] = useState<string[]>();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  useEffect(() => {
    fetchPlaylists().catch(LOGGER.warn);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        // Save item on leave
        LOGGER.debug(
          `Saving video ${route.params.videoId} to playlists ${playlistIds}`,
        );
        playlistIds &&
          Promise.all(
            playlistIds.map((id: string) => {
              return saveVideoToPlaylist([route.params.videoId], id);
            }),
          ).catch(LOGGER.warn);
      };
    }, [playlistIds]),
  );

  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}) => {
      return (
        <PlaylistManagerItem
          data={item}
          videoIdToSave={route.params.videoId}
          checked={playlistIds?.includes(item.id)}
          onCheck={checked => {
            if (checked) {
              setPlaylistIds(previous => {
                return _.uniq([...(previous ?? []), item.id]);
              });
            } else {
              setPlaylistIds(previous => {
                return [...(previous ?? []).filter(v => v !== item.id)];
              });
            }
          }}
        />
      );
    },
    [playlistIds],
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
  checked?: boolean;
  onCheck?: (check: boolean) => void;
}

function PlaylistManagerItem({
  data,
  videoIdToSave,
  checked,
  onCheck,
}: PlaylistManagerItemProps) {
  const {data: playlistData} = usePlaylistDetails(data.id);
  const [focus, setFocus] = useState(false);
  const {theme} = useAppTheme();

  useEffect(() => {
    if (playlistData.find(p => p.id === videoIdToSave)) {
      onCheck?.(true);
    }
  }, [playlistData, onCheck]);

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
    </View>
  );
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
