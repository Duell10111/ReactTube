import {useCallback, useEffect, useMemo, useRef, useState} from "react";
// @ts-ignore
import {InnerTubeClient} from "youtubei.js/dist/src/types";

import {useAppData} from "@/context/AppDataContext";
import {useYoutubeContext, useYoutubeTVContext} from "@/context/YoutubeContext";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData, YTVideoInfo} from "@/extraction/Types";
import {
  getElementDataFromTVVideoInfo,
  getElementDataFromVideoInfo,
} from "@/extraction/YTElements";
import {resolveVideoDetailFallback} from "@/extraction/videoInfoFallback";
import {
  buildGeneratedHls,
  type GeneratedHlsOptions,
} from "@/utils/GeneratedHls";
import Logger from "@/utils/Logger";
import {describeStreamingData} from "@/utils/PlaybackDiagnostics";
import {
  buildPlaybackLadder,
  sameLadder,
  type PlaybackStep,
} from "@/utils/PlaybackLadder";
import {
  playbackModeFromSettings,
  resolveStreamingSource,
  type PlaybackMode,
  type StreamingSource,
} from "@/utils/PlaybackSource";
import {startSabrPlayback, type SabrPlaybackSource} from "@/utils/SabrPlayback";
import {Innertube, YT, YTTV, YTNodes} from "@/utils/Youtube";
import {
  clientNeedsPoToken,
  getContentPoToken,
  poTokenMinter,
} from "@/utils/potoken/PoTokenProvider";

const LOGGER = Logger.extend("VIDEO");

/**
 * Distance from the end of the video within which a resume marker no longer
 * applies.
 *
 * Someone who watched almost to the end wants to start over next time instead
 * of jumping into the credits. More importantly, a marker **past** the end
 * makes AVPlayer hang — measured with a 218.778 s video and a marker at 219 s,
 * the player stayed silently in its loading state without reporting an error.
 */
const RESUME_DEAD_ZONE_SECONDS = 5;

/**
 * Brings a resume marker into the valid range.
 *
 * @returns the second playback starts at, or `undefined` for "from the
 *   beginning".
 */
function clampResumePosition(
  seconds: number | undefined,
  durationSeconds: number | undefined,
): number | undefined {
  if (!seconds || seconds <= 0) {
    return undefined;
  }

  if (!durationSeconds) {
    return seconds;
  }

  return seconds < durationSeconds - RESUME_DEAD_ZONE_SECONDS
    ? seconds
    : undefined;
}

/**
 * Starts SABR playback when the setting and the source allow it (plan phase
 * 6.5).
 *
 * As with the app's own manifest only on explicit request: setting it up costs
 * a SABR round, and without the mode selected the stage would sit unused in
 * the ladder.
 */
async function startSabrIfPossible(
  streaming: StreamingSource,
  mode: PlaybackMode,
  options: {youtube: Innertube; allowAv1?: boolean},
) {
  if (mode !== "sabr" || !streaming.canUseSabr) {
    return undefined;
  }

  const videoId = streaming.info.basic_info.id ?? "";
  // Plan phase 5: only `WEB` measurably needs a token; the chain picks it
  // only where one can be minted, so other clients never wait for BotGuard.
  const needsPoToken = clientNeedsPoToken(streaming.client);

  return startSabrPlayback(streaming.info, {
    videoId,
    client: streaming.client,
    clientVersion: options.youtube.session.context.client.clientVersion,
    allowAv1: options.allowAv1,
    poToken: needsPoToken ? await getContentPoToken(videoId) : undefined,
    refreshPoToken: needsPoToken
      ? () => {
          poTokenMinter.reportRejected(videoId);
          return getContentPoToken(videoId);
        }
      : undefined,
    decipherUrl: async url =>
      (await options.youtube.session.player?.decipher(url)) ?? url,
  });
}

/**
 * Builds the app's own manifest when the source allows it (plan phase 2c).
 *
 * Deliberately before the metadata is published: building costs one range
 * request per rendition (about half a second). If it ran afterwards, the
 * player would first get YouTube's manifest and then ours — and visibly
 * restart playback.
 */
async function generateIfPossible(
  streaming: StreamingSource,
  mode: PlaybackMode,
  options: GeneratedHlsOptions,
) {
  // Only build it when it is selected. Otherwise it costs one and a half
  // seconds of startup time and then sits unused in the ladder — with
  // "YouTube HLS" it is the wrong first step.
  if (mode !== "generated" || !streaming.canGenerateHls) {
    return undefined;
  }

  return buildGeneratedHls(
    streaming.info,
    streaming.info.basic_info.id ?? "video",
    options,
  );
}

