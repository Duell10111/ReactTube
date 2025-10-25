import _ from "lodash";

import {getVideoData} from "./ElementData";
import {getThumbnail} from "./Misc";
import {
  Author,
  ElementData,
  getAuthor,
  Thumbnail,
  YTChannel,
  YTChannelTabType,
  YTChapter,
  YTChipCloud,
  YTChipCloudChip,
  YTComments,
  YTCommentThread,
  YTEndscreen,
  YTEndscreenElement,
  YTFormat,
  YTLibrary,
  YTLibrarySection,
  YTMenu,
  YTMusicAlbum,
  YTMusicArtist,
  YTMyYoutubeTab,
  YTPlaylist,
  YTPlaylistPanel,
  YTPlaylistPanelContinuation,
  YTPlaylistPanelItem,
  YTToggleButton,
  YTTrackInfo,
  YTVideoInfo,
  YTVideoInfoCommentEntryPointHeader,
} from "./Types";
import {
  YT,
  YTTV,
  YTNodes,
  YTMusic,
  PlaylistPanelContinuation,
  Helpers,
  Misc,
} from "../utils/Youtube";

import {
  parseArrayHorizontalData,
  parseObservedArray,
} from "@/extraction/ArrayExtraction";
import {parseHorizontalNode} from "@/extraction/ShelfExtraction";

// TODO: Also parse buttons available, if available?!
export function getElementDataFromVideoInfo(videoInfo: YT.VideoInfo) {
  const thumbnail = videoInfo.basic_info.thumbnail
    ? videoInfo.basic_info.thumbnail
        .map(getThumbnail)
        .find(thumb => !thumb.url.endsWith("webp")) // Do not use webp for iOS!
    : undefined;

  const chapters = extractChaptersFromVideoInfo(videoInfo);

  let best_format: Misc.Format | undefined = undefined;

  try {
    best_format =
      videoInfo.chooseFormat({
        type: "video+audio",
        quality: "best",
      }) ??
      videoInfo.chooseFormat({
        type: "audio",
        quality: "best",
      });
  } catch (e) {
    console.warn("Error while matching formats: ", e);
  }

  // TODO: Check?
  // @ts-ignore
  return {
    originalData: videoInfo,
    id: videoInfo.basic_info.id,
    duration: videoInfo.basic_info.duration,
    livestream: videoInfo.basic_info.is_live,
    thumbnailImage: thumbnail,
    title: videoInfo.basic_info.title,
    description: videoInfo.basic_info.short_description,
    short_views:
      videoInfo.primary_info?.view_count?.short_view_count?.text ??
      videoInfo?.primary_info?.view_count?.original_view_count,
    publishDate: videoInfo.primary_info?.relative_date.text,
    chapters,
    channel_id:
      videoInfo.basic_info.channel_id ?? videoInfo.basic_info.channel?.id,
    channel: videoInfo.basic_info.channel,
    subscribed: videoInfo?.secondary_info?.subscribe_button?.is(
      YTNodes.SubscribeButton,
    )
      ? videoInfo.secondary_info.subscribe_button.subscribed
      : undefined,
    playlist: parseVideoInfoPlaylist(videoInfo),
    liked: videoInfo.basic_info.is_liked,
    disliked: videoInfo.basic_info.is_disliked,
    endscreen: videoInfo.endscreen
      ? parseEndScreen(videoInfo.endscreen)
      : undefined,
    // TODO: Adapt author to only contain name
    author: {
      name: videoInfo.basic_info.author,
      id: videoInfo.basic_info.channel_id ?? videoInfo.basic_info.channel?.id,
    },
    watchNextFeed: videoInfo.watch_next_feed
      ? parseObservedArray(videoInfo.watch_next_feed)
      : undefined,
    durationSeconds: videoInfo.basic_info.duration,
    playability: videoInfo.playability_status
      ? {
          reason: videoInfo.playability_status.reason,
        }
      : undefined,
    hls_manifest_url: videoInfo.streaming_data?.hls_manifest_url,
    best_format: best_format ? parseFormat(best_format) : undefined,
  } as YTVideoInfo;
}

