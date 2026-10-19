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
  DISLIKE_OVERRIDE,
  LIKE_OVERRIDE,
  NO_RATING_OVERRIDE,
  type RatingOverride,
  resolveRating,
} from "@/hooks/video/ratingOverride";
import {
  useSubtitleLabel,
  useSubtitleTranslationLanguages,
} from "@/hooks/video/useSubtitleChoices";
import {
  AutomaticPlaybackSession,
  automaticPlaybackOrder,
  type AutomaticPlaybackState,
} from "@/utils/AutomaticPlayback";
import {
  createAutomaticVideoPreparer,
  type AutomaticVideoSource,
} from "@/utils/AutomaticVideoSource";
import {
  buildGeneratedHls,
  releaseGeneratedHls,
  type GeneratedHlsOptions,
} from "@/utils/GeneratedHls";
import Logger from "@/utils/Logger";
import {getPlaybackCapabilities} from "@/utils/PlaybackCapabilities";
import {describeStreamingData} from "@/utils/PlaybackDiagnostics";
import {
  buildPlaybackLadder,
  sameLadder,
  type PlaybackStep,
} from "@/utils/PlaybackLadder";
import {
  clampPlaybackResumePosition,
  playbackStartAfterReload,
  playbackStartAt,
  type PlaybackStart,
} from "@/utils/PlaybackPosition";
import {
  playbackModeFromSettings,
  resolveStreamingSource,
  type PlaybackMode,
  type StreamingSource,
} from "@/utils/PlaybackSource";
import {parsePlayerResolution} from "@/utils/PlayerResolution";
import {
  chooseProgressiveFormat,
  decipherProgressiveUrl,
} from "@/utils/ProgressiveSource";
import {startSabrPlayback, type SabrPlaybackSource} from "@/utils/SabrPlayback";
import {getSubtitleChoices, getSubtitleTrackList} from "@/utils/Subtitles";
import {pickVlcFormats} from "@/utils/VlcPlayback";
import {Innertube, Misc, YT, YTTV, YTNodes} from "@/utils/Youtube";
import {
  clientNeedsPoToken,
  getContentPoToken,
  poTokenMinter,
} from "@/utils/potoken/PoTokenProvider";

const LOGGER = Logger.extend("VIDEO");

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
  options: {youtube: Innertube; allowAv1?: boolean; signal?: AbortSignal},
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
    signal: options.signal,
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
  // "YouTube HLS" it is the wrong first step. Signed-in sources (private and
  // age-restricted videos) are the exception: they have neither YouTube HLS
  // nor SABR, so this is their only path.
  if (
    !streaming.canGenerateHls ||
    (mode !== "generated" && !streaming.authenticated)
  ) {
    return undefined;
  }

  return buildGeneratedHls(
    streaming.info,
    streaming.info.basic_info.id ?? "video",
    options,
  );
}

/**
 * Picks the direct stream URLs for the VLC player.
 *
 * Needs a client whose byte ranges are not capped — VLC reads the formats
 * progressively, and a capped client breaks off after about 0.37 MB. That is
 * the same condition as for the generated manifest, so `canGenerateHls`
 * answers it.
 */
async function resolveVlcSource(
  streaming: StreamingSource,
  youtube: Innertube,
): Promise<{videoUrl: string; audioUrl?: string} | undefined> {
  if (!streaming.canGenerateHls) {
    return undefined;
  }

  const selection = pickVlcFormats(
    streaming.info.streaming_data?.adaptive_formats ?? [],
  );
  if (!selection) {
    return undefined;
  }

  const player = youtube.session.player;
  // Without a player `decipher` returns the plain URL, which is what the
  // uncapped clients deliver anyway.
  const decipher = async (format: Misc.Format | undefined) =>
    format ? (await format.decipher(player)) || undefined : undefined;

  try {
    const [videoUrl, audioUrl] = await Promise.all([
      decipher(selection.video),
      decipher(selection.audio),
    ]);
    if (!videoUrl) {
      return undefined;
    }

    LOGGER.info(
      `VLC-Quelle: itag ${selection.video.itag} ` +
        `${selection.video.quality_label ?? ""} ` +
        `(${selection.video.mime_type}) · Ton itag ${
          selection.audio?.itag ?? "–"
        }`,
    );

    return {videoUrl, audioUrl};
  } catch (error: any) {
    LOGGER.warn(
      `VLC-Quelle nicht möglich (${String(error?.message ?? error)})`,
    );
    return undefined;
  }
}

