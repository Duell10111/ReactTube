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
  Text,
  View,
} from "react-native";
import {Checkbox} from "react-native-paper";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {ElementData} from "@/extraction/Types";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import usePlaylistDetails from "@/hooks/tv/usePlaylistDetails";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYLIST_MANAGER_CONTEXT");

export function PlaylistManagerContextMenu({
  route,
}: NativeStackScreenProps<RootStackParamList, "PlaylistManagerContextMenu">) {
  const {playlists, fetchPlaylists, fetchMorePlaylists, saveVideoToPlaylist} =
    usePlaylistManager();
  const [playlistIds, setPlaylistIds] = useState<string[]>();

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

  console.log("PlaylistIds: ", playlistIds);

  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}) => {
      return (
        <PlaylistManagerItem
          data={item}
          videoIdToSave={route.params.videoId}
          checked={playlistIds?.includes(item.id)}
          onCheck={checked => {
            console.log("Check");
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

  // console.log("Playlists: ", playlists);

  return (
    <VideoMenuContainer>
      <FlatList
        data={playlists}
        renderItem={renderItem}
        onEndReached={fetchMorePlaylists}
        ListHeaderComponent={
          <Text
            style={{
              color: "white",
              fontSize: 25,
              fontWeight: "bold",
              marginBottom: 10,
            }}>
            {"Save video"}
          </Text>
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
            ? "white"
            : styles.listItemContainer["backgroundColor"],
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
              labelStyle={{color: focus ? "black" : "white", fontSize: 20}}
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
    backgroundColor: "#999",
    borderRadius: 15,
    marginVertical: 5,
  },
  imageStyle: {
    height: 50,
    aspectRatio: 1,
    borderRadius: 15,
    backgroundColor: "#555",
  },
});
