import {useNavigation} from "@react-navigation/native";
import React from "react";

import usePlaylistDetails from "@/hooks/usePlaylistDetails";
import {useTranslation} from "@/localization";
import {NativeStackProp} from "@/navigation/types";
import {MediaFeed, PlaylistHero} from "@/ui/patterns";

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

  return (
    <MediaFeed
      emptyMessage={t("playlist.empty.message")}
      emptyTitle={t("playlist.empty.title")}
      error={error}
      items={data}
      ListHeaderComponent={
        playlist ? (
          <PlaylistHero
            onPlay={() => {
              const first = data[0];
              if (
                first &&
                (first.type === "video" ||
                  first.type === "reel" ||
                  first.type === "mix")
              ) {
                navigation.navigate("VideoScreen", {
                  navEndpoint: first.navEndpoint,
                  reel: first.type === "reel",
                  videoId: first.id,
                });
              }
            }}
            onSave={() => togglePlaylistLike()}
            playlist={playlist}
            saved={liked}
          />
        ) : null
      }
      loading={loading}
      onEndReached={fetchMore}
      onRetry={reload}
      testID={"playlist-feed"}
    />
  );
}
