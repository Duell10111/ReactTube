import {useRef, useState} from "react";
import {YTTV} from "youtubei.js";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {ElementData} from "@/extraction/Types";
import {notifyPlaylistChanged} from "@/hooks/playlist/playlistChangeEvents";
import {appendUniqueById} from "@/hooks/playlist/playlistMerge";
import Logger from "@/utils/Logger";
import {YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("PLAYLIST_MANAGER");

export default function useYTServerPlaylistManager() {
  const youtube = useYoutubeTVContext();

  const [playlists, setPlaylists] = useState<ElementData[]>();

  // TODO: Currently disabled as music is not working atm :(
  // const currentMusicLibrary = useRef<YTMusic.Library>();
  // const currentMusicLibraryContinuation = useRef<YTMusic.LibraryContinuation>();
  //
  // const fetchMusicPlaylists = async () => {
  //   const library = await youtube?.music?.getLibrary();
  //   library?.contents && setPlaylists(extractGrid(library.contents[0]));
  // };
  //
  // const fetchMusicPlaylistContinuation = () => {
  //   const cont =
  //     currentMusicLibraryContinuation.current ?? currentMusicLibrary.current;
  //   cont
  //     ?.getContinuation()
  //     .then(contData => {
  //       currentMusicLibraryContinuation.current = contData;
  //       setPlaylists([
  //         ...playlists!,
  //         ...parseObservedArray(contData.contents.contents!),
  //       ]);
  //     })
  //     .then(LOGGER.warn);
  // };

  const playlistFeed = useRef<YTTV.PlaylistsFeed>(undefined);
  // `onEndReached` fires repeatedly while a page is still loading.
  const loadingContinuation = useRef(false);

  const fetchPlaylists = async () => {
    await youtube?.tv.getPlaylists().then(response => {
      LOGGER.debug("PLAYLISTS: ", JSON.stringify(response.contents, null, 2));

      playlistFeed.current = response;
      response.contents &&
        setPlaylists(
          appendUniqueById([], parseObservedArray(response.contents)),
        );
    });
  };

  const fetchPlaylistsContinuation = async () => {
    const feed = playlistFeed.current;
    if (!feed?.has_continuation || loadingContinuation.current) {
      return;
    }

    loadingContinuation.current = true;
    try {
      const continuation = await feed.getContinuation();
      playlistFeed.current = continuation;
      setPlaylists(prevState => {
        if (!continuation.contents) {
          return prevState;
        }
        return appendUniqueById(
          prevState ?? [],
          parseObservedArray(continuation.contents),
        );
      });
    } catch (error) {
      // Callers fire this from list scroll events without awaiting it, so a
      // failed page must not surface as an unhandled rejection.
      LOGGER.warn("Loading more playlists failed: ", error);
    } finally {
      loadingContinuation.current = false;
    }
  };

  const createPlaylist = async (name: string, videoIds: string[]) => {
    await youtube?.playlist?.create(name, videoIds);
  };

  const saveVideoToPlaylist = async (
    videoIds: string[],
    playlistId: string,
  ) => {
    // TODO: Check if already added?
    playlistId = parsePlaylistID(playlistId);
    LOGGER.debug(`Adding videos ${videoIds} to playlist ${playlistId}`);
    // TODO: Check if TV endpoints are working everywhere
    await youtube?.playlist?.addVideos(playlistId, videoIds, "TV");
    notifyPlaylistChanged(playlistId);
  };

  const removeVideoFromPlaylist = async (
    videoIds: string[],
    playlistId: string,
  ) => {
    playlistId = parsePlaylistID(playlistId);
    LOGGER.debug(`Removing videos ${videoIds} from playlist ${playlistId}`);
    if (!youtube?.actions) {
      throw new Error("No YouTube session to remove videos with");
    }
    // Removed by video id, as the TV app does. `playlist.removeVideos` first
    // browses the whole playlist for each entry's set-video id, and that
    // browse request fails with status 400 on the TV session.
    const response = await new YTNodes.NavigationEndpoint({
      playlistEditEndpoint: {
        playlistId,
        actions: videoIds.map(id => ({
          action: "ACTION_REMOVE_VIDEO_BY_VIDEO_ID",
          removedVideoId: id,
        })),
      },
    }).call(youtube.actions, {client: "TV"});
    if (!response.success) {
      throw new Error(
        `Removing from playlist failed with status ${response.status_code}`,
      );
    }
    notifyPlaylistChanged(playlistId);
  };

  /** Moves a video directly behind `predecessorId`; YouTube has no "move to front". */
  const moveVideo = async (
    playlistId: string,
    movedId: string,
    predecessorId: string,
  ) => {
    playlistId = parsePlaylistID(playlistId);
    if (!youtube?.playlist) {
      throw new Error("No YouTube session to reorder the playlist with");
    }
    await youtube.playlist.moveVideo(playlistId, movedId, predecessorId);
    notifyPlaylistChanged(playlistId);
  };

  const addPlaylistToLibrary = async (playlistId: string) => {
    LOGGER.debug(`Adding playlist ${playlistId} to library`);
    // TODO: Check if TV endpoints are working everywhere
    await youtube?.playlist?.addToLibrary(playlistId, "TV");
  };

  const removePlaylistFromLibrary = async (playlistId: string) => {
    LOGGER.debug(`Removing playlist ${playlistId} to library`);
    // TODO: Check if TV endpoints are working everywhere
    await youtube?.playlist?.removeFromLibrary(playlistId, "TV");
  };

  const executeNavEndpoint = async (
    navEndpoint: YTNodes.NavigationEndpoint,
  ) => {
    if (youtube?.actions) {
      const response = await navEndpoint.call(youtube.actions, {
        client: "TV",
      });
      if (!response.success) {
        console.error("Error calling playlist call");
      }
      console.log(response);
    } else {
      LOGGER.warn("No youtube context available!");
    }
  };

  return {
    playlists,
    fetchPlaylists,
    fetchMorePlaylists: fetchPlaylistsContinuation,
    createPlaylist,
    saveVideoToPlaylist,
    removeVideoFromPlaylist,
    moveVideo,
    addPlaylistToLibrary,
    removePlaylistFromLibrary,
    executeNavEndpoint,
  };
}

function parsePlaylistID(playlistID: string) {
  if (playlistID.indexOf("VL") >= 0) {
    return playlistID.split("VL")[1];
  }
  return playlistID;
}
