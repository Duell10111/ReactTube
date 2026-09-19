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
  type StreamingSource,
} from "@/utils/PlaybackSource";
import {YT, YTTV, YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("VIDEO");

/**
 * Baut das eigene Manifest, wenn die Quelle es hergibt (Plan-Phase 2c).
 *
 * Bewusst vor dem Veröffentlichen der Metadaten: der Bau kostet einen
 * Range-Request je Rendition (rund eine halbe Sekunde). Würde er nachlaufen,
 * bekäme der Player erst YouTubes Manifest und danach unseres — und startete
 * die Wiedergabe sichtbar neu.
 */
async function generateIfPossible(
  streaming: StreamingSource,
  options: GeneratedHlsOptions,
) {
  if (!streaming.canGenerateHls) {
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
  const [watchNextFeed, setWatchNextFeed] = useState<ElementData[]>();
  const [watchNextSections, setWatchNextSections] =
    useState<HorizontalData[]>();
  const {appSettings} = useAppData();
  const [startTime, setStartTime] = useState<number>();

  console.log("Starttime: ", startTime);

  // TODO: Maybe replace with fkt in the future?
  const [refresh, setRefresh] = useState<boolean>(false);

  useEffect(() => {
    const startTimeSeconds =
      typeof videoId !== "string"
        ? ((videoId.payload.startTimeSeconds as number) ?? passedStartSeconds)
        : passedStartSeconds;
    if (client === "TV") {
      // Plan-Phase 1.8: Endpunkte getrennt beziehen. Die Metadaten kommen von der
      // angemeldeten TV-Instanz (nur sie liefert Watch-Next und Transport-Controls),
      // die Streams von der anonymen Instanz über die Client-Kette — der TV-Client
      // antwortet auf /player unabhängig vom Login mit UNPLAYABLE.
      Promise.all([
        tvYoutube?.tv?.getInfo(videoId),
        youtube
          ? resolveStreamingSource(youtube, videoId, {
              mode: playbackModeFromSettings(appSettings),
            })
          : undefined,
      ])
        .then(async ([tvInfo, streaming]) => {
          // Plan-Phase 0.4: festhalten, was die Clients tatsächlich geliefert haben.
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
              // Die TV-Antwort enthält keine Formate — das Abspielformat muss
              // aus der Antwort des Stream-Clients kommen.
              parsedDataTV.best_format = parsed.best_format;
              parsedDataTV.playlist = parsedDataTV.playlist ?? parsed.playlist;
            }
            // Vor dem Veröffentlichen der Metadaten: sonst bekäme der Player
            // erst YouTubes Manifest und eine halbe Sekunde später unseres —
            // ein sichtbarer Neustart der Wiedergabe.
            if (streaming) {
              parsedDataTV.generated_hls_url = await generateIfPossible(
                streaming,
                {allowAv1: appSettings.av1Enabled},
              );
            }
            setVideoInfo(parsedDataTV);
            setWatchNextSections(parsedDataTV.watchNextSections);
            setWatchNextFeed(
              parsedDataTV.watchNextSections?.[parsedDataTV.playlist ? 1 : 0]
                ?.parsedData,
            );
          } else {
            LOGGER.warn("No TVInfo available! This should never happen.");
          }
        })
        .catch(LOGGER.warn);
    } else {
      youtube &&
        resolveStreamingSource(youtube, videoId, {
          mode: playbackModeFromSettings(appSettings),
        })
          .then(async streaming => {
            if (!streaming) {
              return;
            }
            LOGGER.info(
              describeStreamingData(streaming.info, `${streaming.client}`),
            );
            videoRef.current = streaming.info;
            const parsedData = getElementDataFromVideoInfo(streaming.info);
            parsedData.generated_hls_url = await generateIfPossible(streaming, {
              allowAv1: appSettings.av1Enabled,
            });
            setVideoInfo(parsedData);
            parsedData.watchNextFeed &&
              setWatchNextFeed(parsedData.watchNextFeed);
          })
          .catch(LOGGER.warn);
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
    appSettings.hlsEnabled,
    appSettings.localHlsEnabled,
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
  }, [videoInfo, youtube]);

  /**
   * Die Stufen, die für dieses Video bereitstehen (Plan-Phase 4.1), und auf
   * welcher gerade gespielt wird.
   */
  const ladder = useMemo(
    () =>
      buildPlaybackLadder({
        generatedHlsUrl: videoInfo?.generated_hls_url,
        youtubeHlsUrl: videoInfo?.hls_manifest_url,
        progressiveUrl: httpVideoURL,
      }),
    [videoInfo?.generated_hls_url, videoInfo?.hls_manifest_url, httpVideoURL],
  );

  const [ladderIndex, setLadderIndex] = useState(0);
  const ladderRef = useRef<PlaybackStep[]>([]);
  const ladderIndexRef = useRef(0);

  // Eine neue Quellenlage — anderes Video, Aktualisierung, umgestellte
  // Einstellung — beginnt wieder oben. Ein bloßes Nachreichen derselben Stufen
  // darf die Ladder dagegen nicht zurücksetzen, sonst landet ein gerade
  // abgestiegener Player sofort wieder auf der defekten Stufe.
  useEffect(() => {
    if (!sameLadder(ladderRef.current, ladder)) {
      ladderRef.current = ladder;
      ladderIndexRef.current = 0;
      setLadderIndex(0);
    }
  }, [ladder]);

  const currentStep = ladder[Math.min(ladderIndex, ladder.length - 1)];

  /** Letzte bekannte Abspielposition — überlebt Stufenwechsel und Auffrischung. */
  const positionRef = useRef(0);

  const reportProgress = useCallback((seconds: number) => {
    positionRef.current = seconds;
  }, []);

  /**
   * Meldet, dass die laufende Stufe nicht trägt — als Fehler oder als
   * Stillstand.
   *
   * @returns ob noch eine Stufe übrig war.
   */
  const reportPlaybackFailure = useCallback((reason: string) => {
    // Bewusst über Refs statt über den State-Updater: dort hätte das Protokoll
    // als Seiteneffekt gestanden, den React doppelt ausführen darf.
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
        `weiter mit ${steps[next].label} ab ${Math.floor(positionRef.current)} s.`,
    );

    ladderIndexRef.current = next;
    setLadderIndex(next);

    // Die nächste Stufe fängt dort an, wo die vorige stehengeblieben ist.
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
   * Frischt die Streaming-Daten auf, bevor sie ablaufen — Plan-Phase 4.2.
   *
   * Die Segment-URLs tragen ein `expire` von rund vier Stunden. Das reicht für
   * die meisten Videos, aber nicht für ein pausiertes, ein langes, oder eines,
   * das aus dem Hintergrund zurückkommt: danach antwortet googlevideo mit 403,
   * und weil ein hängender Player keinen Fehler meldet, sieht das aus wie ein
   * Einfrieren. Das selbst gebaute Manifest ist besonders betroffen — es backt
   * die URLs in die Playlists ein.
   *
   * Ersetzt den auskommentierten Block, der hier stand: der frischte ohne
   * Vorlauf und ohne Position auf.
   */
  const expiresAt = videoInfo?.expires?.getTime();

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    // Eine Minute Vorlauf, damit der Austausch fertig ist, bevor die alten URLs
    // ungültig werden.
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
    // Das eigene Manifest hat Vorrang — es trägt mehrsprachigen Ton und mit AV1
    // 4K. Fehlt es, bleibt YouTubes eigenes (Phase 2a) der Weg.
    hlsManifestUrl: videoInfo?.generated_hls_url ?? videoInfo?.hls_manifest_url,
    httpVideoURL,
    /** Die Quelle, die gerade gilt — Ergebnis der Ladder aus Plan-Phase 4.1. */
    videoUrl: currentStep?.uri,
    playbackSource: currentStep,
    playbackLadderSize: ladder.length,
    playbackLadderStep:
      Math.min(ladderIndex, Math.max(ladder.length - 1, 0)) + 1,
    reportPlaybackFailure,
    reportProgress,
    startTime,
    watchNextFeed,
    fetchNextVideoContinue,
    watchNextSections,
    //Actions
    actionData,
    like,
    dislike,
    removeRating,
    addToWatchHistory,
    refresh: (resumeSeconds?: number) => {
      setStartTime(resumeSeconds ?? positionRef.current ?? undefined);
      setRefresh(previous => !previous);
    },
  };
}

interface ActionData {
  like?: boolean;
  dislike?: boolean;
}
