import {getThumbnail, parseThumbnailOverlays} from "./Misc";
import {
  Author,
  ChannelData,
  ElementData,
  getAuthor,
  getAuthorMusic,
  PlaylistData,
  VideoData,
} from "./Types";
import Logger from "../utils/Logger";
import {Helpers, YTNodes} from "../utils/Youtube";

// TODO: Add ChannelData

// TODO: Split from ElementData in VideoData or PlaylistData

const skippedTypes = [
  // Movies are skipped
  YTNodes.GridMovie,
  YTNodes.Movie,
  // "CompactMovie", // No type available
];

const LOGGER = Logger.extend("EXTRACTION");

export function getVideoDataOfFirstElement(
  dataArr: Helpers.ObservedArray<Helpers.YTNode>,
) {
  const index = dataArr.findIndex(v => {
    return getVideoData(v) !== undefined;
  });
  return getVideoData(dataArr[index]);
}

// Exclude not supported formats? e.x. CompactMovies

// TODO: Rename to ElementData

export function getVideoData(
  ytNode: Helpers.YTNode,
  suppressedError?: boolean,
): ElementData | undefined {
  if (!ytNode) {
    // LOGGER.warn("FALSE TYPE PROVIDED!");
    return undefined;
  }

  if (ytNode.is(...skippedTypes)) {
    LOGGER.debug("Skipping acknowledged type");
    return undefined;
  }

  // TODO: Maybe split
  if (ytNode.is(YTNodes.Video, YTNodes.CompactVideo)) {
    const duration = ytNode.duration.text;
    return {
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.best_thumbnail
        ? getThumbnail(ytNode.best_thumbnail)
        : undefined,
      short_views: ytNode.short_view_count.toString(),
      author: getAuthor(ytNode.author),
      publishDate: ytNode.published.text,
      type: "video",
      duration: duration?.startsWith("N/A") ? undefined : duration,
      livestream: ytNode.is_live,
      thumbnailOverlays: parseThumbnailOverlays(ytNode.thumbnail_overlays),
      originalNode: ytNode,
    } as VideoData;
  } else if (ytNode.is(YTNodes.GridVideo)) {
    return {
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: getThumbnail(ytNode.thumbnails[0]),
      short_views: ytNode.short_view_count.toString(),
      author: ytNode.author ? getAuthor(ytNode.author) : undefined,
      publishDate: ytNode.published.text,
      type: ytNode.duration?.text === "SHORTS" ? "reel" : "video",
      duration: ytNode.duration?.text,
      thumbnailOverlays: parseThumbnailOverlays(ytNode.thumbnail_overlays),
      originalNode: ytNode,
    } as VideoData;
  } else if (ytNode.is(YTNodes.ReelItem)) {
    return {
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: getThumbnail(ytNode.thumbnails[0]),
      short_views: ytNode.views.toString(),
      type: "reel",
      originalNode: ytNode,
    } as VideoData;
  } else if (ytNode.is(YTNodes.ShortsLockupView)) {
    return {
      id: ytNode.entity_id,
      title: ytNode.overlay_metadata?.primary_text?.text ?? "Unknown title",
      thumbnailImage: getThumbnail(ytNode.thumbnail[0]),
      short_views: ytNode.overlay_metadata.secondary_text?.text,
      navEndpoint: ytNode.on_tap_endpoint,
      type: "reel",
      originalNode: ytNode,
    } as VideoData;
  } else if (ytNode.is(YTNodes.PlaylistVideo)) {
    const [views, publishment] = ytNode.video_info?.text?.split(" • ") ?? [];
    return {
      type: "video",
      originalNode: ytNode,
      id: ytNode.id,
      navEndpoint: ytNode.endpoint,
      title: ytNode.title.toString(),
      thumbnailImage: getThumbnail(ytNode.thumbnails[0]),
      thumbnailOverlays: parseThumbnailOverlays(ytNode.thumbnail_overlays),
      duration: ytNode.duration?.text,
      durationSeconds: ytNode.duration?.seconds,
      publishDate: publishment,
      short_views: views,
      author: ytNode.author ? getAuthor(ytNode.author) : undefined,
    } as VideoData;
  } else if (ytNode.is(YTNodes.PlaylistPanelVideo)) {
    return {
      type: "video",
      originalNode: ytNode,
      id: ytNode.video_id,
      navEndpoint: ytNode.endpoint,
      title: ytNode.title.toString(),
      thumbnailImage: getThumbnail(ytNode.thumbnail[0]),
      duration: ytNode.duration.text,
    } as VideoData;
  } else if (ytNode.is(YTNodes.MusicTwoRowItem)) {
    // console.log("Music two row ", JSON.stringify(ytNode));
    if (ytNode.item_type === "playlist" || ytNode.item_type === "album") {
      return {
        type: ytNode.item_type,
        originalNode: ytNode,
        id: ytNode.id,
        navEndpoint: ytNode.endpoint,
        title: ytNode.title.text,
        subtitle: ytNode.subtitle?.text,
        thumbnailImage: getThumbnail(ytNode.thumbnail[0]),
        music: true,
        author: ytNode.author ? getAuthorMusic(ytNode.author) : undefined,
        videoCount: ytNode.item_count,
        // TODO: Add Autor
      } as PlaylistData;
    } else if (ytNode.item_type === "song" || ytNode.item_type === "video") {
      // console.log("Author: ", ytNode.author);
      return {
        type: "video",
        originalNode: ytNode,
        id: ytNode.id,
        navEndpoint: ytNode.endpoint,
        title: ytNode.title.text,
        subtitle: ytNode.subtitle?.text,
        thumbnailImage: getThumbnail(ytNode.thumbnail[0]),
        music: true,
        author: ytNode.author ? getAuthorMusic(ytNode.author) : undefined,
        // TODO: Add Autor
      } as VideoData;
    } else if (ytNode.item_type === "artist") {
      // console.log("Author: ", ytNode.author);
      return {
        type: "channel",
        originalNode: ytNode,
        id: ytNode.id,
        navEndpoint: ytNode.endpoint,
        title: ytNode.title?.text,
        thumbnailImage: ytNode.thumbnail
          ? getThumbnail(ytNode.thumbnail[0])
          : undefined,
        music: true,
        author: ytNode.author ? getAuthorMusic(ytNode.author) : undefined,
        subscribers: ytNode.subscribers,
        subtitle: ytNode.subtitle.runs?.toReversed()?.[0]?.text,
      } as ChannelData;
    } else {
      LOGGER.warn(`Unknown Music two row item type: ${ytNode.item_type}`);
    }
  } else if (ytNode.is(YTNodes.MusicResponsiveListItem)) {
    if (ytNode.item_type === "playlist" || ytNode.item_type === "album") {
      const [author, views] = ytNode.subtitle?.text?.split(" • ") ?? [];
      return {
        type: ytNode.item_type,
        originalNode: ytNode,
        id: ytNode.id,
        navEndpoint: ytNode.endpoint,
        title: ytNode.title,
        subtitle: ytNode.subtitle?.text,
        thumbnailImage: ytNode.thumbnail
          ? getThumbnail(ytNode.thumbnail.contents[0])
          : undefined,
        music: true,
        artists: ytNode.artists?.map(
          artist =>
            ({
              name: artist.name,
              id: artist?.channel_id,
              navEndpoint: artist.endpoint,
            }) as Author,
        ),
        author:
          (ytNode.author ? getAuthorMusic(ytNode.author) : undefined) ?? author,
      } as PlaylistData;
    } else if (ytNode.item_type === "video" || ytNode.item_type === "song") {
      return {
        type: "video",
        originalNode: ytNode,
        id: ytNode.id,
        navEndpoint: ytNode.overlay?.content?.endpoint ?? ytNode.endpoint,
        title: ytNode.title,
        subtitle: ytNode.subtitle?.text,
        thumbnailImage: ytNode.thumbnail
          ? getThumbnail(ytNode.thumbnail.contents[0])
          : undefined,
        duration: ytNode.duration?.text,
        music: true,
        artists: ytNode.artists?.map(
          artist =>
            ({
              name: artist.name,
              id: artist?.channel_id,
              navEndpoint: artist.endpoint,
            }) as Author,
        ),
        author: ytNode.author
          ? getAuthorMusic(ytNode.author)
          : ytNode.authors && ytNode.authors?.length > 0
            ? getAuthorMusic(ytNode.authors[0])
            : undefined,
        album: ytNode.album ? ytNode.album : undefined,
      } as VideoData;
    } else if (ytNode.item_type === "artist") {
      return {
        type: "channel",
        originalNode: ytNode,
        id: ytNode.id,
        navEndpoint: ytNode.endpoint,
        title: ytNode.title?.toString() ?? ytNode.name,
        thumbnailImage: ytNode.thumbnail
          ? getThumbnail(ytNode.thumbnail.contents[0])
          : undefined,
        music: true,
        author: ytNode.author ? getAuthorMusic(ytNode.author) : undefined,
        subscribers: ytNode.subscribers,
        subtitle: ytNode.subtitle?.runs?.toReversed()?.[0]?.text,
      } as ChannelData;
    } else {
      LOGGER.warn(
        "getVideoData: Unknown MusicResponsiveListItem type: ",
        ytNode.item_type,
      );
    }
  }
  // Playlist Data
  else if (ytNode.is(YTNodes.GridPlaylist)) {
    return {
      type: "playlist",
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: getThumbnail(ytNode.thumbnails[0]),
      author: ytNode.author ? getAuthor(ytNode.author) : undefined,
      originalNode: ytNode,
      videoCount: ytNode.video_count_short.text,
    } as PlaylistData;
  } else if (ytNode.is(YTNodes.Playlist)) {
    return {
      type: "playlist",
      originalNode: ytNode,
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: getThumbnail(ytNode.thumbnails[0]),
      videoCount: ytNode.video_count_short.text,
    } as PlaylistData;
  } else if (ytNode.is(YTNodes.CompactPlaylist)) {
    return {
      type: "playlist",
      originalNode: ytNode,
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: getThumbnail(ytNode.thumbnails[0]),
      videoCount: ytNode.video_count_short.text,
    } as PlaylistData;
  } else if (ytNode.is(YTNodes.CompactMix, YTNodes.Mix)) {
    return {
      type: "mix",
      originalNode: ytNode,
      id: ytNode.id,
      navEndpoint: ytNode.endpoint,
      title: ytNode.title.toString(),
      thumbnailImage: getThumbnail(ytNode.thumbnails[0]),
      videoCount: ytNode.video_count_short.text,
      short_views: ytNode.video_count_short.text,
    } as VideoData;
  }
  // Channel Data
  else if (ytNode.is(YTNodes.GridChannel)) {
    const author = getAuthor(ytNode.author);
    return {
      type: "channel",
      originalNode: ytNode,
      id: ytNode.id,
      author,
      title: author.name,
      thumbnailImage: author.thumbnail
        ? getThumbnail(author.thumbnail)
        : undefined,
    } as ChannelData;
  } else if (ytNode.is(YTNodes.Channel)) {
    const author = getAuthor(ytNode.author);
    return {
      type: "channel",
      originalNode: ytNode,
      id: ytNode.id,
      author,
      title: author.name,
      thumbnailImage: author.thumbnail
        ? getThumbnail(author.thumbnail)
        : undefined,
    } as ChannelData;
  }
  // TODO: Maybe outsource in other file
  // Lookup Views
  else if (ytNode.is(YTNodes.LockupView)) {
    const image = ytNode.content_image?.is(YTNodes.CollectionThumbnailView)
      ? // @ts-ignore TODO: fix
        getThumbnail(ytNode.content_image.primary_thumbnail.image[0])
      : // @ts-ignore TODO: fix
        getThumbnail(ytNode.content_image.image[0]);
    if (ytNode.content_type === "PLAYLIST") {
      return {
        type: "playlist",
        originalNode: ytNode,
        id: ytNode.content_id,
        thumbnailImage: image,
        title: ytNode.metadata?.title?.text ?? "Unknown Playlist title",
      } as PlaylistData;
    } else if (ytNode.content_type === "VIDEO") {
      // TODO: NEW Type not handled in lib?!
      // return {
      //   type: "playlist",
      //   originalNode: ytNode,
      //   id: ytNode.content_id,
      //   thumbnailImage: getThumbnail(
      //     ytNode.content_image.primary_thumbnail.image[0],
      //   ),
      //   title: ytNode.metadata.title.text ?? "Unknown Playlist title",
      // } as PlaylistData;
      // console.log(ytNode);
      // console.log(ytNode.metadata.metadata.metadata_rows[1]?.metadata_parts);

      return {
        type: "video",
        originalNode: ytNode,
        id: ytNode.content_id,
        thumbnailImage: image,
        title: ytNode.metadata?.title?.text,
        navEndpoint: ytNode.renderer_context.command_context.on_tap,
      } as VideoData;
    } else {
      LOGGER.warn(
        "getVideoData: Unknown LookupView type: ",
        ytNode.content_type,
      );
    }
  }
  // Recursive Section
  else if (ytNode.is(YTNodes.RichItem)) {
    // Recursive extraction
    return getVideoData(ytNode.content);
  } else if (ytNode.is(YTNodes.ReelShelf)) {
    LOGGER.debug("ReelShelf Nav Endpoint: ", ytNode.endpoint);
    LOGGER.debug("ReelShelf: ", ytNode.items);
  } else if (!suppressedError) {
    LOGGER.warn("getVideoData: Unknown type: ", ytNode.type);
  }
}
