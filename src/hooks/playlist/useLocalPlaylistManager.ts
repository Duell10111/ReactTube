// TODO: Save Playlists in local database

import Crypto from "react-native-quick-crypto";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {usePlaylistsAsElementData} from "@/downloader/DBData";
import {
  insertVideosIntoPlaylist,
  removeVideosIntoPlaylist,
  createPlaylist as createPlaylistDB,
  findVideo,
  insertVideo,
  deletePlaylist,
} from "@/downloader/DownloadDatabaseOperations";
import {
  getElementDataFromTrackInfo,
  getElementDataFromYTPlaylist,
} from "@/extraction/YTElements";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYLIST_MANAGER");

export default function useLocalPlaylistManager() {
  const youtube = useYoutubeContext();
  // const [playlists, setPlaylists] = useState<ElementData[]>();

  const playlists = usePlaylistsAsElementData();

  const fetchMusicPlaylists = async () => {};

  const fetchMusicPlaylistContinuation = () => {};

  const createPlaylist = async (name: string, videoIds: string[]) => {
    const id = `LC-${Crypto.randomUUID()}`;
    await createPlaylistDB(id, name);
    if (videoIds.length > 0) {
      await insertVideosIntoPlaylist(id, videoIds);
    }
  };

  const saveVideoToPlaylist = async (
    videoIds: string[],
    playlistId: string,
  ) => {
    // TODO: Check if already added?
    await Promise.all(
      videoIds.map(async videoId => {
        console.log("Processing ", videoId);
        if ((await findVideo(videoId)) === undefined) {
          console.log("Creating: ", videoId);
          const info = await youtube!.music.getInfo(videoId);
          const ytInfo = getElementDataFromTrackInfo(info);
          console.log(ytInfo.author);
          await insertVideo(
            videoId,
            ytInfo.title,
            ytInfo.durationSeconds,
            ytInfo.thumbnailImage.url,
            undefined,
            playlistId,
            ytInfo.author?.name,
          );
        }
      }),
    );

    LOGGER.debug(`Adding videos ${videoIds} to playlist ${playlistId}`);
    await insertVideosIntoPlaylist(playlistId, videoIds);
  };

  const removeVideoFromPlaylist = async (
    videoIds: string[],
    playlistId: string,
  ) => {
    LOGGER.debug(`Removing videos ${videoIds} to playlist ${playlistId}`);
    await removeVideosIntoPlaylist(playlistId, videoIds);
  };

  const addPlaylistToLibrary = async (playlistId: string) => {
    LOGGER.debug(`Adding playlist ${playlistId} to library`);
    const localPlaylistId = `LC-R-${playlistId}`;

    const playlist = await youtube!.getPlaylist(playlistId);

    const ytData = getElementDataFromYTPlaylist(playlist);

    // TODO: Download image as remote one gets invalid after some time

    await createPlaylistDB(
      localPlaylistId,
      ytData.title,
      undefined,
      ytData.thumbnailImage?.url,
      undefined,
    );

    const ids = ytData.items.map(item => item.id);
    await saveVideoToPlaylist(ids, localPlaylistId);
    LOGGER.debug("Added playlist!");
  };

  const removePlaylistFromLibrary = async (playlistId: string) => {
    LOGGER.debug(`Removing playlist ${playlistId} to library`);
    // TODO: Check if playlist is not downloaded?
    return deletePlaylist(playlistId);
  };

  // TODO: Move handlers to save a playlist here

  return {
    fetchPlaylists: fetchMusicPlaylists,
    fetchMorePlaylists: fetchMusicPlaylistContinuation,
    playlists,
    createPlaylist,
    saveVideoToPlaylist,
    removeVideoFromPlaylist,
    addPlaylistToLibrary,
    removePlaylistFromLibrary,
  };
}