export function getElementDataFromTVVideoInfo(videoInfo: YTTV.VideoInfo) {
  const thumbnail = videoInfo.basic_info.thumbnail
    ? videoInfo.basic_info.thumbnail
        .map(getThumbnail)
        .find(thumb => !thumb.url.endsWith("webp")) // Do not use webp for iOS!
    : undefined;

  let best_format: Misc.Format | undefined = undefined;

  try {
    best_format =
      videoInfo.chooseFormat({
        type: "video+audio",
        quality: "best",
      }) ??
      videoInfo.chooseFormat({
        type: "audio",
        quality: "best",
      });
  } catch (e) {
    console.warn("Error while matching formats: ", e);
  }

  console.log("TVVVVV");

  // TODO: Check?
  // @ts-ignore
  return {
    originalData: videoInfo,
    id: videoInfo.basic_info.id,
    duration: videoInfo.basic_info.duration,
    livestream: videoInfo.basic_info.is_live,
    thumbnailImage: thumbnail,
    title: videoInfo.basic_info.title,
    description: videoInfo.basic_info.short_description,
    short_views:
      videoInfo.primary_info?.view_count?.short_view_count?.text ??
      videoInfo?.primary_info?.view_count?.original_view_count,
    publishDate: videoInfo.primary_info?.date_text?.text,
    channel_id:
      videoInfo.basic_info.channel_id ?? videoInfo.basic_info.channel?.id,
    channel: videoInfo.basic_info.channel,
    subscribed: videoInfo?.secondary_info?.subscribe_button?.is(
      YTNodes.SubscribeButton,
    )
      ? videoInfo.secondary_info.subscribe_button.subscribed
      : undefined,
    playlist: parseVideoInfoPlaylist(videoInfo),
    liked: videoInfo.basic_info.is_liked,
    disliked: videoInfo.basic_info.is_disliked,
    endscreen: videoInfo.endscreen
      ? parseEndScreen(videoInfo.endscreen)
      : undefined,
    // TODO: Adapt author to only contain name
    author: {
      name: videoInfo.basic_info.author,
      id: videoInfo.basic_info.channel_id ?? videoInfo.basic_info.channel?.id,
    },
    watchNextSections: videoInfo.watch_next_feed
      ? parseArrayHorizontalData(videoInfo.watch_next_feed)
      : undefined,
    durationSeconds: videoInfo.basic_info.duration,
    playability: videoInfo.playability_status
      ? {
          reason: videoInfo.playability_status.reason,
        }
      : undefined,
    hls_manifest_url: videoInfo.streaming_data?.hls_manifest_url,
    best_format: best_format ? parseFormat(best_format) : undefined,
  } as YTVideoInfo;
}

function parseFormat(format: Misc.Format) {
  const type: YTFormat["type"] =
    format.has_video && format.has_audio
      ? "audio+video"
      : format.has_video
        ? "video"
        : "audio";
  return {
    originalFormat: format,
    durationSeconds: format.approx_duration_ms,
    type,
  } as YTFormat;
}

function parseEndScreen(endScreen: YTNodes.Endscreen) {
  if (!endScreen) {
    return undefined;
  }
  return {
    originalData: endScreen,
    startDuration: parseInt(endScreen.start_ms, 10) / 1000,
    elements: endScreen.elements.map(parseEndScreenElements),
  } as YTEndscreen;
}

function parseEndScreenElements(element: YTNodes.EndscreenElement) {
  const thumbnail = element.image?.map(getThumbnail)?.[0];
  // .find(thumb => !thumb.url.endsWith("webp")); // Do not use webp for iOS!;

  return {
    originalData: element,
    id: element.id,
    startDuration: element.start_ms / 1000,
    endDuration: element.end_ms / 1000,
    aspect_ratio: element.aspect_ratio,
    width: element.width,
    left: element.left,
    top: element.top,
    title: element.title.text,
    navEndpoint: element.endpoint,
    style: element.style,
    thumbnailImage: thumbnail,
  } as YTEndscreenElement;
}

function parseCommentsEntryPointHeader(
  element: YTNodes.CommentsEntryPointHeader,
) {
  return {
    originalData: element,
    comments_count: element.comment_count?.text,
    header_text: element.header?.text,
  } as YTVideoInfoCommentEntryPointHeader;
}

