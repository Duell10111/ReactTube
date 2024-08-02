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

import {
  ElementData,
  VideoData,
  YTPlaylist,
  YTVideoInfo,
} from "../extraction/Types";
import useVideoDataGenerator from "../hooks/music/useVideoDataGenerator";
import Logger from "../utils/Logger";
import {Innertube, YTNodes} from "../utils/Youtube";

type PlayType = "Audio" | "Video";

interface MusicPlayerContextType {
  addPlaylist: (playlist: YTPlaylist) => void;
  setCurrentItem: (item: VideoData) => void;
  setPlaylistViaEndpoint: (endpoint: YTNodes.NavigationEndpoint) => void;
  currentItem?: YTVideoInfo;
  playlist: ElementData[];
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
}

const events = [
  Event.PlaybackState,
  Event.PlaybackError,
  Event.PlaybackActiveTrackChanged,
  Event.PlaybackProgressUpdated,
];

const LOGGER = Logger.extend("MUSIC_CTX");

// @ts-ignore
const MusicPlayerCtx = createContext<MusicPlayerContextType>({});

interface MusicPlayerProviderProps {
  children?: React.ReactNode;
}

export function MusicPlayerContext({children}: MusicPlayerProviderProps) {
  const {videoExtractor, videoExtractorNavigationEndpoint} =
    useVideoDataGenerator();

  const [playType, setPlayType] = useState<PlayType>("Audio");
  const [playing, setPlaying] = useState(false);
  const duration = useSharedValue(0);
  const currentTime = useSharedValue(0);
  const playlist = useRef<VideoData[]>([]);
  const [currentVideoData, setCurrentVideoData] = useState<YTVideoInfo>();

  useTrackPlayerEvents(events, event => {
    if (event.type === Event.PlaybackError) {
      console.warn("An error occured while playing the current track.");
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
      LOGGER.debug("CurrentTime: ", event.position);
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
      ],
    }).catch(LOGGER.warn);
  }, []);

  useEffect(() => {
    if (playType === "Audio" && currentVideoData) {
      TrackPlayer.load(videoInfoToTrack(currentVideoData)).then(() => {
        TrackPlayer.play().catch(LOGGER.warn);
      });
    }
    duration.value = currentVideoData?.durationSeconds ?? 0;
  }, [currentVideoData]);

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
    if (currentVideoData?.playlist) {
      console.log(
        "Playlist",
        currentVideoData.playlist.content.map(v => v.title),
      );
      const newIndex = currentVideoData.playlist.current_index + 1;
      console.log(`Switching to newIndex: ${newIndex}`);
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
      console.log(`Switching to newIndex: ${newIndex}`);
      const nextElement = currentVideoData.playlist.content[newIndex];
      if (nextElement.type === "video") {
        videoExtractor(nextElement).then(setCurrentVideoData);
      }
    }
  };

  const next = async () => {
    if (currentVideoData?.playlist) {
      console.log(
        "Playlist",
        currentVideoData.playlist.content.map(v => v.title),
      );
      const newIndex = currentVideoData.playlist.current_index + 1;
      console.log(`Switching to newIndex: ${newIndex}`);
      const nextElement = currentVideoData.playlist.content[newIndex];
      if (nextElement.type === "video") {
        videoExtractor(nextElement).then(setCurrentVideoData);
      }
    }
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
        playlist: currentVideoData?.playlist?.content ?? [],
        playing,
        play,
        pause,
        previous,
        next,
        seek,
        callbacks: {
          onEndReached,
        },
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

function videoInfoToTrack(vidoeInfo: YTVideoInfo) {
  return {
    url: vidoeInfo.originalData.streaming_data.hls_manifest_url,
    title: vidoeInfo.title,
    artist: vidoeInfo.author?.name,
    artwork: vidoeInfo.thumbnailImage.url,
    type: "hls",
  } as Track;
}
