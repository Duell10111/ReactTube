import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import {View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicPlaylistHeader} from "@/components/music/MusicPlaylistHeader";
import {MusicTrackList} from "@/components/music/sections/MusicTrackList";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import useMusicAlbum from "@/hooks/music/useMusicAlbum";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "MusicAlbumScreen">;

export function MusicAlbumScreen({navigation, route}: Props) {
  const {albumId} = route.params;
  const {album, loading, error, reload} = useMusicAlbum(albumId);
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();
  const {bottom, left, right} = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}>
      <MusicTrackList
        error={error}
        items={album?.data ?? []}
        loading={loading}
        onRetry={reload}
        testID={"music-album-list"}
        ListHeaderComponent={
          album ? (
            <MusicPlaylistHeader
              description={album.description}
              image={album.thumbnail}
              secondSubtitle={album.secondSubtitle}
              subtitle={album.subtitle}
              title={album.title}
              onPlayPress={
                album.playEndpoint
                  ? () => {
                      setPlaylistViaEndpoint(album.playEndpoint!);
                      navigation.navigate("MusicPlayerScreen");
                    }
                  : undefined
              }
            />
          ) : null
        }
      />
      <MusicBottomPlayerBar />
    </View>
  );
}
