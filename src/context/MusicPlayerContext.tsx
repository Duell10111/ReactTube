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
  useTrackPlayerEvents,
} from "react-native-track-player";

import useVideoDataGenerator from "../hooks/music/useVideoDataGenerator";
import Logger from "../utils/Logger";
import {Innertube, YTNodes} from "../utils/Youtube";

import {useAppData} from "@/context/AppDataContext";
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

type PlayType = "Audio" | "Video";

interface MusicPlayerContextType {
  addPlaylist: (playlist: YTPlaylist) => void;
  setCurrentItem: (item: VideoData) => void;
  setPlaylistViaEndpoint: (endpoint: YTNodes.NavigationEndpoint) => void;
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

  useEffect(() => {
    // TODO: Only update on first VideoData or check if Up Next contains data?
    if (currentVideoData) {
      currentVideoData.originalData
        .getUpNext()
        .then(p => {
          setPlaylist(parseTrackInfoPlaylist(p));
          playlistContinuation.current = undefined;
        })
        .catch(() => LOGGER.debug("No new Track Playlist available"));
    }
  }, [currentVideoData]);

  const fetchMorePlaylistData = () => {
    if (currentVideoData && playlist) {
      currentVideoData.originalData
        .getUpNextContinuation(
          playlistContinuation.current?.originalData ?? playlist.originalData,
        )
        .then(continuation => {
          const parsedData = parseTrackInfoPlaylistContinuation(continuation);
          setPlaylist({
            ...playlist,
            items: [...playlist.items, ...parsedData.items],
          });
          playlistContinuation.current = parsedData;
        })
        .catch(LOGGER.warn);
    }
  };

  useEffect(() => {
    if (appSettings.trackingEnabled && currentVideoData) {
      currentVideoData.originalData.addToWatchHistory().catch(LOGGER.warn);
    }
  }, [currentVideoData, appSettings.trackingEnabled]);

  const addPlaylist = (p: YTPlaylist) => {
    const data = p.items.filter(v => v.type === "video") as VideoData[];
    // playlist.current.push(data);
    // TrackPlayer.TrackPlayer.add({});
  };

  const setCurrentPlaylist = (videoData: VideoData) => {
    videoExtractor(videoData).then(setCurrentVideoData).catch(LOGGER.warn);
  };

  const setPlaylistViaEndpoint = (endpoint: YTNodes.NavigationEndpoint) => {
    videoExtractorNavigationEndpoint(endpoint)
      .then(setCurrentVideoData)
      .catch(LOGGER.warn);
  };

  const onEndReached = () => {
    if (playlist) {
      const currentIndex = playlist.items.findIndex(
        v => v.id === currentVideoData.id,
      );
      if (currentIndex >= 0) {
        const newIndex = currentIndex + 1;
        LOGGER.debug(`Switching to newIndex: ${newIndex}`);
        if (newIndex > playlist.items.length) {
          // Fetch next playlist items?
        }
        const nextElement = playlist.items[newIndex];
        videoExtractor(nextElement).then(setCurrentVideoData);
      }
    }
    if (currentVideoData?.playlist) {
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
    if (
      currentVideoData?.playlist &&
      currentVideoData.playlist.current_index > 0
    ) {
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

  const next = async () => {
    onEndReached();
  };

  return (
    <MusicPlayerCtx.Provider
      value={{
        addPlaylist,
        currentItem: currentVideoData,
        setCurrentItem: setCurrentPlaylist,
        setPlaylistViaEndpoint,
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
        fetchMorePlaylistData,
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
