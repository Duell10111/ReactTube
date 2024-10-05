import {useNavigation} from "@react-navigation/native";
import React, {useCallback} from "react";
import {
  FlatList,
  ListRenderItem,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import LoadingComponent from "@/components/general/LoadingComponent";
import GridFeedView from "@/components/grid/GridFeedView";
import {PlaylistHeader} from "@/components/playlists/tv/PlaylistHeader";
import {PlaylistListItem} from "@/components/playlists/tv/PlaylistListItem";
import {useAppStyle} from "@/context/AppStyleContext";
import {ElementData} from "@/extraction/Types";
import usePlaylistDetails from "@/hooks/usePlaylistDetails";
import {NativeStackProp} from "@/navigation/types";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYLIST");

interface PlaylistScreenProps {
  playlistId: string;
}

export default function PlaylistScreen({playlistId}: PlaylistScreenProps) {
  const {playlist, data, fetchMore} = usePlaylistDetails(playlistId);
  const navigation = useNavigation<NativeStackProp>();

  const {style} = useAppStyle();

  console.log("Playlist Menu : ", playlist?.originalData?.menu);
  console.log("Playlist Menu : ", playlist?.menu);
  // LOGGER.debug("Playlist: ", JSON.stringify(playlist));

  const renderItem = useCallback<ListRenderItem<ElementData>>(({item}) => {
    return <PlaylistListItem element={item} />;
  }, []);

  if (playlist === undefined) {
    return <LoadingComponent />;
  }

  return (
    <View style={styles.containerStyle}>
      <PlaylistHeader
        playlist={playlist}
        onPlayAllPress={() =>
          navigation.navigate("VideoScreen", {
            navEndpoint: data?.[0]?.navEndpoint,
            videoId: data?.[0]?.id,
          })
        }
      />
      <View style={{flex: 1}}>
        <FlatList
          contentContainerStyle={{paddingVertical: 100}}
          data={data}
          renderItem={renderItem}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.7}
        />
      </View>
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
});