/** TV metadata and stream formats come from separate responses. */
function videoDetailsFromSource(
  streaming: StreamingSource,
  tvInfo?: YTTV.VideoInfo,
) {
  const parsed = getElementDataFromVideoInfo(streaming.info);
  if (!tvInfo) return parsed;
  const metadata = getElementDataFromTVVideoInfo(tvInfo);
  const detailFallback = resolveVideoDetailFallback(metadata, parsed);
  return {
    ...metadata,
    chapters: parsed.chapters,
    hls_manifest_url: parsed.hls_manifest_url,
    expires: parsed.expires,
    best_format: parsed.best_format,
    subtitles: parsed.subtitles,
    durationSeconds: metadata.durationSeconds ?? parsed.durationSeconds,
    playlist: metadata.playlist ?? parsed.playlist,
    description: detailFallback.description,
    commentsEntryPointHeader: detailFallback.commentsEntryPointHeader,
  };
}

/**
 * An access restriction is not a delivery problem: claiming that every playback
 * type failed would suggest a retry that cannot help.
 */
function automaticPlaybackFailureKey(
  automatic: boolean,
  state: AutomaticVideoState | undefined,
): "video.playback.exhausted" | "video.playback.accessDenied" | undefined {
  if (!automatic || state?.phase !== "failed") return undefined;
  return state.reason === "access"
    ? "video.playback.accessDenied"
    : "video.playback.exhausted";
}

