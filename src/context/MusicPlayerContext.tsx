import React, {
  createContext,
  useCallback,
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
import {YTNodes} from "../utils/Youtube";

import {useAppData} from "@/context/AppDataContext";
import {useYoutubeContext} from "@/context/YoutubeContext";
import {getUpNextForVideoWithPlaylist} from "@/downloader/DBData";
import {findVideo} from "@/downloader/DownloadDatabaseOperations";
import {Video} from "@/downloader/schema";
import {
  VideoData,
  YTPlaylistPanel,
  YTPlaylistPanelContinuation,
  YTPlaylistPanelItem,
  YTTrackInfo,
} from "@/extraction/Types";
import {
  parseTrackInfoPlaylist,
  parseTrackInfoPlaylistContinuation,
} from "@/extraction/YTElements";
import {getAbsoluteVideoURL} from "@/hooks/downloader/useDownloadProcessor";

type PlayType = "Audio" | "Video";

interface MusicPlayerContextType {
  setCurrentItem: (
    item: VideoData,
    upNextUpdate?: boolean,
    addToUpNext?: boolean,
  ) => void;
  setPlaylistViaEndpoint: (
    endpoint: YTNodes.NavigationEndpoint,
    upNextUpdate?: boolean,
  ) => void;
  setPlaylistViaLocalDownload: (id: string) => void;
  currentItem?: YTTrackInfo;
  playlist?: YTPlaylistPanel;
  // Automix
  automix: boolean;
  setAutomix: (automix: boolean) => void;
  automixPlaylist?: YTPlaylistPanel;
  // Play Functions
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
  fetchMoreAutomixPlaylistData: () => void;
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
  const youtube = useYoutubeContext();

  // Currently only support audio play type
  const [playType, setPlayType] = useState<PlayType>("Audio");
  const [playing, setPlaying] = useState(false);
  const duration = useSharedValue(0);
  const currentTime = useSharedValue(0);
  const [playlist, setPlaylist] = useState<YTPlaylistPanel>();
  const playlistContinuation = useRef<YTPlaylistPanelContinuation>();
  const [currentVideoData, setCurrentVideoData] = useState<YTTrackInfo>();

  // Automix data
  const [automix, setAutomix] = useState(false);
  const [automixPlaylist, setAutomixPlaylist] = useState<YTPlaylistPanel>();
  const automixPlaylistContinuation = useRef<YTPlaylistPanelContinuation>();

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

      // if (
      //   currentVideoData?.durationSeconds &&
      //   currentVideoData.durationSeconds > event.position
      // ) {
      //   LOGGER.debug("Music Track end reached! Triggering onEndReached!");
      //   onEndReached();
      // }
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
      // console.log("Current video Data: ", currentVideoData);
      TrackPlayer.load(videoInfoToTrack(currentVideoData)).then(() => {
        TrackPlayer.play().catch(LOGGER.warn);
      });
    }
    duration.value = currentVideoData?.durationSeconds ?? 0;
  }, [currentVideoData]);

  useEffect(() => {
    if (automix && currentVideoData) {
      fetchUpNextAutomixPlaylist(currentVideoData);
    }
  }, [automix]);

  useEffect(() => {
    // Fetch continuation for Automix Playlist if less than 8 contained
    if (automix && automixPlaylist && automixPlaylist?.items.length < 8) {
      fetchMoreUpNextAutomixPlaylist().catch(LOGGER.warn);
    }
  }, [automix, automixPlaylist]);

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
      // Filter out already existing data in queue, as it continues sometimes start at current playing item causing duplicate issues
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

  const fetchUpNextAutomixPlaylist = (curVideoData: YTTrackInfo) => {
    // TODO: Add proper local type indicator
    // @ts-ignore SHOW ABOVE
    (curVideoData.originalData?.type &&
    // @ts-ignore SHOW ABOVE
    curVideoData.originalData.type === "Local" &&
    youtube?.music
      ? youtube.music.getUpNext(curVideoData.id, true)
      : curVideoData.originalData.getUpNext(true)
    )
      .then(p => {
        const parsedData = parseTrackInfoPlaylist(p);

        // Filter out already existing data in queue, as it continues sometimes start at current playing item causing duplicate issues
        // Skip the first element as this is normally the one already in the normal up next playlist
        const filteredItems = parsedData.items.splice(1).filter(item => {
          if (playlist) {
            return playlist.items.findIndex(i => i.id === item.id) === -1;
          }
          // Do not include current video in automix playlist to probit duplicate of "normal" up-next playlist
          return item.id !== curVideoData.id;
        });

        setAutomixPlaylist({
          ...parsedData,
          items: filteredItems,
        });
        automixPlaylistContinuation.current = undefined;
      })
      .catch(error =>
        LOGGER.debug(
          `No new Automix Track Playlist available. Error: ${error}`,
        ),
      );
  };

  const fetchMoreUpNextAutomixPlaylist = async () => {
    if (currentVideoData && automixPlaylist) {
      LOGGER.debug("Fetching up next auto playlist");
      const continuation =
        await currentVideoData.originalData.getUpNextContinuation(
          automixPlaylistContinuation.current?.originalData ??
            automixPlaylist.originalData,
        );

      const parsedData = parseTrackInfoPlaylistContinuation(continuation);
      // Filter out already existing data in queue, as it continues sometimes start at current playing item causing duplicate issues
      const newItems = parsedData.items.filter(item => {
        return (
          automixPlaylist.items.findIndex(i => i.id === item.id) === -1 &&
          (!playlist || playlist.items.findIndex(i => i.id === item.id) === -1)
        );
      });

      setAutomixPlaylist({
        ...automixPlaylist,
        items: [...automixPlaylist.items, ...newItems],
      });
      automixPlaylistContinuation.current = parsedData;
      return parsedData;
    }
  };

  useEffect(() => {
    if (appSettings.trackingEnabled && currentVideoData) {
      currentVideoData.originalData.addToWatchHistory().catch(LOGGER.warn);
    }
  }, [currentVideoData, appSettings.trackingEnabled]);

  const setCurrentPlaylist = (
    videoData: VideoData,
    upNextUpdate = true,
    addToUpNext = false,
  ) => {
    videoExtractor(videoData)
      .then(curVideoData => {
        setCurrentVideoData(curVideoData);
        if (upNextUpdate) {
          fetchUpNextPlaylist(curVideoData);
          automix && fetchUpNextAutomixPlaylist(curVideoData);
        } else if (addToUpNext && playlist) {
          const playlistItem: YTPlaylistPanelItem = {
            ...videoData,
            selected: false,
          };
          setPlaylist(prevState => {
            // Fallback for typechecks
            if (!prevState) {
              return undefined;
            }
            return {
              ...prevState,
              items: [...prevState?.items, playlistItem],
            };
          });

          // Update Automix Playlist to remove selected item
          setAutomixPlaylist(prevState => {
            // Skip if automix not fetched
            if (!prevState) {
              return undefined;
            }
            return {
              ...prevState,
              items: [...prevState.items.filter(i => i.id !== playlistItem.id)],
            };
          });
        }
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
          automix && fetchUpNextAutomixPlaylist(curVideoData);
        }
      })
      .catch(LOGGER.warn);
  };

  // TODO: Depreacted? as now done via setCurrentPlaylist
  const setPlaylistViaLocalDownload = async (id: string) => {
    const localVideos = await findVideo(id);

    if (localVideos) {
      // TODO: set currentVideoData?

      const track = localVideoToTrack(localVideos);
      LOGGER.warn(track);
      TrackPlayer.load(track)
        .then(() => {
          TrackPlayer.play().catch(LOGGER.warn);
        })
        .catch(LOGGER.warn);
    }
  };

  // TODO: Maybe use useCallback to trigger update on automixPlaylist change?
  const onEndReached = useCallback(async () => {
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
          } else if (automix && automixPlaylist) {
            // Set first Automix item as next item
            setCurrentPlaylist(automixPlaylist.items[0], false, true);
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
    }

    // // Only needed for local playlist files
    // TrackPlayer.pause().catch(LOGGER.warn);
  }, [currentVideoData, playlist, automixPlaylist, automix]);

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
          contData &&
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
        fetchMoreAutomixPlaylistData: fetchMoreUpNextAutomixPlaylist,
        automix,
        setAutomix,
        automixPlaylist,
      }}>
      {children}
    </MusicPlayerCtx.Provider>
  );
}

export function useMusikPlayerContext() {
  return useContext(MusicPlayerCtx);
}

function videoInfoToTrack(videoInfo: YTTrackInfo) {
  return {
    id: videoInfo.id, // Set id for later find in queue
    // TODO: fix
    url: videoInfo.originalData.streaming_data?.hls_manifest_url,
    title: videoInfo.title,
    artist: videoInfo.author?.name,
    artwork: videoInfo.thumbnailImage.url,
    type: "hls",
  } as Track;
}

function localVideoToTrack(video: Video) {
  return {
    id: video.id,
    // @ts-ignore TODO: fix
    url: getAbsoluteVideoURL(video.fileUrl),
    title: video.name,
    type: TrackType.Default,
    endTime: video.duration,
  } as Track;
}
