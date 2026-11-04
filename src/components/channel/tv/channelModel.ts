export type TVChannelTab =
  | "Home"
  | "Videos"
  | "Reels"
  | "Live"
  | "Playlists"
  | "About";

interface ChannelAvailability {
  has_home: boolean;
  has_videos: boolean;
  has_shorts: boolean;
  has_live_streams: boolean;
  has_playlists: boolean;
}

export function getTVChannelTabs(channel: ChannelAvailability): TVChannelTab[] {
  const tabs: TVChannelTab[] = [];
  if (channel.has_home) tabs.push("Home");
  if (channel.has_videos) tabs.push("Videos");
  if (channel.has_shorts) tabs.push("Reels");
  if (channel.has_live_streams) tabs.push("Live");
  if (channel.has_playlists) tabs.push("Playlists");
  return [...tabs, "About"];
}

export function getTVChannelLayout(height: number) {
  // Keep the header proportional on the smaller coordinate space of Android TV.
  const small = height < 800;
  return {
    heroHeight: small ? 224 : 320,
    compactHeight: small ? 64 : 88,
    avatarSize: small ? 72 : 112,
    titleSize: small ? 30 : 48,
    titleLineHeight: small ? 36 : 56,
    compact: small,
  };
}