export function getElementDataFromTrackInfo(trackInfo: YTMusic.TrackInfo) {
  const thumbnail = trackInfo.basic_info.thumbnail
    ? trackInfo.basic_info.thumbnail
        .map(getThumbnail)
        .find(thumb => !thumb.url.endsWith("webp")) // Do not use webp for iOS!
    : undefined;

  // TODO: Check?
  return {
    originalData: trackInfo,
    id: trackInfo.basic_info.id,
    livestream: trackInfo.basic_info.is_live,
    thumbnailImage: thumbnail,
    title: trackInfo.basic_info.title,
    description: trackInfo.basic_info.short_description,
    short_views: trackInfo.basic_info?.view_count?.toString(),
    channel_id:
      trackInfo.basic_info.channel_id ?? trackInfo.basic_info.channel?.id,
    channel: trackInfo.basic_info.channel,
    // playlist: parseVideoInfoPlaylist(trackInfo),
    liked: trackInfo.basic_info.is_liked,
    disliked: trackInfo.basic_info.is_disliked,
    endscreen: trackInfo.endscreen
      ? parseEndScreen(trackInfo.endscreen)
      : undefined,
    // TODO: Adapt author to only contain name
    author: {name: trackInfo.basic_info.author},
    durationSeconds: trackInfo.basic_info.duration,
  } as YTTrackInfo;
}

export function parseTrackInfoPlaylist(playlist: YTNodes.PlaylistPanel) {
  const items = _.chain(playlist.contents)
    .map(parseTrackInfoPlaylistItems)
    .compact()
    .value();
  return {
    originalData: playlist,
    title: playlist.title,
    items,
  } as YTPlaylistPanel;
}

export function parseTrackInfoPlaylistContinuation(
  playlistPanelContinuation: PlaylistPanelContinuation,
) {
  const items = _.chain(playlistPanelContinuation.contents)
    .map(parseTrackInfoPlaylistItems)
    .compact()
    .value();
  return {
    originalData: playlistPanelContinuation,
    items,
  } as YTPlaylistPanelContinuation;
}

// TODO: Outsource to ElementData?
function parseTrackInfoPlaylistItems(
  item:
    | YTNodes.PlaylistPanelVideoWrapper
    | YTNodes.PlaylistPanelVideo
    | YTNodes.AutomixPreviewVideo,
) {
  if (item.is(YTNodes.PlaylistPanelVideo)) {
    return {
      id: item.video_id,
      navEndpoint: item.endpoint,
      selected: item.selected,
      thumbnailImage: getThumbnail(item.thumbnail[0]),
      title: item.title.text,
      duration: item.duration.text,
      durationSeconds: item.duration.seconds,
      author: {name: item.author},
    } as YTPlaylistPanelItem;
  } else if (item.is(YTNodes.AutomixPreviewVideo)) {
    // TODO: Use Automix item in future?
  } else {
    console.warn("Unknown Track Info Playlist Item: ", item.type);
  }
}

function parseVideoInfoPlaylist(videoInfo: YT.VideoInfo | YTTV.VideoInfo) {
  if (videoInfo.playlist) {
    const playlist = videoInfo.playlist;

    // console.log("PlaylistData: ", JSON.stringify(videoInfo.playlist.contents));

    const content = _.chain(playlist.contents)
      .map(element => getVideoData(element))
      .compact()
      .value();

    return {
      id: videoInfo.playlist.id,
      title: videoInfo.playlist.title,
      current_index: videoInfo.playlist.current_index,
      is_infinite: videoInfo.playlist.is_infinite,
      // author: videoInfo.playlist.author,
      content,
    } as YTVideoInfo["playlist"];
  }
}

function extractChaptersFromVideoInfo(videoInfo: YT.VideoInfo) {
  const ytChapters = _.chain(
    videoInfo.player_overlays?.decorated_player_bar?.player_bar?.markers_map ??
      [],
  )
    .flatMap(c => c.value.chapters ?? [])
    .compact()
    .value();
  return ytChapters.length > 0 && videoInfo.basic_info.duration
    ? getChaptersFromData(ytChapters, videoInfo.basic_info.duration)
    : [];
}

export function getChaptersFromData(
  chapters: YTNodes.Chapter[],
  durationInMillis: number,
) {
  const parsed = chapters.map(getChapterFromData);

  parsed.forEach((chapter, index) => {
    if (index < parsed.length - 1) {
      parsed[index].endDuration = parsed[index + 1].startDuration;
    } else {
      parsed[index].endDuration = durationInMillis / 1000;
    }
  });

  return parsed;
}

export function getChapterFromData(
  chapter: YTNodes.Chapter,
  indexNumber: number,
) {
  const thumbnail = chapter.thumbnail
    .map(getThumbnail)
    .find(thumb => !thumb.url.endsWith("webp")); // Do not use webp for iOS!;
  return {
    originalData: chapter,
    title: chapter.title.text ?? `Chapter ${indexNumber}`,
    thumbnailImage: thumbnail,
    startDuration: chapter.time_range_start_millis / 1000,
    // Do not set endDuration as not known from single data
  } as YTChapter;
}