type AutomaticVideoState = AutomaticPlaybackState<AutomaticVideoSource> & {
  session: AutomaticPlaybackSession<AutomaticVideoSource>;
  target: string | YTNodes.NavigationEndpoint;
  refresh: boolean;
  runId: number;
  sessionOrderSize: number;
};

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
  const selectedResolution = parsePlayerResolution(appSettings).key;
  const playbackMode = playbackModeFromSettings(appSettings);
  const automatic = selectedResolution === "auto" && !appSettings.vlcEnabled;
  const allowAv1 =
    selectedResolution === "hlsLocalAv1" || selectedResolution === "sabr";
  const [autoState, setAutoState] = useState<AutomaticVideoState>();
  const autoRunRef = useRef(0);
  const vlcEnabled = !!appSettings.vlcEnabled;
  /**
   * VLC plays the adaptive formats directly and needs uncapped clients — the
   * same chain the generated manifest uses. Neither the manifest nor a SABR
   * stream is built for it.
   */
  const streamMode: PlaybackMode = vlcEnabled ? "generated" : playbackMode;
  /**
   * The running SABR stream. It holds a local server and an open connection
   * to googlevideo — both must go when the video changes or the screen is
   * left, otherwise the port stays taken and the stream keeps running.
   */
  const sabrRef = useRef<SabrPlaybackSource | undefined>(undefined);

  // Read through a ref: choosing a subtitle changes the preferred language,
  // which must not reload the video.
  const subtitleLabel = useSubtitleLabel();
  const subtitleLanguages = useSubtitleTranslationLanguages();
  const subtitleOptionsRef = useRef({
    label: subtitleLabel,
    languages: subtitleLanguages,
  });
  useEffect(() => {
    subtitleOptionsRef.current = {
      label: subtitleLabel,
      languages: subtitleLanguages,
    };
  }, [subtitleLabel, subtitleLanguages]);
  /** Subtitle renditions for the generated manifest's native subtitle menu. */
  const nativeSubtitleOptions = (streaming: StreamingSource) => ({
    tracks: getSubtitleChoices(
      getSubtitleTrackList(streaming.info.captions),
      subtitleOptionsRef.current.languages,
    ),
    label: subtitleOptionsRef.current.label,
  });

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
  const [startTime, setStartTime] = useState<PlaybackStart>({
    fromPlayback: false,
  });
  /** Last known playback position — survives source changes and refreshes. */
  const positionRef = useRef<number>(undefined);
  /** The video the start time belongs to. */
  const startVideoRef = useRef(videoId);

  // TODO: Consider replacing this with a function.
  const [refresh, setRefresh] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const sameVideo = startVideoRef.current === videoId;
    startVideoRef.current = videoId;
    if (!sameVideo) {
      positionRef.current = undefined;
      setVideoInfo(undefined);
      setWatchNextFeed(undefined);
      setWatchNextSections(undefined);
    }
    setLoading(true);
    setError(undefined);
    const startTimeSeconds =
      typeof videoId !== "string"
        ? ((videoId.payload.startTimeSeconds as number) ?? passedStartSeconds)
        : passedStartSeconds;
    setStartTime(previous => ({
      seconds: playbackStartAfterReload({
        sameVideo,
        currentSeconds: positionRef.current,
        previousStartSeconds: previous.seconds,
        requestedStartSeconds: startTimeSeconds,
      }),
      fromPlayback:
        sameVideo &&
        (positionRef.current !== undefined || previous.fromPlayback),
    }));

    if (!youtube) {
      return () => {
        active = false;
      };
    }

    const publish = (parsed: YTVideoInfo, publishFeed = true) => {
      if (!active) return;
      setVideoInfo(previous => ({
        ...parsed,
        endscreen:
          previous?.id === parsed.id
            ? (previous.endscreen ?? parsed.endscreen)
            : parsed.endscreen,
        storyboard:
          previous?.id === parsed.id
            ? (previous.storyboard ?? parsed.storyboard)
            : parsed.storyboard,
      }));
      if (publishFeed) {
        setWatchNextSections(parsed.watchNextSections);
        const feed =
          client === "TV"
            ? parsed.watchNextSections?.[parsed.playlist ? 1 : 0]?.parsedData
            : parsed.watchNextFeed;
        if (feed) setWatchNextFeed(feed);
      }
    };

    const tvMetadata =
      client === "TV" ? tvYoutube?.tv?.getInfo(videoId) : undefined;

    if (automatic) {
      const runId = ++autoRunRef.current;
      let session: AutomaticPlaybackSession<AutomaticVideoSource> | undefined;
      let tvInfo: YTTV.VideoInfo | undefined;
      let published = false;
      setAutoState(undefined);
      const publishAutomaticSource = (source: AutomaticVideoSource) => {
        if (!active) return;
        if (!published && client !== "TV")
          videoRef.current = source.streaming.info;
        const parsed = videoDetailsFromSource(source.streaming, tvInfo);
        if (source.kind === "generated-hls")
          parsed.generated_hls_url = source.uri;
        if (source.kind === "sabr-hls") parsed.sabr_hls_url = source.uri;
        publish(parsed, !published);
        published = true;
      };
      tvMetadata
        ?.then(info => {
          if (!active || !info) return;
          tvInfo = info;
          videoTVRef.current = info;
          if (session?.state.source) {
            published = false;
            publishAutomaticSource(session.state.source);
          }
        })
        .catch(() => {
          // Stream metadata still allows playback if TV recommendations fail.
        });

      getPlaybackCapabilities()
        .then(capabilities => {
          if (!active) return;
          const order = automaticPlaybackOrder(capabilities);
          const prepare = createAutomaticVideoPreparer({
            resolve: (mode, signal) =>
              resolveStreamingSource(youtube, videoId, {
                mode,
                signal,
                signedInYoutube: tvYoutube,
                throwOnAccessDenied: true,
              }),
            generate: async (streaming, av1Allowed, signal) => {
              const uri = await buildGeneratedHls(
                streaming.info,
                streaming.info.basic_info.id ?? "video",
                {
                  allowAv1: av1Allowed,
                  signal,
                  subtitles: nativeSubtitleOptions(streaming),
                },
              );
              return uri
                ? {uri, dispose: () => releaseGeneratedHls(uri)}
                : undefined;
            },
            sabr: (streaming, signal) =>
              startSabrIfPossible(streaming, "sabr", {
                youtube,
                allowAv1: false,
                signal,
              }),
            progressive: streaming =>
              decipherProgressiveUrl(
                chooseProgressiveFormat(streaming.info),
                youtube.session.player,
              ),
          });
          session = new AutomaticPlaybackSession({
            order,
            prepare,
            onChange: state => {
              if (!active || !session) return;
              LOGGER.info(
                `Automatic playback: attempt ${state.index + 1}/${order.length}, type=${state.type ?? "none"}, phase=${state.phase}, reason=${state.reason ?? "none"}${state.source ? `, client=${state.source.streaming.client}` : ""}`,
              );
              setAutoState({
                ...state,
                session,
                target: videoId,
                refresh,
                runId,
                sessionOrderSize: order.length,
              });
              setLoading(state.phase === "preparing");
              if (state.source) {
                if (state.phase === "starting") {
                  setStartTime(previous =>
                    positionRef.current !== undefined
                      ? playbackStartAt(positionRef.current)
                      : previous,
                  );
                  publishAutomaticSource(state.source);
                }
              } else if (state.phase === "failed") {
                setError(new Error("Automatic playback exhausted"));
              }
            },
          });
          session.start();
        })
        .catch(() => {
          if (active) {
            setError(new Error("Playback capabilities unavailable"));
            setLoading(false);
          }
        });
      return () => {
        active = false;
        session?.dispose();
      };
    }

    Promise.all([
      tvMetadata,
      resolveStreamingSource(youtube, videoId, {
        mode: streamMode,
        signedInYoutube: tvYoutube,
      }),
    ])
      .then(async ([tvInfo, streaming]) => {
        if (!active) return;
        if (!streaming || (client === "TV" && !tvInfo)) {
          throw new Error("No video source available");
        }
        if (tvInfo) videoTVRef.current = tvInfo;
        if (client !== "TV") videoRef.current = streaming.info;
        LOGGER.info(describeStreamingData(streaming.info, streaming.client));
        const parsed = videoDetailsFromSource(streaming, tvInfo);
        if (vlcEnabled) {
          parsed.vlc_source = await resolveVlcSource(streaming, youtube);
        } else {
          parsed.generated_hls_url = await generateIfPossible(
            streaming,
            playbackMode,
            {
              allowAv1,
              subtitles: nativeSubtitleOptions(streaming),
            },
          );
          if (!active) return;
          const sabr = await startSabrIfPossible(streaming, playbackMode, {
            youtube,
            allowAv1,
          });
          if (!active) {
            await sabr?.stop();
            return;
          }
          parsed.sabr_hls_url = replaceSabrSource(sabr)?.masterUri;
        }
        if (!active) return;
        publish(parsed);
        setLoading(false);
      })
      .catch(reason => {
        if (active) {
          LOGGER.warn("Video source resolution failed");
          setError(reason);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      replaceSabrSource(undefined);
    };
  }, [
    playbackMode,
    automatic,
    vlcEnabled,
    allowAv1,
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
    let active = true;
    setHttpVideoURL(undefined);
    if (automatic || !youtube?.actions.session.player) {
      setHttpVideoURL(undefined);
      return;
    }
    decipherProgressiveUrl(
      videoInfo?.best_format?.originalFormat,
      youtube.actions.session.player,
    ).then(url => {
      if (active) setHttpVideoURL(url);
    });
    // Keyed on the format, not the whole info: the end screen arriving later
    // replaces the info object and must not decipher the stream again.
    return () => {
      active = false;
    };
  }, [automatic, videoInfo?.best_format, youtube]);

  // The end screen and the storyboard are part of the WEB /player response
  // only: the TV response is UNPLAYABLE and the stream clients leave them out,
  // so the TV player never had the creator's end cards. They are fetched on
  // their own once the metadata is in, so they never delay the start of
  // playback. Besides TV, only the phone/tablet overlay player shows them; the
  // native controls would not use them, so they are not fetched there.
  const wantsPlayerExtras =
    client === "TV" ||
    Boolean(appSettings.ownOverlayEnabled || appSettings.vlcEnabled);
  const extrasVideoId =
    wantsPlayerExtras &&
    videoInfo &&
    (!videoInfo.endscreen || (client !== "TV" && !videoInfo.storyboard))
      ? videoInfo.id
      : undefined;

  useEffect(() => {
    if (!extrasVideoId || !youtube) {
      return;
    }
    let active = true;
    youtube
      .getBasicInfo(extrasVideoId)
      .then(info => {
        const extras = getElementDataFromVideoInfo(info);
        if (!active || (!extras.endscreen && !extras.storyboard)) {
          return;
        }
        setVideoInfo(previous =>
          previous?.id === extrasVideoId
            ? {
                ...previous,
                endscreen: previous.endscreen ?? extras.endscreen,
                storyboard: previous.storyboard ?? extras.storyboard,
              }
            : previous,
        );
      })
      .catch(LOGGER.warn);
    return () => {
      active = false;
    };
  }, [extrasVideoId, youtube]);

  /**
   * The steps available for this video (plan phase 4.1), and the one that is
   * currently playing.
   */
  const ladder = useMemo(
    () =>
      buildPlaybackLadder(
        {
          vlc: videoInfo?.vlc_source,
          sabrHlsUrl: videoInfo?.sabr_hls_url,
          generatedHlsUrl: videoInfo?.generated_hls_url,
          youtubeHlsUrl: videoInfo?.hls_manifest_url,
          progressiveUrl: httpVideoURL,
        },
        playbackMode,
        vlcEnabled ? "vlc" : "native",
      ),
    [
      videoInfo?.vlc_source,
      videoInfo?.sabr_hls_url,
      videoInfo?.generated_hls_url,
      videoInfo?.hls_manifest_url,
      httpVideoURL,
      playbackMode,
      vlcEnabled,
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

  const automaticState =
    automatic &&
    autoState?.target === videoId &&
    autoState.refresh === refresh &&
    autoState.session.state.phase !== "disposed"
      ? autoState
      : undefined;
  const currentStep = automatic
    ? automaticState?.source
    : ladder[Math.min(ladderIndex, ladder.length - 1)];
  const automaticSession = automaticState?.session;
  const automaticAttemptId = automaticState?.attemptId;
  const automaticCallbacks = useMemo(
    () => ({
      current: () =>
        automaticAttemptId !== undefined &&
        automaticSession?.state.attemptId === automaticAttemptId &&
        !!automaticSession.state.source,
      fail: (_reason: string) => {
        if (automaticAttemptId !== undefined)
          automaticSession?.fail(automaticAttemptId);
      },
      active: (active: boolean) => {
        if (automaticAttemptId !== undefined)
          automaticSession?.setActive(automaticAttemptId, active);
      },
      advance: () => {
        if (automaticAttemptId !== undefined)
          automaticSession?.progress(automaticAttemptId);
      },
    }),
    [automaticSession, automaticAttemptId],
  );

  /**
   * The second playback starts at — checked against the video duration.
   *
   * Only here, because the duration comes from the metadata and is not yet
   * known when the marker is set.
   */
  const resumeSeconds = clampPlaybackResumePosition(
    startTime.seconds,
    videoInfo?.durationSeconds,
    startTime.fromPlayback,
  );

  useEffect(() => {
    if (startTime.seconds && resumeSeconds === undefined) {
      LOGGER.info(
        `Fortsetzungsmarke bei ${Math.floor(startTime.seconds)} s liegt am Ende des ` +
          `${videoInfo?.durationSeconds ?? "?"} s langen Videos — Start von vorn.`,
      );
    }
  }, [startTime.seconds, resumeSeconds, videoInfo?.durationSeconds]);

  const reportProgress = useCallback(
    (seconds: number) => {
      if (
        startVideoRef.current !== videoId ||
        (automatic && !automaticCallbacks.current())
      )
        return;
      if (Number.isFinite(seconds)) positionRef.current = seconds;
    },
    [automatic, automaticCallbacks, videoId],
  );

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
    const position = positionRef.current;

    if (next >= steps.length) {
      LOGGER.warn(
        `Wiedergabe gescheitert (${reason}) — keine weitere Stufe vorhanden.`,
      );
      return;
    }

    LOGGER.warn(
      `Wiedergabe gescheitert (${reason}) auf Stufe ${index + 1}/${steps.length} — ` +
        `weiter mit ${steps[next].label}${
          position !== undefined && position > 0
            ? ` ab ${Math.floor(position)} s`
            : ""
        }.`,
    );

    ladderIndexRef.current = next;
    setLadderIndex(next);

    // The next step starts where the previous one stopped.
    if (position !== undefined) {
      setStartTime(playbackStartAt(position));
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
          positionRef.current ?? 0,
        )} s.`,
      );
      setStartTime(playbackStartAt(positionRef.current));
      setRefresh(previous => !previous);
    }, delay);

    return () => clearTimeout(timer);
  }, [expiresAt]);

  // Actions:

  // const [actionVideoData, setActionVideoData] = useState<YT.VideoInfo>();
  const [actionDataOverride, setActionDataOverride] = useState<RatingOverride>(
    {},
  );
  // The override a pending request has to compare against: a later press
  // must not be rolled back by an earlier request that failed.
  const overrideRef = useRef<RatingOverride>({});

  const updateOverride = useCallback((next: RatingOverride) => {
    overrideRef.current = next;
    setActionDataOverride(next);
  }, []);

  // A rating belongs to one video.
  useEffect(() => {
    updateOverride({});
  }, [updateOverride, videoInfo?.id]);

  const actionData = useMemo(
    () =>
      videoInfo
        ? {...videoInfo, ...resolveRating(videoInfo, actionDataOverride)}
        : undefined,
    [videoInfo, actionDataOverride],
  );

  /**
   * Shows `next` right away and sends the request. When it fails, the rating
   * from before the press comes back, so the buttons never claim a rating
   * YouTube did not store. The error still reaches the caller.
   */
  const applyRating = useCallback(
    async (
      next: RatingOverride,
      request: (videoId: string) => Promise<unknown> | undefined,
    ) => {
      const id = videoInfo?.id;
      if (!id) {
        return;
      }

      const previous = overrideRef.current;
      updateOverride(next);
      try {
        const pending = request(id);
        if (!pending) {
          throw new Error("No signed-in session to rate the video with");
        }
        await pending;
      } catch (reason) {
        if (overrideRef.current === next) {
          updateOverride(previous);
        }
        throw reason;
      }
    },
    [updateOverride, videoInfo?.id],
  );

  // The TV session rates through the interaction manager, which uses the TV
  // endpoints.
  const like = useCallback(
    () => applyRating(LIKE_OVERRIDE, id => tvYoutube?.interact.like(id)),
    [applyRating, tvYoutube],
  );

  const dislike = useCallback(
    () => applyRating(DISLIKE_OVERRIDE, id => tvYoutube?.interact.dislike(id)),
    [applyRating, tvYoutube],
  );

  const removeRating = useCallback(
    () =>
      applyRating(NO_RATING_OVERRIDE, id =>
        tvYoutube?.interact.removeRating(id),
      ),
    [applyRating, tvYoutube],
  );

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
    playbackLadderSize: automatic
      ? (automaticState?.sessionOrderSize ?? 0)
      : ladder.length,
    playbackLadderStep: automatic
      ? (automaticState?.index ?? 0) + 1
      : Math.min(ladderIndex, Math.max(ladder.length - 1, 0)) + 1,
    reportPlaybackFailure: automatic
      ? automaticCallbacks.fail
      : reportPlaybackFailure,
    onPlaybackActive: automatic ? automaticCallbacks.active : undefined,
    onPlaybackAdvanced: automatic ? automaticCallbacks.advance : undefined,
    playbackAttemptKey: automaticState
      ? `auto:${automaticState.runId}:${automaticState.attemptId}`
      : undefined,
    /** Why automatic playback gave up, as a message key for the screens. */
    playbackFailureKey: automaticPlaybackFailureKey(automatic, automaticState),
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
      positionRef.current = continueAtSeconds ?? positionRef.current;
      setStartTime(playbackStartAt(positionRef.current));
      setRefresh(previous => !previous);
    },
  };
}
