import _ from "lodash";
import {Simulate} from "react-dom/test-utils";

import {getVideoData} from "./ElementData";
import {getThumbnail} from "./Misc";
import {
  Author,
  ElementData,
  getAuthor,
  Thumbnail,
  YTChannel,
  YTChapter,
  YTChipCloud,
  YTChipCloudChip,
  YTEndscreen,
  YTEndscreenElement,
  YTMusicAlbum,
  YTMusicArtist,
  YTPlaylist,
  YTPlaylistPanel,
  YTPlaylistPanelItem,
  YTTrackInfo,
  YTVideoInfo,
} from "./Types";
import {YT, YTNodes, YTMusic} from "../utils/Youtube";

import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {parseHorizontalNode} from "@/extraction/ShelfExtraction";
import play = Simulate.play;

export function getElementDataFromVideoInfo(videoInfo: YT.VideoInfo) {
  const thumbnail = videoInfo.basic_info.thumbnail
    ? videoInfo.basic_info.thumbnail
        .map(getThumbnail)
        .find(thumb => !thumb.url.endsWith("webp")) // Do not use webp for iOS!
    : undefined;

  const chapters = extractChaptersFromVideoInfo(videoInfo);

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
      videoInfo.primary_info?.short_view_count.text ??
      videoInfo.primary_info?.view_count.text,
    publishDate: videoInfo.primary_info?.relative_date.text,
    chapters,
    channel_id:
      videoInfo.basic_info.channel_id ?? videoInfo.basic_info.channel?.id,
    channel: videoInfo.basic_info.channel,
    playlist: parseVideoInfoPlaylist(videoInfo),
    liked: videoInfo.basic_info.is_liked,
    disliked: videoInfo.basic_info.is_disliked,
    endscreen: parseEndScreen(videoInfo.endscreen),
    // TODO: Adapt author to only contain name
    author: {name: videoInfo.basic_info.author},
    durationSeconds: videoInfo.basic_info.duration,
  } as YTVideoInfo;
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
  console.log("EndScreen: ", JSON.stringify(element));

  const thumbnail = element.image.map(getThumbnail)[0];
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
    short_views: trackInfo.basic_info?.view_count.toString(),
    channel_id:
      trackInfo.basic_info.channel_id ?? trackInfo.basic_info.channel?.id,
    channel: trackInfo.basic_info.channel,
    // playlist: parseVideoInfoPlaylist(trackInfo),
    liked: trackInfo.basic_info.is_liked,
    disliked: trackInfo.basic_info.is_disliked,
    endscreen: parseEndScreen(trackInfo.endscreen),
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
    title: playlist.title,
    items,
  } as YTPlaylistPanel;
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
  } else {
    console.warn("Unknown Track Info Playlist Item: ", item.type);
  }
}

function parseVideoInfoPlaylist(videoInfo: YT.VideoInfo) {
  if (videoInfo.playlist) {
    const playlist = videoInfo.playlist;

    console.log("PlaylistData: ", JSON.stringify(videoInfo.playlist.contents));

    const content = _.chain(playlist.contents)
      .map(getVideoData)
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
    .flatMap(c => c.value.chapters)
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
    title: channel.title,
    description: channel.metadata.description,
  } as YTChannel;
}

export function getElementDataFromYTMusicArtist(
  artist: YTMusic.Artist,
  id: string,
) {
  let title: string, description: string;
  let thumbnail: Thumbnail;
  const header = artist.header;
  if (header.is(YTNodes.MusicImmersiveHeader)) {
    title = header.title.text;
    description = header.description.text;
    thumbnail = getThumbnail(header.thumbnail.contents[0]);
  } else {
    console.warn(`Unknown YTMusicArtist Header type: ${header.type}`);
  }

  return {
    originalData: artist,
    id,
    title,
    description,
    thumbnail,
    data: _.chain(artist.sections).map(parseHorizontalNode).compact().value(),
  } as YTMusicArtist;
}

// YTMusic.Album

export function getElementDataFromYTAlbum(album: YTMusic.Album, id: string) {
  console.log("YTAlbum", album);
  let title: string, subtitle: string;
  let thumbnail: Thumbnail;
  let endpoint: YTNodes.NavigationEndpoint;

  const header = album.header;
  if (header.is(YTNodes.MusicResponsiveHeader)) {
    title = header.title.text;
    subtitle = header.subtitle.text;
    thumbnail = getThumbnail(header.thumbnail.contents[0]);
    endpoint = header.buttons.firstOfType(YTNodes.MusicPlayButton).endpoint;
  } else {
    console.warn(`Unknown YTMusicArtist Header type: ${header.type}`);
  }
  console.log("Contents: ", album.contents);

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

export function getElementDataFromYTMusicPlaylist(playlist: YTMusic.Playlist) {
  return new YTMusicPlaylistClass(playlist);
}

class YTPlaylistClass implements YTPlaylist {
  items: ElementData[];

  originalData: YT.Playlist;
  thumbnailImage: Thumbnail;
  title: string;
  author?: Author;

  constructor(playlist: YT.Playlist) {
    this.originalData = playlist;
    this.items = _.chain(playlist.items).map(getVideoData).compact().value();
    this.thumbnailImage = getThumbnail(playlist.info.thumbnails[0]);
    this.title = playlist.info.title;
    this.author = getAuthor(playlist.info.author);
  }

  async loadMore() {
    if (this.originalData.has_continuation) {
      const updatedPlaylist = await this.originalData.getContinuation();
      const newItems = updatedPlaylist.items.map(getVideoData);
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
  thumbnailImage: Thumbnail;
  title: string;
  author?: Author;
  subtitle?: string;
  description?: string;

  playEndpoint?: YTNodes.NavigationEndpoint;

  backgroundThumbnail?: Thumbnail;

  constructor(playlist: YTMusic.Playlist) {
    this.originalData = playlist;
    this.items = _.chain(playlist.items).map(getVideoData).compact().value();
    this.backgroundThumbnail = playlist.background
      ? getThumbnail(playlist.background.contents[0])
      : undefined;

    if (playlist.header.is(YTNodes.MusicResponsiveHeader)) {
      this.thumbnailImage = getThumbnail(playlist.header.thumbnail.contents[0]);
      this.title = playlist.header.title?.text ?? "Empty title";
      this.subtitle = playlist.header.subtitle.text;
      this.description = playlist.header.description?.description?.text;
      playlist.header.buttons.forEach(v => {
        if (v.is(YTNodes.MusicPlayButton)) {
          this.playEndpoint = v.endpoint;
        }
      });
    } else if (playlist.header.is(YTNodes.MusicDetailHeader)) {
      this.thumbnailImage = getThumbnail(playlist.header.thumbnails[0]);
      this.title = playlist.header.title?.text ?? "Empty title";
      this.subtitle = playlist.header.subtitle.text;
      this.description = playlist.header.description.text;
      // console.log("Badges: ", playlist.header.badges);
      // this.author = getAuthor(playlist.header?.author);
    } else if (playlist.header.is(YTNodes.MusicEditablePlaylistDetailHeader)) {
      console.log(`Unknown music detail header: ${playlist.header}`);
    }
  }

  async loadMore() {
    if (this.originalData.has_continuation) {
      const updatedPlaylist = await this.originalData.getContinuation();
      const newItems = updatedPlaylist.items.map(getVideoData);
      this.items.push(...newItems);
      this.originalData = updatedPlaylist;
    } else {
      throw new Error("No continuation available");
    }
  }
}