export function parseMenu(menu: YTNodes.Menu) {
  const top_level_buttons = _.chain(menu.top_level_buttons)
    .map(parseYTMenuItem)
    .compact()
    .value();
  return {
    originalData: menu,
    top_level_buttons,
  } as YTMenu;
}

function parseYTMenuItem(node: Helpers.YTNode) {
  if (node.is(YTNodes.ToggleButton)) {
    return {
      originalData: node,
      isToggled: node.is_toggled,
      text: node.text.text,
      toggled_text: node.toggled_text.text,
      endpoint: node.endpoint,
      icon_type: node.icon_type,
    } as YTToggleButton;
  }
}

export function parseChipCloud(chipCloud: YTNodes.ChipCloud) {
  return {
    originalData: chipCloud,
    chip_clouds: _.chain(chipCloud.chips)
      .map(parseChipCloudChip)
      .compact()
      .value(),
  } as YTChipCloud;
}

function parseChipCloudChip(chipCloudChip: YTNodes.ChipCloudChip) {
  if (chipCloudChip.text === "N/A") {
    return;
  }
  return {
    originalData: chipCloudChip,
    text: chipCloudChip.text,
    isSelected: chipCloudChip.is_selected,
    endpoint: chipCloudChip.endpoint,
  } as YTChipCloudChip;
}

// YT.Channel

export function getElementDataFromYTChannel(channel: YT.Channel) {
  return {
    originalData: channel,
    id: channel.metadata.external_id,
    title: channel.metadata.title,
    description: channel.metadata.description,
    thumbnail: channel.metadata?.thumbnail
      ? getThumbnail(channel.metadata?.thumbnail[0])
      : undefined,
    tabTypes: getAvailableYTChannelTypes(channel),
  } as YTChannel;
}

function getAvailableYTChannelTypes(channel: YT.Channel): YTChannelTabType[] {
  return _.chain([
    channel.has_home ? "Home" : undefined,
    channel.has_videos ? "Videos" : undefined,
    channel.has_shorts ? "Shorts" : undefined,
    channel.has_playlists ? "Playlists" : undefined,
  ] as YTChannelTabType[])
    .compact()
    .value();
}

// YTMusic.Artist

export function getElementDataFromYTMusicArtist(
  artist: YTMusic.Artist,
  id: string,
) {
  let title: string | undefined,
    description: string | undefined = undefined;
  let thumbnail: Thumbnail | undefined = undefined;
  const header = artist.header;
  if (header?.is(YTNodes.MusicImmersiveHeader)) {
    title = header.title.text;
    description = header.description.text;
    thumbnail = header.thumbnail?.contents?.[0]
      ? getThumbnail(header.thumbnail?.contents?.[0])
      : undefined;
  } else if (header?.is(YTNodes.MusicVisualHeader)) {
    title = header.title.text;
    // TODO: Add support for background thumbnail?
    // Currently only foreground thumbnail used
    thumbnail = header.foreground_thumbnail?.[0]
      ? getThumbnail(header.foreground_thumbnail[0])
      : undefined;
  } else {
    console.warn(`Unknown YTMusicArtist Header type: ${header?.type}`);
  }

  return {
    originalData: artist,
    id,
    title: title ?? "Untitled",
    description,
    thumbnail,
    data: _.chain(artist.sections)
      .map(section => parseHorizontalNode(section))
      .compact()
      .value(),
  } as YTMusicArtist;
}

// YTMusic.Album

export function getElementDataFromYTAlbum(album: YTMusic.Album, id: string) {
  console.log("YTAlbum", album);
  let title: string | undefined, subtitle: string | undefined;
  let thumbnail: Thumbnail | undefined;
  let endpoint: YTNodes.NavigationEndpoint | undefined;

  const header = album.header;
  if (header?.is(YTNodes.MusicResponsiveHeader)) {
    title = header.title.text;
    subtitle = header.subtitle.text;
    thumbnail = header.thumbnail?.contents?.[0]
      ? getThumbnail(header.thumbnail.contents[0])
      : undefined;
    endpoint = header.buttons?.firstOfType(YTNodes.MusicPlayButton)?.endpoint;
  } else {
    console.warn(`Unknown YTMusicArtist Header type: ${header?.type}`);
  }

  return {
    originalData: album,
    id,
    title,
    subtitle,
    thumbnail,
    playEndpoint: endpoint,
    data: parseObservedArray(album.contents),
  } as YTMusicAlbum;
}

