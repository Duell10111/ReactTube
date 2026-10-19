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
import {playbackStartAfterReload} from "@/utils/PlaybackPosition";
import {
  playbackModeFromSettings,
  resolveStreamingSource,
  type PlaybackMode,
  type StreamingSource,
} from "@/utils/PlaybackSource";
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
  const [startTime, setStartTime] = useState<number>();
  /** Last known playback position — survives source changes and refreshes. */
  const positionRef = useRef<number>(undefined);
  /** The video the start time belongs to. */
  const startVideoRef = useRef(videoId);

  // TODO: Consider replacing this with a function.
  const [refresh, setRefresh] = useState<boolean>(false);

  useEffect(() => {
    const sameVideo = startVideoRef.current === videoId;
    startVideoRef.current = videoId;
    if (!sameVideo) {
      positionRef.current = undefined;
    }
    const currentSeconds = positionRef.current;
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
              mode: streamMode,
              signedInYoutube: tvYoutube,
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
              // Caption tracks are missing from the TV response as well.
              parsedDataTV.subtitles = parsed.subtitles;
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
            if (streaming && vlcEnabled) {
              // `youtube` is necessarily present here — the streams come from
              // this instance — but only the check makes that visible to the
              // type checker.
              // A SABR stream from before the switch must not keep running.
              replaceSabrSource(undefined);
              parsedDataTV.vlc_source = youtube
                ? await resolveVlcSource(streaming, youtube)
                : undefined;
            } else if (streaming) {
              parsedDataTV.generated_hls_url = await generateIfPossible(
                streaming,
                playbackMode,
                {
                  allowAv1: appSettings.av1Enabled,
                  subtitles: nativeSubtitleOptions(streaming),
                },
              );
              // See above: the check only informs the type checker.
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
          mode: streamMode,
          signedInYoutube: tvYoutube,
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
            if (vlcEnabled) {
              // A SABR stream from before the switch must not keep running.
              replaceSabrSource(undefined);
              parsedData.vlc_source = await resolveVlcSource(
                streaming,
                youtube,
              );
            } else {
              parsedData.generated_hls_url = await generateIfPossible(
                streaming,
                playbackMode,
                {
                  allowAv1: appSettings.av1Enabled,
                  subtitles: nativeSubtitleOptions(streaming),
                },
              );
              parsedData.sabr_hls_url = replaceSabrSource(
                await startSabrIfPossible(streaming, playbackMode, {
                  youtube,
                  allowAv1: appSettings.av1Enabled,
                }),
              )?.masterUri;
            }
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
    // A refresh or a changed setting keeps the position set before; a new
    // video, such as the one autoplay switches to on the same screen, starts
    // at its own time instead of the previous video's.
    setStartTime(previousStartSeconds =>
      playbackStartAfterReload({
        sameVideo,
        currentSeconds,
        previousStartSeconds,
        requestedStartSeconds: startTimeSeconds,
      }),
    );
  }, [
    playbackMode,
    vlcEnabled,
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
      setStartTime(position);
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
      setStartTime(positionRef.current);
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
      positionRef.current = continueAtSeconds ?? positionRef.current;
      setStartTime(positionRef.current);
      setRefresh(previous => !previous);
    },
  };
}
