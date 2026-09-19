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
import Logger from "@/utils/Logger";
import {describeStreamingData} from "@/utils/PlaybackDiagnostics";
import {resolveStreamingSource} from "@/utils/PlaybackSource";
import {YT, YTTV, YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("VIDEO");

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
              preferHls: appSettings.hlsEnabled,
            })
          : undefined,
      ])
        .then(([tvInfo, streaming]) => {
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
          preferHls: appSettings.hlsEnabled,
        })
          .then(streaming => {
            if (!streaming) {
              return;
            }
            LOGGER.info(
              describeStreamingData(streaming.info, `${streaming.client}`),
            );
            videoRef.current = streaming.info;
            const parsedData = getElementDataFromVideoInfo(streaming.info);
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
  }, [appSettings.hlsEnabled, videoId, youtube, tvYoutube, client, refresh]);

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

  // // Trigger refresh if streaming data expired
  // const targetTimestamp = Video?.streaming_data?.expires?.getDate?.();
  // useEffect(() => {
  //   if (!targetTimestamp) {
  //     return;
  //   }
  //   // Berechnen Sie, wie lange gewartet werden muss, bis der Effekt ausgelöst wird
  //   const now = Date.now();
  //   const delay = targetTimestamp - now;
  //
  //   if (delay > 0) {
  //     // Setzen Sie einen Timer, um den Effekt nach der berechneten Verzögerung auszulösen
  //     const timer = setTimeout(() => {
  //       // Refresh Video Data
  //       fetchVideoData();
  //       LOGGER.info("Refresh expired streaming data!");
  //     }, delay);
  //
  //     // Bereinigungsfunktion, um den Timer zu löschen
  //     return () => clearTimeout(timer);
  //   }
  // }, [targetTimestamp]);

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
    hlsManifestUrl: videoInfo?.hls_manifest_url,
    httpVideoURL,
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
      // TODO: Set Starttime to start from current state?
      console.log("Resume: ", resumeSeconds);
      setStartTime(resumeSeconds);
      setRefresh(!refresh);
    },
  };
}

interface ActionData {
  like?: boolean;
  dislike?: boolean;
}
