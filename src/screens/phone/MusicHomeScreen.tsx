import React from "react";

import useMusicHome from "../../hooks/music/useMusicHome";

import {MusicFilterChips} from "@/components/music/sections/MusicFilterChips";
import {MusicSectionFeed} from "@/components/music/sections/MusicSectionFeed";
import {musicSurfacePadding} from "@/components/music/sections/musicSectionModel";
import usePhoneOrientationLocker from "@/hooks/ui/usePhoneOrientationLocker";

export function MusicHomeScreen() {
  const {
    data,
    fetchContinuation,
    refreshing,
    refresh,
    loading,
    error,
    filters,
    activeFilter,
    applyFilter,
  } = useMusicHome();

  // TODO: Could cause locks if screen is still loaded in background
  usePhoneOrientationLocker();

  return (
    <MusicSectionFeed
      error={error}
      loading={loading}
      onEndReached={fetchContinuation}
      onRefresh={refresh}
      onRetry={refresh}
      refreshing={refreshing}
      sections={data ?? []}
      testID={"music-home-feed"}
      ListHeaderComponent={
        <MusicFilterChips
          filters={filters}
          onSelect={applyFilter}
          padding={musicSurfacePadding}
          selected={activeFilter}
        />
      }
    />
  );
}
