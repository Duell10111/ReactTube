import TrackPlayer, {
  Event,
  PlaybackState,
  useIsPlaying,
  useProgress,
} from "@rntp/player";
import _ from "lodash";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {SharedValue, useSharedValue} from "react-native-reanimated";

import useVideoDataGenerator from "../hooks/music/useVideoDataGenerator";
import Logger from "../utils/Logger";
import {YTNodes} from "../utils/Youtube";

import {useAppData} from "@/context/AppDataContext";
import {useYoutubeContext} from "@/context/YoutubeContext";
import {
  getTrackInfoForVideo,
  getUpNextForVideoWithPlaylist,
} from "@/downloader/DBData";
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
import {showMessage} from "@/utils/ShowFlashMessageHelper";
import {
  audioSourceToMediaItem,
  resolveAudioStreamingSource,
} from "@/utils/music/AudioPlaybackSource";

export type RepeatOption = "RepeatOne" | "RepeatAll";

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
  // Player options
  shuffle: boolean;
  setShuffle: (shuffle: boolean) => void;
  repeat?: RepeatOption;
  setRepeat: (repeat: RepeatOption | undefined) => void;
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
  addAsNextItem: (item: VideoData) => void;
}

const LOGGER = Logger.extend("MUSIC_CTX");

// @ts-ignore
const MusicPlayerCtx = createContext<MusicPlayerContextType>({});

interface MusicPlayerProviderProps {
  children?: React.ReactNode;
}

interface MusicPlayerProgressBridgeProps {
  activeTrack: React.RefObject<YTTrackInfo | undefined>;
  currentTime: SharedValue<number>;
  duration: SharedValue<number>;
}

/**
 * Keeps RNTP's React-state polling local to this otherwise invisible leaf.
 * Only the Reanimated values escape, so progress updates do not re-render the
 * provider and every consumer of MusicPlayerCtx.
 */
function MusicPlayerProgressBridge({
  activeTrack,
  currentTime,
  duration,
}: MusicPlayerProgressBridgeProps) {
  const progress = useProgress(0.25);

  useEffect(() => {
    currentTime.value = progress.position;
    duration.value =
      progress.duration || activeTrack.current?.durationSeconds || 0;
  }, [
    activeTrack,
    currentTime,
    duration,
    progress.duration,
    progress.position,
  ]);

  return null;
}

