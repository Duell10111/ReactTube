import {useNavigation} from "@react-navigation/native";
import React, {useCallback} from "react";
import {
  FlatList,
  ListRenderItem,
  StyleSheet,
  TVFocusGuideView,
  View,
} from "react-native";

import LoadingComponent from "@/components/general/LoadingComponent";
import {PlaylistHeader} from "@/components/playlists/tv/PlaylistHeader";
import {PlaylistListItem} from "@/components/playlists/tv/PlaylistListItem";
import {useAppStyle} from "@/context/AppStyleContext";
import {VideoData} from "@/extraction/Types";
import usePlaylistDetails from "@/hooks/usePlaylistDetails";
import {NativeStackProp} from "@/navigation/types";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYLIST");

interface PlaylistScreenProps {
  playlistId: string;
}

export default function PlaylistScreen({playlistId}: PlaylistScreenProps) {
  const {playlist, data, fetchMore, liked, togglePlaylistLike} =
    usePlaylistDetails(playlistId);
  const navigation = useNavigation<NativeStackProp>();

  const {style} = useAppStyle();
  // LOGGER.debug("Playlist: ", JSON.stringify(playlist));

  const renderItem = useCallback<ListRenderItem<VideoData>>(({item}) => {
    return <PlaylistListItem element={item} />;
  }, []);

  if (playlist === undefined) {
    return <LoadingComponent />;
  }

  return (
    <View style={styles.containerStyle}>
      <TVFocusGuideView autoFocus style={styles.headerPartStyle}>
        <PlaylistHeader
          playlist={playlist}
          saved={liked}
          onPlayAllPress={() => {
            if (data[0]?.type === "video") {
              navigation.navigate("VideoScreen", {
                navEndpoint: data?.[0]?.navEndpoint,
                videoId: data?.[0]?.id,
              });
            }
          }}
          onSavePlaylist={() => togglePlaylistLike().catch(LOGGER.warn)}
        />
      </TVFocusGuideView>
      <TVFocusGuideView autoFocus style={styles.itemsPartStyle}>
        <FlatList
          contentContainerStyle={{paddingVertical: 100}}
          data={data}
          renderItem={renderItem}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.7}
        />
      </TVFocusGuideView>
    </View>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    flex: 1,
    flexDirection: "row",
    // backgroundColor: "red",
    alignItems: "center",
  },
  headerPartStyle: {
    flex: 1,
  },
  itemsPartStyle: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
  },
});
