import {Helpers, Misc, YT, YTMusic, YTNodes} from "../utils/Youtube";

export interface Thumbnail {
  url: string;
  height: number;
  width: number;
}

export type ElementData = VideoData | PlaylistData | ChannelData;

export interface VideoData {
  originalNode: Helpers.YTNode;
  type: "video" | "reel" | "mix";
  id: string;
  navEndpoint?: YTNodes.NavigationEndpoint;
  thumbnailImage: Thumbnail;
  title: string;
  duration?: string;
  short_views?: string;
  publishDate?: string;
  author?: Author;
  quality?: string;
  livestream?: boolean;
  music?: boolean;
  // Music Properties
  durationSeconds?: number;
  artists?: Author[];
}

export interface Author {
  id: string;
  name: string;
  thumbnail?: Thumbnail;
  navEndpoint?: YTNodes.NavigationEndpoint;
}

export interface PlaylistData {
  originalNode: Helpers.YTNode;
  type: "playlist";
  id: string;
  title: string;
  thumbnailImage: Thumbnail;
  author?: Author;
  videoCount?: string;
  videos?: string[];
  music?: boolean;
}

export interface ChannelData {
  originalNode: Helpers.YTNode;
  type: "channel";
  id: string;
  title: string;
  thumbnailImage: Thumbnail;
  author?: Author;
  music?: boolean;
}

// YT.* Types

export interface YTVideoInfo {
  originalData: YT.VideoInfo;
  id: string;
  thumbnailImage: Thumbnail;
  title: string;
  description?: string;
  duration?: string;
  short_views: string;
  publishDate?: string;
  quality?: string;
  livestream?: boolean;
  author?: Author;
  chapters?: YTChapter[];
  channel_id?: string;
  channel?: {
    id: string;
    name: string;
    url: string;
  };
  playlist?: {
    id: string;
    title: string;
    content: ElementData[];
    author?: string | Author;
    current_index: number;
    is_infinite: boolean;
  };
  liked?: boolean;
  disliked?: boolean;
  endscreen?: YTEndscreen;
  // Music Properties
  durationSeconds?: number;
}

export interface YTChapter {
  originalData: YTNodes.Chapter;
  title: string;
  thumbnailImage: Thumbnail;
  startDuration: number;
  endDuration: number;
}

export interface YTChannel {
  originalData: YT.Channel;
  id: string;
  title?: string;
  description?: string;
}

export interface YTEndscreen {
  originalData: YTNodes.Endscreen;
  startDuration: number;
  elements: YTEndscreenElement[];
}

export interface YTEndscreenElement {
  originalData: YTNodes.EndscreenElement;
  id: string;
  style: "VIDEO" | "PLAYLIST" | "CHANNEL";
  startDuration: number;
  endDuration: number;
  title?: string;
  left: number;
  top: number;
  width: number;
  aspect_ratio: number;
  navEndpoint: YTNodes.NavigationEndpoint;
  thumbnailImage: Thumbnail;
}

export interface YTPlaylist {
  originalData: YT.Playlist | YTMusic.Playlist;
  title: string;
  thumbnailImage: Thumbnail;
  author?: Author;

  playEndpoint?: YTNodes.NavigationEndpoint;

  items: ElementData[];
  loadMore: () => Promise<void>;
}

export interface YTMusicPlaylist extends YTPlaylist {
  originalData: YTMusic.Playlist;
}

export function getAuthor(author: Misc.Author) {
  return {
    id: author.id,
    name: author.name,
    thumbnail: author.best_thumbnail,
  } as Author;
}