// YT.Playlist

export function getElementDataFromYTPlaylist(playlist: YT.Playlist) {
  return new YTPlaylistClass(playlist);
}

export function getElementDataFromYTTVPlaylist(playlist: YTTV.Playlist) {
  return new YTTVPlaylistClass(playlist);
}

export function getElementDataFromYTMusicPlaylist(playlist: YTMusic.Playlist) {
  return new YTMusicPlaylistClass(playlist);
}

class YTPlaylistClass implements YTPlaylist {
  items: ElementData[];

  originalData: YT.Playlist;
  thumbnailImage: Thumbnail;
  title: string;
  author?: Author;

  saved?: {
    status: boolean;
    saveID: string;
  };

  menu?: YTMenu;

  constructor(playlist: YT.Playlist) {
    this.originalData = playlist;
    this.items = _.chain(playlist.items)
      .map(element => getVideoData(element))
      .compact()
      .value();
    this.thumbnailImage = getThumbnail(playlist.info.thumbnails[0]);
    this.title = playlist.info.title ?? "Untitled";
    this.author = getAuthor(playlist.info.author);

    this.menu = playlist.menu.is(YTNodes.Menu)
      ? parseMenu(playlist.menu)
      : undefined;

    const savedButton = this.menu?.top_level_buttons?.find(
      item => item.icon_type === "PLAYLIST_ADD",
    );
    this.saved = savedButton
      ? {
          status: savedButton.isToggled,
          saveID: savedButton.endpoint?.payload?.target?.playlistId,
        }
      : undefined;
  }

  async loadMore() {
    if (this.originalData.has_continuation) {
      const updatedPlaylist = await this.originalData.getContinuation();
      const newItems = _.chain(updatedPlaylist.items)
        .map(element => getVideoData(element))
        .compact()
        .value();
      this.items.push(...newItems);
      this.originalData = updatedPlaylist;
    } else {
      throw new Error("No continuation available");
    }
  }
}

class YTTVPlaylistClass implements YTPlaylist {
  items: ElementData[];

  originalData: YTTV.Playlist;
  thumbnailImage?: Thumbnail;
  title: string;
  description?: string;
  author?: Author;

  // saved?: {
  //   status: boolean;
  //   saveID: string;
  // };
  //
  // menu?: YTMenu;

  constructor(playlist: YTTV.Playlist) {
    this.originalData = playlist;
    this.items = _.chain(playlist.items)
      .map(element => getVideoData(element))
      .compact()
      .value();
    // this.thumbnailImage = getThumbnail(playlist.[0]);
    this.title = playlist.header?.title.text ?? "Unknown title";
    this.description = playlist.header?.description?.text;

    // this.menu = playlist.menu.is(YTNodes.Menu)
    //   ? parseMenu(playlist.menu)
    //   : undefined;

    // const savedButton = this.menu.top_level_buttons.find(
    //   item => item.icon_type === "PLAYLIST_ADD",
    // );
    // this.saved = savedButton
    //   ? {
    //     status: savedButton.isToggled,
    //     saveID: savedButton.endpoint?.payload?.target?.playlistId,
    //   }
    //   : undefined;
  }

  async loadMore() {
    if (this.originalData.has_continuation) {
      const updatedPlaylist = await this.originalData.getContinuation();
      const newItems = _.chain(updatedPlaylist.items)
        .map(element => getVideoData(element))
        .compact()
        .value();
      this.items.push(...newItems);
      this.originalData = updatedPlaylist;
    } else {
      throw new Error("No continuation available");
    }
  }
}

class YTMusicPlaylistClass implements YTPlaylist {
  items: ElementData[];

  originalData: YTMusic.Playlist;
  thumbnailImage?: Thumbnail;
  title: string;
  author?: Author;
  subtitle?: string;
  description?: string;

  playEndpoint?: YTNodes.NavigationEndpoint;
  saved?: {
    status: boolean;
    saveID: string;
  };
  editable?: boolean;

  backgroundThumbnail?: Thumbnail;

