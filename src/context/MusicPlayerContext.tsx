import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {SharedValue, useSharedValue} from "react-native-reanimated";
import TrackPlayer, {
  Capability,
  Event,
  Track,
  TrackType,
  useTrackPlayerEvents,
} from "react-native-track-player";

import useVideoDataGenerator from "../hooks/music/useVideoDataGenerator";
import Logger from "../utils/Logger";
import {Innertube, YTNodes} from "../utils/Youtube";

import {useAppData} from "@/context/AppDataContext";
import {getUpNextForVideoWithPlaylist} from "@/downloader/DBData";
import {findVideo} from "@/downloader/DownloadDatabaseOperations";
import {Video} from "@/downloader/schema";
import {
  VideoData,
  YTPlaylist,
  YTPlaylistPanel,
  YTPlaylistPanelContinuation,
  YTTrackInfo,
} from "@/extraction/Types";
import {
  parseTrackInfoPlaylist,
  parseTrackInfoPlaylistContinuation,
} from "@/extraction/YTElements";
import {getAbsoluteVideoURL} from "@/hooks/downloader/useDownloadProcessor";

type PlayType = "Audio" | "Video";

interface MusicPlayerContextType {
  addPlaylist: (playlist: YTPlaylist) => void;
  setCurrentItem: (item: VideoData) => void;
  setPlaylistViaEndpoint: (
    endpoint: YTNodes.NavigationEndpoint,
    upNextUpdate?: boolean,
  ) => void;
  setPlaylistViaLocalDownload: (id: string) => void;
  currentItem?: YTTrackInfo;
  playlist?: YTPlaylistPanel;
  currentTime: SharedValue<number>;
  duration: SharedValue<number>;
  playing: boolean;
  play: () => void;
  pause: () => void;
  previous: () => Promise<void>;
  next: () => Promise<void>;
  seek: (seconds: number) => void;
  callbacks: {
    onProgress: (durationSeconds: number) => void;
    onEndReached: () => void;
  };
  fetchMorePlaylistData: () => void;
}

const events = [
  Event.PlaybackState,
  Event.PlaybackError,
  Event.PlaybackActiveTrackChanged,
  Event.PlaybackProgressUpdated,
  Event.RemoteNext,
  Event.RemotePrevious,
];

const LOGGER = Logger.extend("MUSIC_CTX");

// @ts-ignore
const MusicPlayerCtx = createContext<MusicPlayerContextType>({});

interface MusicPlayerProviderProps {
  children?: React.ReactNode;
}

