import {useRef, useState} from "react";
import {YTTV} from "youtubei.js";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {ElementData} from "@/extraction/Types";
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

  const playlistFeed = useRef<YTTV.PlaylistsFeed>();

  const fetchPlaylists = async () => {
    await youtube?.tv.getPlaylists().then(response => {
      LOGGER.debug("PLAYLISTS: ", JSON.stringify(response.contents, null, 2));

      playlistFeed.current = response;
      response.contents && setPlaylists(parseObservedArray(response.contents));
    });
  };

  const fetchPlaylistsContinuation = async () => {
    if (playlistFeed.current?.has_continuation) {
      playlistFeed.current.getContinuation().then(continuation => {
        playlistFeed.current = continuation;
        setPlaylists(prevState => {
          if (!continuation.contents) {
            return prevState;
          }
          return [
            ...(prevState ?? []),
            ...parseObservedArray(continuation.contents),
          ];
        });
      });
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
  };

  const removeVideoFromPlaylist = async (
    videoIds: string[],
    playlistId: string,
  ) => {
    LOGGER.debug(`Removing videos ${videoIds} to playlist ${playlistId}`);
    await youtube?.playlist?.removeVideos(playlistId, videoIds);
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