  constructor(playlist: YTMusic.Playlist) {
    this.originalData = playlist;
    this.items = _.chain(playlist.items)
      .map(element => getVideoData(element))
      .compact()
      .value();
    this.backgroundThumbnail = playlist.background
      ? getThumbnail(playlist.background.contents[0])
      : undefined;

    if (playlist.header?.is(YTNodes.MusicResponsiveHeader)) {
      this.thumbnailImage = playlist.header.thumbnail?.contents?.[0]
        ? getThumbnail(playlist.header.thumbnail.contents[0])
        : undefined;
      this.title = playlist.header.title?.text ?? "Empty title";
      this.subtitle = playlist.header.subtitle.text;
      this.description = playlist.header.description?.description?.text;
      playlist.header.buttons.forEach(v => {
        if (v.is(YTNodes.MusicPlayButton)) {
          this.playEndpoint = v.endpoint;
        } else if (
          v.is(YTNodes.ToggleButton) &&
          v.icon_type === "LIBRARY_ADD"
        ) {
          this.saved = {
            status: v.is_toggled,
            saveID: v.endpoint?.payload?.target?.playlistId,
          };
        }
      });
      // playlist.header.buttons.
    } else if (playlist.header?.is(YTNodes.MusicDetailHeader)) {
      this.thumbnailImage = getThumbnail(playlist.header.thumbnails[0]);
      this.title = playlist.header.title?.text ?? "Empty title";
      this.subtitle = playlist.header.subtitle.text;
      this.description = playlist.header.description.text;
      // console.log("Badges: ", playlist.header.badges);
      // this.author = getAuthor(playlist.header?.author);
    } else if (playlist.header?.is(YTNodes.MusicEditablePlaylistDetailHeader)) {
      console.log(`Unknown music detail header: ${playlist.header}`);
    }
  }

  async loadMore() {
    if (this.originalData.has_continuation) {
      const updatedPlaylist = await this.originalData.getContinuation();
      const newItems = _.chain(updatedPlaylist.items)
        .map(element => getVideoData(element))
        .compact()
        .value();
      this.items.push(...newItems);
      this.originalData = updatedPlaylist;
    } else {
      throw new Error("No continuation available");
    }
  }
}

// YT.Library

interface YT_LIBRARY_SECTION {
  title: Misc.Text;
  contents: Helpers.YTNode[];
  endpoint?: YTNodes.NavigationEndpoint;
}

export async function getElementDataFromYTLibrary(library: YT.Library) {
  const shelves = library.page.contents_memo?.getType(YTNodes.Shelf);

  // Manually parsing Sections as Library implementation currently broken. Needs to be refactored.
  const sections =
    shelves?.map(
      shelf =>
        ({
          title: shelf.title,
          contents: shelf.content?.key("items").array() || [],
          endpoint: shelf.endpoint,
        }) as YT_LIBRARY_SECTION,
    ) ?? [];

  return {
    originalData: library,
    sections: _.chain(sections).map(parseYTLibrarySection).value(),
  } as YTLibrary;
}

export function parseYTLibrarySection(section: YT_LIBRARY_SECTION) {
  const playlistId = section.endpoint?.payload?.browseId?.startsWith("VL")
    ? section.endpoint?.payload.browseId
    : undefined;
  return {
    type: parseYTLibrarySectionType(section),
    title: section.title.text,
    content: _.chain(section.contents)
      .map(element => getVideoData(element))
      .compact()
      .value(),
    playlistId,
    getMoreData: async () => {
      throw Error("Not implemented");
    },
  } as YTLibrarySection;
}

function parseYTLibrarySectionType(section: YT_LIBRARY_SECTION) {
  const browseId: string | undefined = section.endpoint?.payload?.browseId;

  switch (browseId) {
    case "FEhistory":
      return "history";
    case "FEplaylist_aggregation":
      return "playlists";
  }
}

// YT.Comments

function parseYTComments(comments: YT.Comments) {
  return {
    originalData: comments,
    title: comments?.header?.title?.text,
    comments_count: comments?.header?.comments_count?.text,
  } as YTComments;
}

function parseCommentThread(commentThread: YTNodes.CommentThread) {
  return {
    originalData: commentThread,
    has_replies: commentThread.has_replies,
  } as YTCommentThread;
}

// YTTV.MyYoutubeFeed

// TODO: Parse tabs

export function parseYTMyYoutubeTab(tab: YTNodes.Tab) {
  const type = parseYTTabType(tab);
  console.log("Tab type: ", tab.type);
  return {
    originalData: tab,
    title: tab.title,
    type,
    selected: tab.selected,
  } as YTMyYoutubeTab;
}

function parseYTTabType(tab: YTNodes.Tab) {
  const browseId: string | undefined = tab.endpoint?.payload?.browseId;

  switch (browseId) {
    case "FEhistory":
      return "history";
    case "FEplaylist_aggregation":
      return "playlists";
  }
  console.log("BrowseID: ", browseId);
}