export function MusicPlayerContext({children}: MusicPlayerProviderProps) {
  const {appSettings} = useAppData();
  const {videoExtractor, videoExtractorNavigationEndpoint} =
    useVideoDataGenerator();

  // Currently only support audio play type
  const [playType, setPlayType] = useState<PlayType>("Audio");
  const [playing, setPlaying] = useState(false);
  const duration = useSharedValue(0);
  const currentTime = useSharedValue(0);
  const [playlist, setPlaylist] = useState<YTPlaylistPanel>();
  const playlistContinuation = useRef<YTPlaylistPanelContinuation>();
  const [currentVideoData, setCurrentVideoData] = useState<YTTrackInfo>();

  useTrackPlayerEvents(events, event => {
    if (event.type === Event.PlaybackError) {
      console.warn("An error occurred while playing the current track.");
    }
    if (event.type === Event.PlaybackState) {
      if (event.state === "playing") {
        setPlaying(true);
      } else {
        setPlaying(false);
      }

      if (event.state === "ended") {
        onEndReached();
      }
    }
    if (event.type === Event.PlaybackActiveTrackChanged) {
      LOGGER.debug("Music Track Changed: ", event);
      if (!event.track) {
        onEndReached();
      }
    }
    if (event.type === Event.PlaybackProgressUpdated) {
      duration.value = event.duration;
      currentTime.value = event.position;
      // LOGGER.debug("CurrentTime: ", event.position);
    }

    if (event.type === Event.RemotePlay) {
      setPlaying(true);
      TrackPlayer.play().catch(LOGGER.warn);
    }

    if (event.type === Event.RemotePause) {
      setPlaying(false);
      TrackPlayer.pause().catch(LOGGER.warn);
    }

    if (event.type === Event.RemotePrevious) {
      previous().catch(LOGGER.warn);
    }

    if (event.type === Event.RemoteNext) {
      next().catch(LOGGER.warn);
    }
  });

  useEffect(() => {
    TrackPlayer.updateOptions({
      progressUpdateEventInterval: 1,
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
    }).catch(LOGGER.warn);
  }, []);

  useEffect(() => {
    if (playType === "Audio" && currentVideoData) {
      console.log("Current video Data: ", currentVideoData);
      TrackPlayer.load(videoInfoToTrack(currentVideoData)).then(() => {
        TrackPlayer.play().catch(LOGGER.warn);
      });
    }
    duration.value = currentVideoData?.durationSeconds ?? 0;
  }, [currentVideoData]);

  // useEffect(() => {
  //   // TODO: Only update on first VideoData or check if Up Next contains data?
  //   // if (currentVideoData) {
  //   //   currentVideoData.originalData
  //   //     .getUpNext(false)
  //   //     .then(p => {
  //   //       setPlaylist(parseTrackInfoPlaylist(p));
  //   //       playlistContinuation.current = undefined;
  //   //     })
  //   //     .catch(() => LOGGER.debug("No new Track Playlist available"));
  //   // }
  // }, [currentVideoData]);

  const fetchUpNextPlaylist = (curVideoData: YTTrackInfo) => {
    if (curVideoData.localPlaylistId) {
      LOGGER.debug("Fetching local up next playlist");
      getUpNextForVideoWithPlaylist(
        curVideoData.id,
        curVideoData.localPlaylistId,
      )
        .then(p => {
          LOGGER.debug("UPNEXt Playlist: ", JSON.stringify(p));
          setPlaylist(p);
          playlistContinuation.current = undefined;
        })
        .catch(error =>
          LOGGER.debug(`Error fetching local playlist: ${error}`),
        );
    } else {
      LOGGER.debug("Fetching up next playlist: ", curVideoData.title);
      curVideoData.originalData
        .getUpNext(false) // TODO: Add flag on Context to allow automix?
        .then(p => {
          setPlaylist(parseTrackInfoPlaylist(p));
          playlistContinuation.current = undefined;
        })
        .catch(() => LOGGER.debug("No new Track Playlist available"));
    }
  };

  const fetchMorePlaylistData = async () => {
    // TODO: Check for local
    if (playlist?.localPlaylist) {
      LOGGER.debug("Skipping fetch more for local playlist");
      return;
    }

    if (currentVideoData && playlist) {
      const continuation =
        await currentVideoData.originalData.getUpNextContinuation(
          playlistContinuation.current?.originalData ?? playlist.originalData,
        );

      const parsedData = parseTrackInfoPlaylistContinuation(continuation);
      // Filter out already existing data in queue, as it continue sometimes start at current playing item causing duplicate issues
      const newItems = parsedData.items.filter(item => {
        return playlist.items.findIndex(i => i.id === item.id) === -1;
      });

      setPlaylist({
        ...playlist,
        items: [...playlist.items, ...newItems],
      });
      playlistContinuation.current = parsedData;
      return parsedData;
    }
  };

  const fetchPlaylistDataWrapper = () => {
    fetchMorePlaylistData().catch(LOGGER.warn);
  };

  useEffect(() => {
    if (appSettings.trackingEnabled && currentVideoData) {
      currentVideoData.originalData.addToWatchHistory().catch(LOGGER.warn);
    }
  }, [currentVideoData, appSettings.trackingEnabled]);

  // TODO: Remove?!
  const addPlaylist = (p: YTPlaylist) => {
    const data = p.items.filter(v => v.type === "video") as VideoData[];
    // playlist.current.push(data);
    // TrackPlayer.TrackPlayer.add({});
  };

  const setCurrentPlaylist = (videoData: VideoData) => {
    videoExtractor(videoData)
      .then(curVideoData => {
        setCurrentVideoData(curVideoData);
        fetchUpNextPlaylist(curVideoData);
      })
      .catch(LOGGER.warn);
  };

  const setPlaylistViaEndpoint = (
    endpoint: YTNodes.NavigationEndpoint,
    upNextUpdate = true,
  ) => {
    videoExtractorNavigationEndpoint(endpoint)
      .then(curVideoData => {
        setCurrentVideoData(curVideoData);
        if (upNextUpdate) {
          fetchUpNextPlaylist(curVideoData);
        }
      })
      .catch(LOGGER.warn);
  };

  const setPlaylistViaLocalDownload = async (id: string) => {
    const localVideos = await findVideo(id);

    if (localVideos) {
      const track = localVideoToTrack(localVideos);
      LOGGER.warn(track);
      TrackPlayer.load(track)
        .then(() => {
          TrackPlayer.play().catch(LOGGER.warn);
        })
        .catch(LOGGER.warn);
    }
  };

  const onEndReached = async () => {
    if (playlist) {
      const currentIndex = playlist.items.findIndex(
        v => v.id === currentVideoData?.id,
      );
      if (currentIndex >= 0) {
        const newIndex = currentIndex + 1;
        LOGGER.debug(`Switching to newIndex: ${newIndex}`);
        if (newIndex >= playlist.items.length) {
          // Fetch next playlist items?
          const contData = await fetchMorePlaylistData();
          if (contData) {
            videoExtractor(contData.items[0]).then(setCurrentVideoData);
          } else {
            LOGGER.warn(
              "Fetching playlist continuation failed. Skipping setting next song!",
            );
          }
        } else {
          const nextElement = playlist.items[newIndex];
          videoExtractor(nextElement).then(setCurrentVideoData);
        }
      }
    } else if (currentVideoData?.playlist) {
      // TODO: Remove as not needed anymore?
      console.log(
        "Playlist",
        currentVideoData.playlist.content.map(v => v.title),
      );
      const newIndex = currentVideoData.playlist.current_index + 1;
      LOGGER.debug(`Switching to newIndex: ${newIndex}`);
      const nextElement = currentVideoData.playlist.content[newIndex];
      if (nextElement.type === "video") {
        videoExtractor(nextElement).then(setCurrentVideoData);
      }
    }
  };

  const play = async () => {
    if (playType === "Audio") {
      await TrackPlayer.play();
    }
  };

  const pause = async () => {
    if (playType === "Audio") {
      await TrackPlayer.pause();
    }
  };

  const seek = async (seconds: number) => {
    if (playType === "Audio") {
      await TrackPlayer.seekTo(seconds);
    }
  };

  const previous = async () => {
    if (playlist) {
      const currentIndex = playlist.items.findIndex(
        v => v.id === currentVideoData?.id,
      );
      if (currentIndex > 0) {
        const newIndex = currentIndex - 1;
        LOGGER.debug(`Switching to newIndex: ${newIndex}`);
        if (newIndex >= playlist.items.length) {
          // Fetch next playlist items?
          const contData = await fetchMorePlaylistData();
          videoExtractor(contData.items[0]).then(setCurrentVideoData);
        } else {
          const nextElement = playlist.items[newIndex];
          videoExtractor(nextElement).then(setCurrentVideoData);
        }
      }
    } else if (
      currentVideoData?.playlist &&
      currentVideoData.playlist.current_index > 0
    ) {
      // TODO: Remove as not needed anymore?
      console.log(
        "Playlist",
        currentVideoData.playlist.content.map(v => v.title),
      );
      const newIndex = currentVideoData.playlist.current_index - 1;
      LOGGER.debug(`Switching to newIndex: ${newIndex}`);
      const nextElement = currentVideoData.playlist.content[newIndex];
      if (nextElement.type === "video") {
        videoExtractor(nextElement).then(setCurrentVideoData);
      }
    }
  };

  const next = () => {
    return onEndReached();
  };

  return (
    <MusicPlayerCtx.Provider
      value={{
        addPlaylist,
        currentItem: currentVideoData,
        setCurrentItem: setCurrentPlaylist,
        setPlaylistViaEndpoint,
        setPlaylistViaLocalDownload,
        duration,
        currentTime,
        playlist,
        playing,
        play,
        pause,
        previous,
        next,
        seek,
        // @ts-ignore
        callbacks: {
          onEndReached,
        },
        fetchMorePlaylistData: fetchPlaylistDataWrapper,
      }}>
      {children}
    </MusicPlayerCtx.Provider>
  );
}

export class MusicData {
  constructor(videoData: VideoData, youtube: Innertube) {}
}

export function useMusikPlayerContext() {
  return useContext(MusicPlayerCtx);
}

function videoInfoToTrack(videoInfo: YTTrackInfo) {
  return {
    id: videoInfo.id, // Set id for later find in queue
    url: videoInfo.originalData.streaming_data.hls_manifest_url,
    title: videoInfo.title,
    artist: videoInfo.author?.name,
    artwork: videoInfo.thumbnailImage.url,
    type: "hls",
  } as Track;
}

function localVideoToTrack(video: Video) {
  return {
    id: video.id,
    url: getAbsoluteVideoURL(video.fileUrl),
    title: video.name,
    type: TrackType.Default,
  } as Track;
}
