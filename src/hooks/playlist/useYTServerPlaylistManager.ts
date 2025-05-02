import {useRef, useState} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {extractGrid} from "@/extraction/GridExtraction";
import {ElementData} from "@/extraction/Types";
import Logger from "@/utils/Logger";
import {YTMusic, YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("PLAYLIST_MANAGER");

export default function useYTServerPlaylistManager() {
  const youtube = useYoutubeContext();

  const [playlists, setPlaylists] = useState<ElementData[]>();
  const currentMusicLibrary = useRef<YTMusic.Library>();
  const currentMusicLibraryContinuation = useRef<YTMusic.LibraryContinuation>();

  const fetchMusicPlaylists = async () => {
    const library = await youtube?.music?.getLibrary();
    library?.contents && setPlaylists(extractGrid(library.contents[0]));
  };

  const fetchMusicPlaylistContinuation = () => {
    const cont =
      currentMusicLibraryContinuation.current ?? currentMusicLibrary.current;
    cont
      ?.getContinuation()
      .then(contData => {
        currentMusicLibraryContinuation.current = contData;
        setPlaylists([
          ...playlists!,
          ...parseObservedArray(contData.contents.contents!),
        ]);
      })
      .then(LOGGER.warn);
  };

  const fetchPlaylists = async () => {
    const response = await youtube?.getPlaylists();

    LOGGER.debug("PLAYLISTS: ", JSON.stringify(response?.playlists, null, 2));

    response && setPlaylists(parseObservedArray(response.playlists));
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
    await youtube?.playlist?.addVideos(playlistId, videoIds);
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
    await youtube?.playlist?.addToLibrary(playlistId);
  };

  const removePlaylistFromLibrary = async (playlistId: string) => {
    LOGGER.debug(`Removing playlist ${playlistId} to library`);
    await youtube?.playlist?.removeFromLibrary(playlistId);
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
    fetchPlaylists: fetchMusicPlaylists,
    fetchMorePlaylists: fetchMusicPlaylistContinuation,
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
