import {PlaylistPanelContinuation} from "youtubei.js";

import {
  Helpers,
  Misc,
  YT,
  YTMusic,
  YTNodes,
  Mixins,
  IBrowseResponse,
} from "../utils/Youtube";

import {HorizontalData} from "@/extraction/ShelfExtraction";

export interface Thumbnail {
  url: string;
  height: number;
  width: number;
}

export interface ThumbnailOverlays {
  videoProgress?: number; // Value from 0 to 1
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
  // Progress of video
  progress?: number;
  thumbnailOverlays?: ThumbnailOverlays;
  music?: boolean;
  // Music Properties
  durationSeconds?: number;
  artists?: Author[];
  album?: Album;
  // Local Properties
  localPlaylistId?: string;
  downloaded?: boolean;
}

export interface Author {
  id: string;
  name: string;
  thumbnail?: Thumbnail;
  navEndpoint?: YTNodes.NavigationEndpoint;
}

export interface Album {
  id: string;
  name: string;
  navEndpoint?: YTNodes.NavigationEndpoint;
}

export interface PlaylistData {
  originalNode: Helpers.YTNode;
  type: "playlist" | "album";
  id: string;
  title: string;
  subtitle?: string;
  thumbnailImage: Thumbnail;
  author?: Author;
  artists?: Author[];
  videoCount?: string;
  videos?: string[];
  music?: boolean;
}

export interface ChannelData {
  originalNode: Helpers.YTNode;
  type: "channel" | "artist" | "profile";
  id: string;
  title: string;
  thumbnailImage: Thumbnail;
  author?: Author;
  music?: boolean;
  subscribers?: string;
  subtitle?: string;
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
  subscribed?: boolean;
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
  commentsEntryPointHeader?: YTVideoInfoCommentEntryPointHeader;
  // Music Properties
  durationSeconds?: number;
}

export interface YTVideoInfoCommentEntryPointHeader {
  originalData: YTNodes.CommentsEntryPointHeader;
  header_text: string;
  comments_count: string;
  preview_comment?: {
    avatar_thumbnail?: Thumbnail;
    text: string;
  };
}

// Make YTTrackInfo extend from VideoInfo or BasicVideoInfoType?
export interface YTTrackInfo {
  originalData: YTMusic.TrackInfo;
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
  localPlaylistId?: string;
}

export interface YTPlaylistPanel {
  originalData: YTNodes.PlaylistPanel;
  title?: string;
  items: YTPlaylistPanelItem[];
  localPlaylist?: boolean;
}

export interface YTPlaylistPanelContinuation {
  originalData: PlaylistPanelContinuation;
  items: YTPlaylistPanelItem[];
}

export interface YTPlaylistPanelItem extends VideoData {
  selected: boolean;
}

export interface YTMenu {
  originalData: YTNodes.Menu;
  top_level_buttons: YTToggleButton[];
}

export interface YTToggleButton {
  originalData: YTNodes.ToggleButton;
  icon_type: string;
  isToggled: boolean;
  text?: string;
  toggled_text?: string;
  endpoint?: YTNodes.NavigationEndpoint;
}

export interface YTChipCloud {
  originalData: YTNodes.ChipCloud;
  chip_clouds: YTChipCloudChip[];
}

export interface YTChipCloudChip {
  originalData: YTNodes.ChipCloudChip;
  text: string;
  isSelected: boolean;
  endpoint?: YTNodes.NavigationEndpoint;
}

export interface YTChapter {
  originalData: YTNodes.Chapter;
  title: string;
  thumbnailImage: Thumbnail;
  startDuration: number;
  endDuration: number;
}

export type YTChannelTabType =
  | "Home"
  | "Videos"
  | "Shorts"
  | "Playlists"
  | "About";

export interface YTChannel {
  originalData: YT.Channel;
  id: string;
  title?: string;
  description?: string;
  thumbnail: Thumbnail;
  tabTypes: YTChannelTabType[];
}

export interface YTMusicArtist {
  originalData: YTMusic.Artist;
  id: string;
  title: string;
  description?: string;
  thumbnail?: Thumbnail;
  profileImage?: Thumbnail;
  // Endpoints
  playEndpoint?: YTNodes.NavigationEndpoint;
  data: HorizontalData[];
}

export interface YTMusicAlbum {
  originalData: YTMusic.Album;
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: Thumbnail;
  // Endpoints
  playEndpoint?: YTNodes.NavigationEndpoint;
  data: ElementData[];
}

export interface YTEndscreen {
  originalData: YTNodes.Endscreen;
  startDuration: number;
  elements: YTEndscreenElement[];
}

export interface YTEndscreenElement {
  originalData: YTNodes.EndscreenElement;
  id: string;
  style: "VIDEO" | "PLAYLIST" | "CHANNEL" | "WEBSITE";
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
  thumbnailImage?: Thumbnail;
  author?: Author;
  description?: string;

  playEndpoint?: YTNodes.NavigationEndpoint;
  saved?: {
    status: boolean;
    saveID: string;
  };
  editable?: boolean;

  menu?: YTMenu;

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

interface AuthorMusic {
  name: string;
  channel_id?: string;
  endpoint?: YTNodes.NavigationEndpoint;
}

export function getAuthorMusic(author: AuthorMusic) {
  return {
    id: author.channel_id,
    name: author.name,
    navEndpoint: author?.endpoint,
  } as Author;
}

export interface YTLibrary {
  originalData: YT.Library;
  sections: YTLibrarySection[];
}

export interface YTLibrarySection {
  type?: "playlists" | "history";
  title: string;
  content: ElementData[];
  playlistId?: string;
  getMoreData: () => Promise<
    YT.Playlist | YT.History | Mixins.Feed<IBrowseResponse>
  >;
}

export interface YTComments {
  originalData: YT.Comments;
  title?: string;
  comments_count?: string;
}

export interface YTCommentThread {
  originalData: YTNodes.CommentThread;
  has_replies: boolean;
  comment: YTComment;
}

export interface YTComment {
  originalData: YTNodes.CommentView;
  id: string;
  content: string;
  author: Author;
}
