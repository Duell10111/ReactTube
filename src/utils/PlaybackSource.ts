/**
 * Auflösung der Streaming-Daten über eine Client-Kette — Plan-Phase 1.4/1.8.
 *
 * Vorher holte die App ihre Streams von genau einem Client (`TV` für die
 * TV-Oberfläche, `IOS` für HLS). Beides ist brüchig: `TV` liefert seit geraumer
 * Zeit für jedes Video `UNPLAYABLE`, und einzelne Clients fallen ohne Vorwarnung
 * aus. Hier wird stattdessen eine gemessene Reihenfolge durchprobiert, bis ein
 * Client abspielbare Formate liefert — dasselbe Vorgehen wie SmartTubes
 * `VideoInfoService#firstPlayable`.
 *
 * Die Reihenfolge stammt aus `YouTube.js/docs/playback-matrix.md`
 * (`npm run matrix` im Fork erneuert sie).
 */
// @ts-ignore Ignore no type definitions found
import {InnerTubeClient} from "youtubei.js/dist/src/types";

import Logger from "@/utils/Logger";
import {Innertube, YT, YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("PLAYBACK");

/** Gemessen 6/6 im Testset; `TV` und `TV_EMBEDDED` fehlen bewusst (immer UNPLAYABLE). */
const CLIENTS_DEFAULT = [
  "TV_SIMPLY",
  "IOS",
  "VISIONOS",
  "ANDROID_VR",
  "TV_DOWNGRADED",
  "MWEB",
] as InnerTubeClient[];

/**
 * Wenn ein HLS-Manifest von YouTube gewünscht ist: die Clients zuerst, die eins
 * mitliefern. Bis der eigene HLS-Generator steht (Plan-Phase 2), ist das der
 * einzige Weg zu adaptivem Streaming auf Apple-Geräten.
 */
const CLIENTS_PREFER_HLS = [
  "VISIONOS",
  "IOS",
  "TV_SIMPLY",
  "ANDROID_VR",
  "TV_DOWNGRADED",
  "MWEB",
] as InnerTubeClient[];

export interface StreamingSource {
  info: YT.VideoInfo;
  client: string;
  /** `fallback`, wenn kein Client die Hauptbedingung erfüllte. */
  satisfied: "primary" | "fallback";
}

/**
 * Holt die Streaming-Daten über die Client-Kette.
 *
 * @param youtube - **Anonyme** Instanz. Eine angemeldete Session beantwortet
 *   Anfragen für Nicht-TV-Clients mit HTTP 400, weil sie ihre Zugangsdaten
 *   mitschickt.
 * @param target - Video-ID oder Navigations-Endpunkt.
 * @param options.preferHls - HLS-fähige Clients bevorzugen.
 */
export async function resolveStreamingSource(
  youtube: Innertube,
  target: string | YTNodes.NavigationEndpoint,
  options?: {preferHls?: boolean},
): Promise<StreamingSource | undefined> {
  try {
    const resolved = await youtube.getPlayableInfo(target, {
      clients: options?.preferHls ? CLIENTS_PREFER_HLS : CLIENTS_DEFAULT,
      on_attempt: attempt =>
        LOGGER.debug(
          `Client ${attempt.client}: ${
            attempt.error ??
            `${attempt.status} · ${attempt.usable_video_formats} nutzbare Videoformate`
          } (${attempt.duration_ms} ms)`,
        ),
    });

    LOGGER.info(
      `Streams von ${resolved.client}${resolved.satisfied === "fallback" ? " (Notlösung)" : ""} · ` +
        `${resolved.attempts.length} Versuch(e)`,
    );

    return {
      info: resolved.info,
      client: resolved.client,
      satisfied: resolved.satisfied,
    };
  } catch (error: any) {
    LOGGER.warn(
      `Kein Client lieferte Streams: ${String(error?.message ?? error)}`,
    );
    return undefined;
  }
}