export function MusicPlayerContext({children}: MusicPlayerProviderProps) {
  const {appSettings} = useAppData();
  const {videoExtractor, videoExtractorNavigationEndpoint} =
    useVideoDataGenerator();
  const youtube = useYoutubeContext();

  const playing = useIsPlaying();
  const duration = useSharedValue(0);
  const currentTime = useSharedValue(0);
  const [playlist, setPlaylist] = useState<YTPlaylistPanel>();
  const playlistContinuation = useRef<YTPlaylistPanelContinuation>(undefined);
  const [currentVideoData, setCurrentVideoData] = useState<YTTrackInfo>();
  const selectionGeneration = useRef(0);
  const playbackGeneration = useRef(0);
  const activeTrack = useRef<YTTrackInfo | undefined>(undefined);
  const playbackIntent = useRef(false);
  const replacementInProgress = useRef(false);
  const retryGeneration = useRef<number | undefined>(undefined);
  const endedGeneration = useRef<number | undefined>(undefined);
  const refreshInFlight = useRef<
    | {
        generation: number;
        promise: Promise<boolean>;
      }
    | undefined
  >(undefined);
  const [sourceExpiresAt, setSourceExpiresAt] = useState<number>();

  const selectResolvedTrack = useCallback(
    async (
      request: Promise<YTTrackInfo>,
      onSelected?: (track: YTTrackInfo) => void,
    ): Promise<YTTrackInfo | undefined> => {
      const generation = ++selectionGeneration.current;

      try {
        const track = await request;
        if (generation !== selectionGeneration.current) {
          LOGGER.debug(`Discarding stale track request for ${track.id}`);
          return undefined;
        }

        setCurrentVideoData(track);
        onSelected?.(track);
        return track;
      } catch (error: any) {
        if (generation !== selectionGeneration.current) {
          return undefined;
        }

        LOGGER.warn(error);
        showMessage({
          type: "warning",
          message: "Error loading song",
          description: String(error?.message ?? error),
        });
        return undefined;
      }
    },
    [],
  );

  // Automix data
  const [automix, setAutomix] = useState(false);
  const [automixPlaylist, setAutomixPlaylist] = useState<YTPlaylistPanel>();
  const automixPlaylistContinuation =
    useRef<YTPlaylistPanelContinuation>(undefined);
  // Player options
  // TODO: Replace with reducer fkt?
  const [shuffle, setShuffle] = useState(false);
  const shuffleBackup = useRef<YTPlaylistPanelItem[]>(undefined);
  const [repeat, setRepeat] = useState<RepeatOption>();
  // TODO: Add repeat all, one in the future here

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

  useEffect(() => {
    setPlaylist(prevState => {
      if (!prevState) {
        return undefined;
      }
      if (shuffle) {
        shuffleBackup.current = prevState.items;
      }
      const currentIndex = prevState.items.findIndex(
        item => item.id === currentVideoData?.id,
      );

      return {
        ...prevState,
        items: shuffle
          ? [
              ...prevState.items.slice(0, currentIndex + 1),
              ..._.shuffle(prevState.items.slice(currentIndex + 1)),
            ]
          : (shuffleBackup.current ?? []),
      };
    });
  }, [shuffle]);

  // Fkt to shuffle Playlist if enabled
  const shuffleUpNextPlaylist = useCallback(
    (p: YTPlaylistPanel, curVideoData: YTTrackInfo) => {
      if (shuffle) {
        // Save current playlist order
        shuffleBackup.current = p.items;

        const currentIndex = p.items.findIndex(
          item => item.id === curVideoData.id,
        );

        return {
          ...p,
          items: [
            ...p.items.slice(0, currentIndex + 1),
            ..._.shuffle(p.items.slice(currentIndex + 1)),
          ],
        };
      } else {
        // Do nothing if no shuffle enabled
        return p;
      }
    },
    [shuffle],
  );

  const fetchUpNextPlaylist = (curVideoData: YTTrackInfo) => {
    // TODO: Add shuffle support by shuffle if enabled beforehand
    if (curVideoData.localPlaylistId) {
      LOGGER.debug("Fetching local up next playlist");
      getUpNextForVideoWithPlaylist(
        curVideoData.id,
        curVideoData.localPlaylistId,
      )
        .then(p => {
          LOGGER.debug("UpNext Playlist: ", JSON.stringify(p));
          setPlaylist(shuffleUpNextPlaylist(p, curVideoData));
          playlistContinuation.current = undefined;
        })
        .catch(error =>
          LOGGER.debug(`Error fetching local playlist: ${error}`),
        );
    } else {
      LOGGER.debug("Fetching up next playlist: ", curVideoData.title);
      const isLocalTrack =
        (curVideoData.originalData as {type?: string}).type === "Local";
      if (isLocalTrack && !youtube?.music) {
        LOGGER.debug("Skipping online up next before YouTube is initialized");
        return;
      }

      const upNextRequest =
        // A downloaded track only carries the local marker, not a TrackInfo
        // instance. Playlist metadata may still be fetched by its YouTube id.
        isLocalTrack
          ? youtube!.music.getUpNext(curVideoData.id, false)
          : curVideoData.originalData.getUpNext(false);

      upNextRequest
        .then(p => {
          setPlaylist(
            shuffleUpNextPlaylist(parseTrackInfoPlaylist(p), curVideoData),
          );
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

      // Add new items to shuffle backup
      if (shuffleBackup.current) {
        shuffleBackup.current = [...shuffleBackup.current, ...newItems];
      }

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
    const isLocalTrack =
      (curVideoData.originalData as {type?: string}).type === "Local";
    if (isLocalTrack && !youtube?.music) {
      LOGGER.debug("Skipping automix before YouTube is initialized");
      return;
    }

    (isLocalTrack
      ? youtube!.music.getUpNext(curVideoData.id, true)
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
      const addToWatchHistory = currentVideoData.originalData.addToWatchHistory;
      if (typeof addToWatchHistory === "function") {
        addToWatchHistory
          .call(currentVideoData.originalData)
          .catch(LOGGER.warn);
      }
    }
  }, [currentVideoData, appSettings.trackingEnabled]);

  const setCurrentPlaylist = (
    videoData: VideoData,
    upNextUpdate = true,
    addToUpNext = false,
  ) => {
    selectResolvedTrack(videoExtractor(videoData), curVideoData => {
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
    }).catch(LOGGER.warn);
  };
  const setPlaylistViaEndpoint = (
    endpoint: YTNodes.NavigationEndpoint,
    upNextUpdate = true,
  ) => {
    selectResolvedTrack(
      videoExtractorNavigationEndpoint(endpoint),
      curVideoData => {
        if (upNextUpdate) {
          fetchUpNextPlaylist(curVideoData);
          automix && fetchUpNextAutomixPlaylist(curVideoData);
        }
      },
    ).catch(LOGGER.warn);
  };

  const setPlaylistViaLocalDownload = async (id: string) => {
    await selectResolvedTrack(
      (async () => {
        const localTrack = await getTrackInfoForVideo(id);
        if (!localTrack?.localFileUrl) {
          throw new Error("Downloaded audio file is not available");
        }

        const resolved = await resolveAudioStreamingSource(youtube, id, {
          localUrl: localTrack.localFileUrl,
        });
        if (!resolved) {
          throw new Error("Downloaded audio source is not playable");
        }

        return {...localTrack, audioSource: resolved.source};
      })(),
    );
  };

  const refreshActiveSource = useCallback(
    (generation: number, reason: "expiry" | "error"): Promise<boolean> => {
      const pending = refreshInFlight.current;
      if (pending?.generation === generation) {
        return pending.promise;
      }

      const promise = (async () => {
        const track = activeTrack.current;
        if (!track?.audioSource) {
          throw new Error("No active audio source to refresh");
        }

        const savedPosition = TrackPlayer.getProgress().position;
        const shouldResume = playbackIntent.current || TrackPlayer.isPlaying();
        replacementInProgress.current = true;

        const resolved = await resolveAudioStreamingSource(youtube, track.id, {
          localUrl:
            track.audioSource.kind === "local"
              ? track.audioSource.url
              : undefined,
        });

        if (
          generation !== playbackGeneration.current ||
          track.id !== activeTrack.current?.id
        ) {
          LOGGER.debug(`Discarding stale ${reason} refresh for ${track.id}`);
          return false;
        }
        if (!resolved) {
          throw new Error("No replacement audio source is available");
        }

        const position = Math.max(
          savedPosition,
          TrackPlayer.getProgress().position,
        );
        const refreshedTrack = {...track, audioSource: resolved.source};
        TrackPlayer.setMediaItem(
          audioSourceToMediaItem(refreshedTrack, resolved.source),
        );
        if (position > 0) {
          TrackPlayer.seekTo(position);
        }
        if (shouldResume) {
          playbackIntent.current = true;
          TrackPlayer.play();
        } else {
          TrackPlayer.pause();
        }

        activeTrack.current = refreshedTrack;
        setSourceExpiresAt(resolved.source.expires?.getTime());
        LOGGER.info(`Refreshed ${reason} audio source for ${track.id}`);
        return true;
      })()
        .catch((error: any) => {
          if (generation !== playbackGeneration.current) {
            return false;
          }

          LOGGER.error(
            `Refreshing ${reason} audio source failed for ${
              activeTrack.current?.id ?? "unknown"
            }: `,
            error,
          );
          showMessage({
            type: "warning",
            message: "Could not reload song",
            description: String(error?.message ?? error),
          });
          return false;
        })
        .finally(() => {
          if (refreshInFlight.current?.promise === promise) {
            refreshInFlight.current = undefined;
            replacementInProgress.current = false;
          }
        });

      refreshInFlight.current = {generation, promise};
      return promise;
    },
    [youtube],
  );

  useEffect(() => {
    const generation = ++playbackGeneration.current;
    retryGeneration.current = undefined;
    endedGeneration.current = undefined;
    refreshInFlight.current = undefined;
    replacementInProgress.current = false;
    setSourceExpiresAt(undefined);

    if (!currentVideoData) {
      activeTrack.current = undefined;
      return;
    }

    activeTrack.current = currentVideoData;
    currentTime.value = 0;
    duration.value = currentVideoData.durationSeconds ?? 0;

    if (!currentVideoData.audioSource) {
      LOGGER.error(`Track ${currentVideoData.id} has no playable audio source`);
      showMessage({
        type: "warning",
        message: "Song cannot be played",
        description: "No playable audio source is available.",
      });
      return;
    }

    try {
      TrackPlayer.setMediaItem(
        audioSourceToMediaItem(currentVideoData, currentVideoData.audioSource),
      );
      if (generation !== playbackGeneration.current) {
        return;
      }

      setSourceExpiresAt(currentVideoData.audioSource.expires?.getTime());
      playbackIntent.current = true;
      TrackPlayer.play();
    } catch (error: any) {
      LOGGER.error(`Loading track ${currentVideoData.id} failed: `, error);
      showMessage({
        type: "warning",
        message: "Error loading song",
        description: String(error?.message ?? error),
      });
    }
  }, [currentTime, currentVideoData, duration]);

  useEffect(() => {
    if (!sourceExpiresAt) {
      return;
    }

    const generation = playbackGeneration.current;
    const delay = Math.max(0, sourceExpiresAt - Date.now() - 60_000);
    const timer = setTimeout(() => {
      refreshActiveSource(generation, "expiry").catch(LOGGER.warn);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentVideoData?.id, refreshActiveSource, sourceExpiresAt]);

  useEffect(() => {
    return () => {
      selectionGeneration.current += 1;
      playbackGeneration.current += 1;
    };
  }, []);

  const onEndReached = useCallback(async () => {
    if (repeat === "RepeatOne") {
      LOGGER.debug("Repeating same song");
      TrackPlayer.seekTo(0);
      playbackIntent.current = true;
      TrackPlayer.play();
      return;
    }

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
            await selectResolvedTrack(videoExtractor(contData.items[0]));
            return; // Return to skip Repeat All
          } else if (!repeat && automix && automixPlaylist) {
            // Set first Automix item as next item
            setCurrentPlaylist(automixPlaylist.items[0], false, true);
            return; // Return to skip Repeat All
          } else {
            LOGGER.warn(
              "Fetching playlist continuation failed. Skipping setting next song!",
            );
          }
          if (repeat === "RepeatAll") {
            const nextElement = playlist.items[0];
            await selectResolvedTrack(videoExtractor(nextElement));
          }
        } else {
          const nextElement = playlist.items[newIndex];
          await selectResolvedTrack(videoExtractor(nextElement));
        }
      } else if (repeat) {
        // Item not found in playlist repeat the current item if repeat is set
      }
    }
  }, [
    currentVideoData,
    playlist,
    automixPlaylist,
    automix,
    repeat,
    selectResolvedTrack,
    videoExtractor,
  ]);

  useEffect(() => {
    const stateSubscription = TrackPlayer.addEventListener(
      Event.PlaybackStateChanged,
      ({state}) => {
        if (state !== PlaybackState.Ended) {
          if (state === PlaybackState.Ready) {
            endedGeneration.current = undefined;
          }
          return;
        }

        const generation = playbackGeneration.current;
        if (endedGeneration.current === generation) {
          return;
        }

        endedGeneration.current = generation;
        onEndReached().catch(LOGGER.warn);
      },
    );

    const playingSubscription = TrackPlayer.addEventListener(
      Event.IsPlayingChanged,
      ({playing: isPlaying}) => {
        if (isPlaying) {
          playbackIntent.current = true;
          endedGeneration.current = undefined;
          return;
        }

        const state = TrackPlayer.getPlaybackState();
        if (
          !replacementInProgress.current &&
          state !== PlaybackState.Buffering &&
          state !== PlaybackState.Error
        ) {
          playbackIntent.current = false;
        }
      },
    );

    const transitionSubscription = TrackPlayer.addEventListener(
      Event.MediaItemTransition,
      ({item}) => {
        LOGGER.debug(`Active media item changed to ${item?.mediaId ?? "none"}`);
      },
    );

    const errorSubscription = TrackPlayer.addEventListener(
      Event.PlaybackError,
      ({code, message}) => {
        const generation = playbackGeneration.current;
        const trackId = activeTrack.current?.id ?? "unknown";
        const nativeTrackId = TrackPlayer.getActiveMediaItem()?.mediaId;
        LOGGER.error(
          `Music playback failed (${code}) for ${trackId}: ${message}`,
        );

        if (nativeTrackId && nativeTrackId !== trackId) {
          LOGGER.debug(
            `Ignoring stale playback error for native item ${nativeTrackId}`,
          );
          return;
        }

        if (retryGeneration.current === generation) {
          showMessage({
            type: "warning",
            message: "Playback failed",
            description: message,
          });
          return;
        }

        retryGeneration.current = generation;
        showMessage({
          type: "warning",
          message: "Playback interrupted",
          description: `${message} Retrying once…`,
        });
        refreshActiveSource(generation, "error").catch(LOGGER.warn);
      },
    );

    return () => {
      stateSubscription.remove();
      playingSubscription.remove();
      transitionSubscription.remove();
      errorSubscription.remove();
    };
  }, [onEndReached, refreshActiveSource]);

  const play = () => {
    playbackIntent.current = true;
    TrackPlayer.play();
  };

  const pause = () => {
    playbackIntent.current = false;
    TrackPlayer.pause();
  };

  const seek = (seconds: number) => {
    TrackPlayer.seekTo(seconds);
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
          if (contData) {
            await selectResolvedTrack(videoExtractor(contData.items[0]));
          }
        } else {
          const nextElement = playlist.items[newIndex];
          await selectResolvedTrack(videoExtractor(nextElement));
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
        await selectResolvedTrack(videoExtractor(nextElement));
      }
    }
  };

  const next = () => {
    return onEndReached();
  };

  const addAsNextItem = useCallback(
    (videoData: VideoData) => {
      const playlistItem: YTPlaylistPanelItem = {
        ...videoData,
        selected: false,
      };

      setPlaylist(prevState => {
        // Fallback for typechecks
        if (!prevState) {
          return undefined;
        }
        // Delete previous variants of this item if already present in the playlist to probit duplicate entries
        const playlistItems = prevState.items.filter(
          v => v.id !== playlistItem.id,
        );

        const currentIndex = playlistItems.findIndex(
          item => item.id === currentVideoData?.id,
        );

        return {
          ...prevState,
          items: playlistItems.toSpliced(currentIndex + 1, 0, playlistItem),
        };
      });
    },
    [setPlaylist, currentVideoData],
  );

  return (
    <MusicPlayerCtx.Provider
      value={{
        currentItem: currentVideoData,
        // Update current playing item
        setCurrentItem: setCurrentPlaylist,
        setPlaylistViaEndpoint,
        setPlaylistViaLocalDownload,
        duration,
        currentTime,
        playlist,
        playing,
        // Actions
        play,
        pause,
        previous,
        next,
        seek,
        // Playlist options
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
        callbacks: {
          onProgress: durationSeconds => {
            currentTime.value = durationSeconds;
          },
          onEndReached,
        },
        // Playlist fetch more
        fetchMorePlaylistData: fetchPlaylistDataWrapper,
        fetchMoreAutomixPlaylistData: fetchMoreUpNextAutomixPlaylist,
        // Automix
        automix,
        setAutomix,
        automixPlaylist,
        addAsNextItem,
      }}>
      <MusicPlayerProgressBridge
        activeTrack={activeTrack}
        currentTime={currentTime}
        duration={duration}
      />
      {children}
    </MusicPlayerCtx.Provider>
  );
}

export function useMusikPlayerContext() {
  return useContext(MusicPlayerCtx);
}