export default function useVideoDetails(
  videoId: string | YTNodes.NavigationEndpoint,
  client?: InnerTubeClient,
  passedStartSeconds?: number,
) {
  // TODO: Refactor for future TV client usage?
  // TODO: Include actions like like/sub/addToWatchLater?
  // TODO: Add option for init seconds?

  const youtube = useYoutubeContext();
  const tvYoutube = useYoutubeTVContext();
  const videoRef = useRef<YT.VideoInfo>(undefined);
  const videoTVRef = useRef<YTTV.VideoInfo>(undefined);
  const [videoInfo, setVideoInfo] = useState<YTVideoInfo>();
  /**
   * States of the metadata request. A failure used to end in `LOGGER.warn`,
   * and the UI showed a loading state indefinitely — with no difference
   * between "still loading" and "never arriving".
   */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [watchNextFeed, setWatchNextFeed] = useState<ElementData[]>();
  const [watchNextSections, setWatchNextSections] =
    useState<HorizontalData[]>();
  const {appSettings} = useAppData();
  /** The selected path — decides the client chain, manifest build, and ladder order. */
  const playbackMode = playbackModeFromSettings(appSettings);
  /**
   * The running SABR stream. It holds a local server and an open connection
   * to googlevideo — both must go when the video changes or the screen is
   * left, otherwise the port stays taken and the stream keeps running.
   */
  const sabrRef = useRef<SabrPlaybackSource | undefined>(undefined);

  const replaceSabrSource = useCallback(
    (next: SabrPlaybackSource | undefined) => {
      const previous = sabrRef.current;
      sabrRef.current = next;
      previous?.stop().catch(reason => LOGGER.warn(reason));
      return next;
    },
    [],
  );

  useEffect(
    () => () => {
      sabrRef.current?.stop().catch(() => {});
      sabrRef.current = undefined;
    },
    [],
  );
  const [startTime, setStartTime] = useState<number>();

  // TODO: Maybe replace with fkt in the future?
  const [refresh, setRefresh] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    setError(undefined);
    const startTimeSeconds =
      typeof videoId !== "string"
        ? ((videoId.payload.startTimeSeconds as number) ?? passedStartSeconds)
        : passedStartSeconds;
    if (client === "TV") {
      // Plan phase 1.8: fetch the endpoints separately. The metadata comes from
      // the signed-in TV instance (only it provides watch-next and transport
      // controls), the streams from the anonymous instance via the client
      // chain — the TV client answers /player with UNPLAYABLE regardless of login.
      Promise.all([
        tvYoutube?.tv?.getInfo(videoId),
        youtube
          ? resolveStreamingSource(youtube, videoId, {
              mode: playbackMode,
            })
          : undefined,
      ])
        .then(async ([tvInfo, streaming]) => {
          // Plan phase 0.4: record what the clients actually delivered.
          LOGGER.info(describeStreamingData(tvInfo, "TV (Metadaten)"));
          if (streaming) {
            LOGGER.info(
              describeStreamingData(
                streaming.info,
                `${streaming.client} (Streams)`,
              ),
            );
          }
          if (tvInfo) {
            videoTVRef.current = tvInfo;
            const parsedDataTV = getElementDataFromTVVideoInfo(tvInfo);
            if (streaming) {
              const parsed = getElementDataFromVideoInfo(streaming.info);
              parsedDataTV.chapters = parsed.chapters;
              parsedDataTV.hls_manifest_url = parsed.hls_manifest_url;
              parsedDataTV.expires = parsed.expires;
              // The TV response contains no formats — the playback format has
              // to come from the stream client's response.
              parsedDataTV.best_format = parsed.best_format;
              // The duration decides whether a resume marker still applies —
              // if the TV response has none (it is UNPLAYABLE and carries no
              // streaming_data), it comes from the stream client.
              parsedDataTV.durationSeconds =
                parsedDataTV.durationSeconds ?? parsed.durationSeconds;
              parsedDataTV.playlist = parsedDataTV.playlist ?? parsed.playlist;
              const detailFallback = resolveVideoDetailFallback(
                parsedDataTV,
                parsed,
              );
              parsedDataTV.description = detailFallback.description;
              parsedDataTV.commentsEntryPointHeader =
                detailFallback.commentsEntryPointHeader;
            }
            // Before publishing the metadata: otherwise the player would get
            // YouTube's manifest first and ours half a second later — a
            // visible restart of playback.
            if (streaming) {
              parsedDataTV.generated_hls_url = await generateIfPossible(
                streaming,
                playbackMode,
                {allowAv1: appSettings.av1Enabled},
              );
              // `youtube` is necessarily present here — the streams come from
              // this instance — but only the check makes that visible to the
              // type checker.
              if (youtube) {
                parsedDataTV.sabr_hls_url = replaceSabrSource(
                  await startSabrIfPossible(streaming, playbackMode, {
                    youtube,
                    allowAv1: appSettings.av1Enabled,
                  }),
                )?.masterUri;
              }
            }
            setVideoInfo(parsedDataTV);
            setWatchNextSections(parsedDataTV.watchNextSections);
            setWatchNextFeed(
              parsedDataTV.watchNextSections?.[parsedDataTV.playlist ? 1 : 0]
                ?.parsedData,
            );
            setLoading(false);
          } else {
            LOGGER.warn("No TVInfo available! This should never happen.");
            setError(new Error("No video info available"));
            setLoading(false);
          }
        })
        .catch(reason => {
          LOGGER.warn(reason);
          setError(reason);
          setLoading(false);
        });
    } else {
      youtube &&
        resolveStreamingSource(youtube, videoId, {
          mode: playbackMode,
        })
          .then(async streaming => {
            if (!streaming) {
              setError(new Error("No streaming source available"));
              setLoading(false);
              return;
            }
            LOGGER.info(
              describeStreamingData(streaming.info, `${streaming.client}`),
            );
            videoRef.current = streaming.info;
            const parsedData = getElementDataFromVideoInfo(streaming.info);
            parsedData.generated_hls_url = await generateIfPossible(
              streaming,
              playbackMode,
              {allowAv1: appSettings.av1Enabled},
            );
            parsedData.sabr_hls_url = replaceSabrSource(
              await startSabrIfPossible(streaming, playbackMode, {
                youtube,
                allowAv1: appSettings.av1Enabled,
              }),
            )?.masterUri;
            setVideoInfo(parsedData);
            parsedData.watchNextFeed &&
              setWatchNextFeed(parsedData.watchNextFeed);
            setLoading(false);
          })
          .catch(reason => {
            LOGGER.warn(reason);
            setError(reason);
            setLoading(false);
          });
    }
    // TODO: Fix duplicate reset to starttime on refresh
    // Only set if not set previously
    setStartTime(prevSeconds => {
      if (prevSeconds) {
        return prevSeconds;
      }
      return startTimeSeconds;
    });
  }, [
    playbackMode,
    appSettings.av1Enabled,
    videoId,
    youtube,
    tvYoutube,
    client,
    refresh,
  ]);

  // TODO: Add tracking again once reworked
  // useEffect(() => {
  //   if (appSettings.trackingEnabled) {
  //     videoRef.current?.addToWatchHistory().catch(LOGGER.warn);
  //   }
  // }, [appSettings.trackingEnabled]);

  const [httpVideoURL, setHttpVideoURL] = useState<string>();

  useEffect(() => {
    if (!youtube?.actions.session.player) {
      setHttpVideoURL(undefined);
      return;
    }
    const format = videoInfo?.best_format;
    format?.originalFormat
      ?.decipher(youtube.actions.session.player)
      .then(url => {
        LOGGER.info(
          `Decipher ok: itag=${format.originalFormat?.itag} ${format.type} ` +
            `${format.originalFormat?.quality_label ?? ""} · host=${url.split("/")[2]}`,
        );
        setHttpVideoURL(url);
      })
      .catch(e => {
        LOGGER.warn(
          `Decipher fehlgeschlagen (itag=${format?.originalFormat?.itag}): ${String(
            e?.message ?? e,
          )} — unter Hermes ist das der erwartete Ausfall, siehe Einstellungen ▸ Playback diagnostics`,
        );
        setHttpVideoURL(undefined);
      });
    // Keyed on the format, not the whole info: the end screen arriving later
    // replaces the info object and must not decipher the stream again.
  }, [videoInfo?.best_format, youtube]);

  // The end screen is part of the WEB /player response only: the TV response
  // is UNPLAYABLE and the stream clients leave it out, so the TV player never
  // had the creator's end cards. It is fetched on its own once the metadata is
  // in, so it never delays the start of playback.
  const endscreenVideoId =
    client === "TV" && videoInfo && !videoInfo.endscreen
      ? videoInfo.id
      : undefined;

  useEffect(() => {
    if (!endscreenVideoId || !youtube) {
      return;
    }
    let active = true;
    youtube
      .getBasicInfo(endscreenVideoId)
      .then(info => {
        const endscreen = getElementDataFromVideoInfo(info).endscreen;
        if (!active || !endscreen) {
          return;
        }
        setVideoInfo(previous =>
          previous?.id === endscreenVideoId && !previous.endscreen
            ? {...previous, endscreen}
            : previous,
        );
      })
      .catch(LOGGER.warn);
    return () => {
      active = false;
    };
  }, [endscreenVideoId, youtube]);

  /**
   * The steps available for this video (plan phase 4.1), and the one that is
   * currently playing.
   */
  const ladder = useMemo(
    () =>
      buildPlaybackLadder(
        {
          sabrHlsUrl: videoInfo?.sabr_hls_url,
          generatedHlsUrl: videoInfo?.generated_hls_url,
          youtubeHlsUrl: videoInfo?.hls_manifest_url,
          progressiveUrl: httpVideoURL,
        },
        playbackMode,
      ),
    [
      videoInfo?.sabr_hls_url,
      videoInfo?.generated_hls_url,
      videoInfo?.hls_manifest_url,
      httpVideoURL,
      playbackMode,
    ],
  );

  const [ladderIndex, setLadderIndex] = useState(0);
  const ladderRef = useRef<PlaybackStep[]>([]);
  const ladderIndexRef = useRef(0);

  // A new set of sources — another video, a refresh, a changed setting —
  // starts at the top again. Merely re-delivering the same steps must not
  // reset the ladder, though, or a player that just stepped down would land
  // right back on the broken step.
  useEffect(() => {
    if (!sameLadder(ladderRef.current, ladder)) {
      ladderRef.current = ladder;
      ladderIndexRef.current = 0;
      setLadderIndex(0);
    }
  }, [ladder]);

  const currentStep = ladder[Math.min(ladderIndex, ladder.length - 1)];

  /**
   * The second playback starts at — checked against the video duration.
   *
   * Only here, because the duration comes from the metadata and is not yet
   * known when the marker is set.
   */
  const resumeSeconds = useMemo(
    () => clampResumePosition(startTime, videoInfo?.durationSeconds),
    [startTime, videoInfo?.durationSeconds],
  );

  useEffect(() => {
    if (startTime && resumeSeconds === undefined) {
      LOGGER.info(
        `Fortsetzungsmarke bei ${Math.floor(startTime)} s liegt am Ende des ` +
          `${videoInfo?.durationSeconds ?? "?"} s langen Videos — Start von vorn.`,
      );
    }
  }, [startTime, resumeSeconds, videoInfo?.durationSeconds]);

  /** Last known playback position — survives step changes and refreshes. */
  const positionRef = useRef(0);

  const reportProgress = useCallback((seconds: number) => {
    positionRef.current = seconds;
  }, []);

  /**
   * Reports that the current step does not work — as an error or as a stall.
   *
   * @returns whether another step was left.
   */
  const reportPlaybackFailure = useCallback((reason: string) => {
    // Deliberately through refs instead of the state updater: there the logging
    // would be a side effect that React is allowed to run twice.
    const index = ladderIndexRef.current;
    const steps = ladderRef.current;
    const next = index + 1;

    if (next >= steps.length) {
      LOGGER.warn(
        `Wiedergabe gescheitert (${reason}) — keine weitere Stufe vorhanden.`,
      );
      return;
    }

    LOGGER.warn(
      `Wiedergabe gescheitert (${reason}) auf Stufe ${index + 1}/${steps.length} — ` +
        `weiter mit ${steps[next].label}${
          positionRef.current > 0
            ? ` ab ${Math.floor(positionRef.current)} s`
            : ""
        }.`,
    );

    ladderIndexRef.current = next;
    setLadderIndex(next);

    // The next step starts where the previous one stopped.
    if (positionRef.current > 0) {
      setStartTime(positionRef.current);
    }
  }, []);

  LOGGER.debug("Video: ", httpVideoURL);

  const fetchNextVideoContinue = useCallback(() => {
    if (videoRef.current) {
      videoRef.current
        .getWatchNextContinuation()
        .then(info => {
          videoRef.current = info;
          const parsedData = getElementDataFromVideoInfo(info);
          parsedData.watchNextFeed &&
            setWatchNextFeed(prevData => {
              if (parsedData.watchNextFeed) {
                return [...(prevData ?? []), ...parsedData.watchNextFeed];
              }
              return prevData;
            });
        })
        .catch(LOGGER.warn);
    }
  }, []);

  /**
   * Refreshes the streaming data before it expires — plan phase 4.2.
   *
   * The segment URLs carry an `expire` of about four hours. That is enough for
   * most videos, but not for a paused one, a long one, or one that returns
   * from the background: googlevideo then answers with 403, and because a
   * stalled player reports no error, it looks like a freeze. The self-built
   * manifest is affected most — it bakes the URLs into the playlists.
   *
   * Replaces the commented-out block that used to be here: it refreshed
   * without lead time and without the position.
   */
  const expiresAt = videoInfo?.expires?.getTime();

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    // One minute of lead time, so the swap is done before the old URLs become
    // invalid.
    const delay = expiresAt - Date.now() - 60_000;

    if (delay <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      LOGGER.info(
        `Streaming-Daten laufen ab — Auffrischung bei ${Math.floor(
          positionRef.current,
        )} s.`,
      );
      setStartTime(positionRef.current > 0 ? positionRef.current : undefined);
      setRefresh(previous => !previous);
    }, delay);

    return () => clearTimeout(timer);
  }, [expiresAt]);

  // Actions:

  // const [actionVideoData, setActionVideoData] = useState<YT.VideoInfo>();
  const [actionDataOverride, setActionDataOverride] = useState<ActionData>({});

  // const fetchActionsVideoData = useCallback(() => {
  //   youtube
  //     ?.getInfo(videoId, appSettings.hlsEnabled ? "IOS" : undefined)
  //     .then(setActionVideoData)
  //     .catch(LOGGER.warn);
  // }, [videoId, appSettings.hlsEnabled, youtube]);

  const actionData = useMemo(() => {
    const data = videoInfo;
    if (data && actionDataOverride?.like !== undefined) {
      data.liked = actionDataOverride.like;
    }
    if (data && actionDataOverride?.dislike !== undefined) {
      data.disliked = actionDataOverride.dislike;
    }
    return data;
  }, [videoInfo, actionDataOverride]);

  const like = useCallback(async () => {
    console.log("like: ");
    if (actionData?.id) {
      setActionDataOverride({
        ...actionDataOverride,
        like: true,
        dislike: false,
      });
      // Use interaction manager as this uses the TV endpoints
      await tvYoutube?.interact.like(actionData.id);
    }
    // await actionData?.originalData?.like();
    // fetchActionsVideoData();
  }, [actionData, actionDataOverride, tvYoutube]);

  const dislike = useCallback(async () => {
    if (actionData?.id) {
      setActionDataOverride({
        ...actionDataOverride,
        dislike: true,
        like: false,
      });
      // Use interaction manager as this uses the TV endpoints
      await tvYoutube?.interact?.dislike(actionData.id);
    }
    // await actionData?.originalData?.dislike();
    // fetchActionsVideoData();
  }, [actionData, actionDataOverride, tvYoutube]);

  const removeRating = useCallback(async () => {
    if (actionData?.id) {
      setActionDataOverride({dislike: false, like: false});
      // Use interaction manager as this uses the TV endpoints
      await tvYoutube?.interact?.removeRating(actionData.id);
    }
    // await actionData?.originalData?.removeRating();
    // fetchActionsVideoData();
  }, [actionData, tvYoutube]);

  const addToWatchHistory = useCallback(
    async (seconds?: number) => {
      if (seconds && videoInfo?.originalData?.updateWatchTime) {
        await videoInfo?.originalData.updateWatchTime(seconds);
      } else {
        videoInfo?.originalData?.addToWatchHistory();
      }
    },
    [actionData],
  );

  return {
    YTVideoInfo: videoInfo,
    loading,
    error,
    // The app's own manifest takes precedence — it carries multi-language audio
    // and, with AV1, 4K. Without it, YouTube's own (phase 2a) is the way.
    hlsManifestUrl: videoInfo?.generated_hls_url ?? videoInfo?.hls_manifest_url,
    httpVideoURL,
    /** The source currently in effect — the result of the plan phase 4.1 ladder. */
    videoUrl: currentStep?.uri,
    playbackSource: currentStep,
    playbackLadderSize: ladder.length,
    playbackLadderStep:
      Math.min(ladderIndex, Math.max(ladder.length - 1, 0)) + 1,
    reportPlaybackFailure,
    reportProgress,
    startTime: resumeSeconds,
    watchNextFeed,
    fetchNextVideoContinue,
    watchNextSections,
    //Actions
    actionData,
    like,
    dislike,
    removeRating,
    addToWatchHistory,
    refresh: (continueAtSeconds?: number) => {
      setStartTime(continueAtSeconds ?? positionRef.current ?? undefined);
      setRefresh(previous => !previous);
    },
  };
}

interface ActionData {
  like?: boolean;
  dislike?: boolean;
}
