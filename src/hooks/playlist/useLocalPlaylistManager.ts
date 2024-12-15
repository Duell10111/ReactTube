// TODO: Save Playlists in local database

import {useMemo} from "react";
import Crypto from "react-native-quick-crypto";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {usePlaylistsAsElementData} from "@/downloader/DBData";
import {
  insertVideosIntoPlaylist,
  removeVideosIntoPlaylist,
  usePlaylists,
  createPlaylist as createPlaylistDB,
  findVideo,
  insertVideo,
} from "@/downloader/DownloadDatabaseOperations";
import {Playlist} from "@/downloader/schema";
import {ElementData} from "@/extraction/Types";
import {
  getElementDataFromTrackInfo,
  getElementDataFromVideoInfo,
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
          const info = await youtube.music.getInfo(videoId);
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

  return {
    fetchPlaylists: fetchMusicPlaylists,
    fetchMorePlaylists: fetchMusicPlaylistContinuation,
    playlists,
    createPlaylist,
    saveVideoToPlaylist,
    removeVideoFromPlaylist,
  };
}
