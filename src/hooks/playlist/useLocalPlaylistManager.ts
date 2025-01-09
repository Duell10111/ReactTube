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
import useDownloadProcessor from "@/hooks/downloader/useDownloadProcessor";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYLIST_MANAGER");

export default function useLocalPlaylistManager() {
  const youtube = useYoutubeContext();
  const {downloadPlaylistCover} = useDownloadProcessor();
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
            // @ts-ignore TODO: Fix to get duration somehow as needed for downloads?
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

    await createPlaylistDB(
      localPlaylistId,
      ytData.title,
      undefined,
      undefined,
      undefined,
    );

    await Promise.all(
      ytData.items.map(async item => {
        if (item.type === "video" && (await findVideo(item.id)) === undefined) {
          console.log("Creating video: ", item.id);
          await insertVideo(
            item.id,
            item.title,
            item.durationSeconds ?? 0,
            item.thumbnailImage.url,
            undefined,
            localPlaylistId,
            item.author?.name,
          );
        } else {
          console.log("Updating video: ", item.id);
          await insertVideo(
            item.id,
            item.title,
            undefined, // Do not update existing data if undefined specified
            item.thumbnailImage.url,
            undefined,
            localPlaylistId,
            item.author?.name,
          );
        }

        LOGGER.debug(`Adding video ${item.id} to playlist ${playlistId}`);
        await insertVideosIntoPlaylist(localPlaylistId, [item.id]);
      }),
    );
    LOGGER.debug("Added playlist!");

    try {
      await downloadPlaylistCover(localPlaylistId, {
        title: ytData.title,
        coverUrl: ytData.thumbnailImage.url,
      });
    } catch (e) {
      LOGGER.error("Error downloading playlist cover: ", e);
    }
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
