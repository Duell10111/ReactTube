import {useNavigation} from "@react-navigation/native";
import React, {useCallback, useLayoutEffect, useState} from "react";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

import usePlaylistDetails from "@/hooks/usePlaylistDetails";
import {useTranslation} from "@/localization";
import {NativeStackProp} from "@/navigation/types";
import {MediaFeed, PlaylistHeroTouch, useFeedGeometry} from "@/ui/patterns";

interface PlaylistScreenProps {
  playlistId: string;
}

export default function PlaylistScreen({playlistId}: PlaylistScreenProps) {
  const {
    playlist,
    data,
    fetchMore,
    liked,
    togglePlaylistLike,
    loading,
    error,
    reload,
  } = usePlaylistDetails(playlistId);
  const navigation = useNavigation<NativeStackProp>();
  const {t} = useTranslation();
  const {contentPadding, rowPadding} = useFeedGeometry();
  const [heroHeight, setHeroHeight] = useState<number>();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  // The hero already names the playlist; the bar takes the title over once
  // the hero has scrolled away, as on the channel screen.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: scrolledPastHero && playlist ? playlist.title : "",
    });
  }, [navigation, playlist, scrolledPastHero]);

  const onHeroLayout = useCallback((event: LayoutChangeEvent) => {
    setHeroHeight(event.nativeEvent.layout.height);
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (heroHeight === undefined) {
        return;
      }
      const next =
        event.nativeEvent.contentOffset.y >=
        heroHeight + contentPadding.paddingTop;
      setScrolledPastHero(previous => (previous === next ? previous : next));
    },
    [contentPadding.paddingTop, heroHeight],
  );

  const playFirst = useCallback(() => {
    const first = data[0];
    if (
      first &&
      (first.type === "video" || first.type === "reel" || first.type === "mix")
    ) {
      navigation.navigate("VideoScreen", {
        navEndpoint: first.navEndpoint,
        reel: first.type === "reel",
        videoId: first.id,
      });
    }
  }, [data, navigation]);

  return (
    <MediaFeed
      emptyMessage={t("playlist.empty.message")}
      emptyTitle={t("playlist.empty.title")}
      error={error}
      items={data}
      ListHeaderComponent={
        playlist ? (
          <PlaylistHeroTouch
            bleed={rowPadding.paddingStart}
            fallbackThumbnailUrl={data[0]?.thumbnailImage?.url}
            onLayout={onHeroLayout}
            onPlay={playFirst}
            onSave={() => togglePlaylistLike()}
            playlist={playlist}
            saved={liked}
          />
        ) : null
      }
      listRows
      loading={loading}
      onEndReached={fetchMore}
      onRetry={reload}
      onScroll={handleScroll}
      testID={"playlist-feed"}
    />
  );
}
