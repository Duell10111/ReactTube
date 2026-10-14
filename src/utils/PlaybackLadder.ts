/**
 * The playback fallback ladder — plan phase 4.1.
 *
 * A single source fails regularly: a client stops delivering, the device lacks
 * a codec, a URL expires. SmartTube answers that with `switchNextFormat` — try
 * whatever is left, in order, instead of stopping with an error message. The
 * same order lives here as a data structure, so it is defined in one place
 * rather than once more in every player.
 *
 * **One lesson is built in:** a player that lacks the decoder reports no error
 * — it silently stays in its loading state (measured with a manifest that only
 * offered AV1: the media server process died, `onError` never arrived). That
 * is why `onError` alone is not a sufficient trigger; the stall watchdog in
 * `VideoComponent` is part of the ladder.
 */

import type {PlaybackMode} from "@/utils/PlaybackSource";

/** How a step is identified — for logging and display. */
export type PlaybackSourceKind =
  | "vlc"
  | "sabr-hls"
  | "generated-hls"
  | "youtube-hls"
  | "progressive";

/** Which player renders the ladder's steps. */
export type PlaybackPlayer = "native" | "vlc";

export interface PlaybackStep {
  uri: string;
  kind: PlaybackSourceKind;
  /** Separate audio stream that plays alongside `uri` (VLC step only). */
  audioUri?: string;
  /** Short description for logging and the overlay. */
  label: string;
}

export function describeSourceKind(kind: PlaybackSourceKind): string {
  switch (kind) {
    case "vlc":
      return "VLC";
    case "sabr-hls":
      return "SABR";
    case "generated-hls":
      return "eigenes HLS";
    case "youtube-hls":
      return "YouTube-HLS";
    case "progressive":
      return "progressiv";
  }
}

/**
 * The order in which the steps are tried, depending on the setting.
 *
 * **The chosen setting always comes first.** It is the user's decision, not a
 * suggestion — whoever picks YouTube HLS does not want to wait twenty seconds
 * for the generated manifest to fail first. The remaining steps stay behind it
 * as a safety net, in descending order of the quality they bring.
 */
const ORDER_BY_MODE: Record<PlaybackMode, PlaybackSourceKind[]> = {
  // SABR comes first when it is chosen — behind it the phase 2 path stays
  // unchanged. The step only exists when a segment server delivers it (phase
  // 6.5); without one the ladder drops to the generated manifest on its own.
  sabr: ["sabr-hls", "generated-hls", "youtube-hls", "progressive"],
  generated: ["generated-hls", "youtube-hls", "progressive"],
  "youtube-hls": ["youtube-hls", "generated-hls", "progressive"],
  progressive: ["progressive", "youtube-hls", "generated-hls"],
};

/**
 * The order for the VLC player, independent of the resolution setting.
 *
 * VLC cannot open the generated manifest (a `data:` master with `file://`
 * playlists) and is not wired to the SABR server, so both stay out. YouTube's
 * own manifest and the progressive URL are plain HTTPS and play in VLC too.
 */
const VLC_ORDER: PlaybackSourceKind[] = ["vlc", "youtube-hls", "progressive"];

/**
 * Assembles the steps available for this video.
 *
 * Duplicate URLs are dropped: if the app is set to YouTube HLS and no
 * generated manifest was built, exactly one HLS step remains.
 */
export function buildPlaybackLadder(
  sources: {
    vlc?: {videoUrl: string; audioUrl?: string};
    sabrHlsUrl?: string;
    generatedHlsUrl?: string;
    youtubeHlsUrl?: string;
    progressiveUrl?: string;
  },
  mode: PlaybackMode = "generated",
  player: PlaybackPlayer = "native",
): PlaybackStep[] {
  const byKind: Record<PlaybackSourceKind, string | undefined> = {
    vlc: sources.vlc?.videoUrl,
    "sabr-hls": sources.sabrHlsUrl,
    "generated-hls": sources.generatedHlsUrl,
    "youtube-hls": sources.youtubeHlsUrl,
    progressive: sources.progressiveUrl,
  };

  const order =
    player === "vlc"
      ? VLC_ORDER
      : (ORDER_BY_MODE[mode] ?? ORDER_BY_MODE.generated);

  const candidates: PlaybackStep[] = order
    .map(kind => ({uri: byKind[kind], kind}))
    .filter(
      (step): step is {uri: string; kind: PlaybackSourceKind} => !!step.uri,
    )
    .map(step => ({
      ...step,
      ...(step.kind === "vlc" && sources.vlc?.audioUrl
        ? {audioUri: sources.vlc.audioUrl}
        : {}),
      label: describeSourceKind(step.kind),
    }));

  const seen = new Set<string>();

  return candidates.filter(step => {
    if (seen.has(step.uri)) {
      return false;
    }
    seen.add(step.uri);
    return true;
  });
}

/** Whether both ladders have the same steps in the same order. */
export function sameLadder(a: PlaybackStep[], b: PlaybackStep[]): boolean {
  return a.length === b.length && a.every((step, i) => step.uri === b[i].uri);
}
