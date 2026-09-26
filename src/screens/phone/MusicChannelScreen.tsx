import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useEffect, useState} from "react";
import {View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicChannelHeader} from "@/components/music/MusicChannelHeader";
import {MusicSectionFeed} from "@/components/music/sections/MusicSectionFeed";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import useChannelManager from "@/hooks/channel/useChannelManager";
import useMusicChannelDetails from "@/hooks/music/useMusicChannelDetails";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "MusicChannelScreen">;

export function MusicChannelScreen({navigation, route}: Props) {
  const {artistId} = route.params;
  const {artist, loading, error, reload} = useMusicChannelDetails(artistId);
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();
  const {bottom, left, right} = useSafeAreaInsets();
  const {subscribe, unsubscribe} = useChannelManager();
  const [subscribed, setSubscribed] = useState<boolean>();

  useEffect(() => {
    navigation.setOptions({headerTitle: artist?.title});
  }, [artist, navigation]);

  useEffect(() => {
    setSubscribed(artist?.subscription?.subscribed);
  }, [artist]);

  const subscription = artist?.subscription;
  const playEndpoint = artist?.playEndpoint;
  const radioEndpoint = artist?.radioEndpoint;

  const onSubscribePress = () => {
    if (!subscription) {
      return;
    }

    const next = !subscribed;

    // The button follows the press; a failed request puts it back, because the
    // alternative is a page that claims a subscription the account does not have.
    setSubscribed(next);
    Promise.resolve(
      next
        ? subscribe(subscription.channelId)
        : unsubscribe(subscription.channelId),
    ).catch(() => setSubscribed(!next));
  };

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}>
      <MusicSectionFeed
        error={error}
        loading={loading}
        onRetry={reload}
        sections={artist?.data ?? []}
        testID={"music-artist-feed"}
        ListHeaderComponent={
          artist ? (
            <MusicChannelHeader
              description={artist.description}
              image={artist.thumbnail}
              subscribeLabel={
                subscribed
                  ? (subscription?.subscribedLabel ??
                    subscription?.subscribeLabel)
                  : subscription?.subscribeLabel
              }
              subscribed={subscribed}
              title={artist.title}
              onPlayPress={
                playEndpoint
                  ? () => {
                      setPlaylistViaEndpoint(playEndpoint);
                      navigation.navigate("MusicPlayerScreen");
                    }
                  : undefined
              }
              onRadioPress={
                radioEndpoint
                  ? () => {
                      setPlaylistViaEndpoint(radioEndpoint);
                      navigation.navigate("MusicPlayerScreen");
                    }
                  : undefined
              }
              onSubscribePress={subscription ? onSubscribePress : undefined}
            />
          ) : null
        }
      />
      <MusicBottomPlayerBar />
    </View>
  );
}
