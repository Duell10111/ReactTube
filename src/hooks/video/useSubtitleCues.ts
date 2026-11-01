import {useEffect, useState} from "react";

import {useTranslation} from "@/localization";
import Logger from "@/utils/Logger";
import {showMessage} from "@/utils/ShowFlashMessageHelper";
import {
  getSubtitleUrl,
  parseJson3Subtitles,
  requiresPoToken,
  SubtitleCue,
  SubtitleTrack,
} from "@/utils/Subtitles";

const LOGGER = Logger.extend("SUBTITLES");

/** Switching back and forth between tracks should not refetch them. */
const CACHE_SIZE = 8;
const cache = new Map<string, SubtitleCue[]>();

/**
 * Google answers the timedtext endpoint with HTTP 429 and a "Sorry" page once
 * it flags the IP, for every client and even with a PoToken (measured
 * 2026-10-07; other InnerTube calls kept working). Further requests only
 * prolong the block, so the app pauses subtitle requests for a while.
 */
const RATE_LIMIT_PAUSE_MS = 10 * 60_000;
let rateLimitedUntil = 0;

/**
 * Auto-translations (`tlang`) are answered with HTTP 429 on every request
 * while plain tracks still load (measured 2026-10-27), and retrying them is
 * what escalates to the IP-wide block. A 429 on a translation therefore only
 * pauses translations, and for longer.
 */
const TRANSLATION_RATE_LIMIT_PAUSE_MS = 60 * 60_000;
let translationRateLimitedUntil = 0;

class SubtitleRateLimitError extends Error {
  constructor(
    message: string,
    readonly translation: boolean,
  ) {
    super(message);
  }
}

async function loadCues(url: string, translation: boolean) {
  const cached = cache.get(url);
  if (cached) {
    return cached;
  }
  const now = Date.now();
  if (now < rateLimitedUntil) {
    throw new SubtitleRateLimitError("paused after HTTP 429", false);
  }
  if (translation && now < translationRateLimitedUntil) {
    throw new SubtitleRateLimitError(
      "translations paused after HTTP 429",
      true,
    );
  }
  const response = await fetch(url);
  if (response.status === 429) {
    if (translation) {
      translationRateLimitedUntil =
        Date.now() + TRANSLATION_RATE_LIMIT_PAUSE_MS;
    } else {
      rateLimitedUntil = Date.now() + RATE_LIMIT_PAUSE_MS;
    }
    throw new SubtitleRateLimitError("HTTP 429", translation);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const body = await response.text();
  // PoToken-protected URLs answer 200 with an empty body.
  if (!body) {
    throw new Error("empty response");
  }
  const cues = parseJson3Subtitles(JSON.parse(body));
  cache.set(url, cues);
  if (cache.size > CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    oldest !== undefined && cache.delete(oldest);
  }
  return cues;
}

function errorMessageKey(error: unknown) {
  if (!(error instanceof SubtitleRateLimitError)) {
    return "video.player.subtitles.loadError" as const;
  }
  return error.translation
    ? ("video.player.subtitles.translationRateLimited" as const)
    : ("video.player.subtitles.rateLimited" as const);
}

/** Fetches and parses the cues of the selected track. */
export function useSubtitleCues(track?: SubtitleTrack) {
  const {t} = useTranslation();
  const [cues, setCues] = useState<SubtitleCue[]>([]);

  useEffect(() => {
    setCues([]);
    if (!track) {
      return;
    }
    if (requiresPoToken(track)) {
      LOGGER.warn(`Track ${track.id} needs a PoToken; it may load empty`);
    }
    let cancelled = false;
    loadCues(getSubtitleUrl(track), !!track.translation)
      .then(result => {
        if (!cancelled) {
          setCues(result);
        }
      })
      .catch(error => {
        if (cancelled) {
          return;
        }
        LOGGER.warn(`Loading subtitles ${track.id} failed: ${error}`);
        showMessage({
          type: "warning",
          message: t(errorMessageKey(error)),
          // Long enough to read; the default is meant for short confirmations.
          duration: 4000,
        });
      });
    return () => {
      cancelled = true;
    };
    // `t` only changes with the UI language, which must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  return cues;
}
