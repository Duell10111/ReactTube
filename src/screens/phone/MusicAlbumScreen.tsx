import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import {View} from "react-native";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicPlaylistHeader} from "@/components/music/MusicPlaylistHeader";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import useMusicAlbum from "@/hooks/music/useMusicAlbum";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {MediaFeed} from "@/ui/patterns";

type Props = NativeStackScreenProps<RootStackParamList, "MusicAlbumScreen">;

export function MusicAlbumScreen({navigation, route}: Props) {
  const {albumId} = route.params;
  const {album, loading, error, reload} = useMusicAlbum(albumId);
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();

  return (
    <View style={{flex: 1}}>
      <MediaFeed
        error={error}
        items={album?.data ?? []}
        loading={loading}
        onRetry={reload}
        testID={"music-album-feed"}
        ListHeaderComponent={
          album ? (
            <MusicPlaylistHeader
              image={album.thumbnail}
              title={album.title}
              subtitle={album.subtitle ?? ""}
              onPlayPress={() => {
                if (album.playEndpoint) {
                  setPlaylistViaEndpoint(album.playEndpoint);
                  navigation.navigate("MusicPlayerScreen");
                }
              }}
            />
          ) : null
        }
      />
      <MusicBottomPlayerBar />
    </View>
  );
}
