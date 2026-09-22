import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useEffect} from "react";
import {View} from "react-native";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicChannelHeader} from "@/components/music/MusicChannelHeader";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import useMusicChannelDetails from "@/hooks/music/useMusicChannelDetails";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {MediaFeed} from "@/ui/patterns";

type Props = NativeStackScreenProps<RootStackParamList, "MusicChannelScreen">;

export function MusicChannelScreen({navigation, route}: Props) {
  const {artistId} = route.params;
  const {artist, loading, error, reload} = useMusicChannelDetails(artistId);
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();

  useEffect(() => {
    navigation.setOptions({headerTitle: artist?.title});
  }, [artist]);

  return (
    <View style={{flex: 1}}>
      <MediaFeed
        error={error}
        items={artist?.data ?? []}
        loading={loading}
        onRetry={reload}
        testID={"music-artist-feed"}
        ListHeaderComponent={
          artist ? (
            <MusicChannelHeader
              image={artist.thumbnail}
              title={artist.title}
              subtitle={artist.description}
              showPlayEndpoint={Boolean(artist.playEndpoint)}
              onPlayPress={() => {
                if (artist.playEndpoint) {
                  setPlaylistViaEndpoint(artist.playEndpoint);
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
