/**
 * Die Fehler-Ladder der Wiedergabe — Plan-Phase 4.1.
 *
 * Eine einzelne Quelle fällt regelmäßig aus: ein Client hört auf zu liefern, ein
 * Codec fehlt dem Gerät, eine URL läuft ab. SmartTube beantwortet das mit
 * `switchNextFormat` — probiere der Reihe nach, was noch da ist, statt mit einer
 * Fehlermeldung stehenzubleiben. Hier ist dieselbe Reihenfolge als Datenstruktur
 * abgelegt, damit sie an einer Stelle steht und nicht in jedem Player noch
 * einmal.
 *
 * **Eine Erfahrung steckt fest darin:** ein Player, dem der Decoder fehlt,
 * meldet keinen Fehler — er bleibt stumm im Ladezustand stehen (gemessen mit
 * einem Manifest, das nur AV1 anbot: der Media-Server-Prozess starb, `onError`
 * kam nie). Deshalb reicht `onError` als Auslöser nicht; der Stillstands-Wächter
 * in `VideoComponent` gehört zur Ladder dazu.
 */

import type {PlaybackMode} from "@/utils/PlaybackSource";

/** Woran eine Stufe erkannt wird — für Protokoll und Anzeige. */
export type PlaybackSourceKind =
  | "generated-hls"
  | "youtube-hls"
  | "progressive";

export interface PlaybackStep {
  uri: string;
  kind: PlaybackSourceKind;
  /** Kurzbeschreibung für Protokoll und Overlay. */
  label: string;
}

export function describeSourceKind(kind: PlaybackSourceKind): string {
  switch (kind) {
    case "generated-hls":
      return "eigenes HLS";
    case "youtube-hls":
      return "YouTube-HLS";
    case "progressive":
      return "progressiv";
  }
}

/**
 * In welcher Reihenfolge die Stufen je nach Einstellung probiert werden.
 *
 * **Die gewählte Einstellung steht immer vorn.** Sie ist die Entscheidung des
 * Benutzers, nicht ein Vorschlag — wer YouTube-HLS wählt, will nicht erst
 * zwanzig Sekunden auf einen Fehlschlag des eigenen Manifests warten. Die
 * übrigen Stufen bleiben als Auffangnetz dahinter, absteigend nach dem, was sie
 * an Qualität mitbringen.
 */
const ORDER_BY_MODE: Record<PlaybackMode, PlaybackSourceKind[]> = {
  generated: ["generated-hls", "youtube-hls", "progressive"],
  "youtube-hls": ["youtube-hls", "generated-hls", "progressive"],
  progressive: ["progressive", "youtube-hls", "generated-hls"],
};

/**
 * Stellt die Stufen zusammen, die für dieses Video zur Verfügung stehen.
 *
 * Doppelte URLs fallen raus: steht die App auf YouTube-HLS und wurde kein
 * eigenes Manifest gebaut, bleibt genau eine HLS-Stufe übrig.
 */
export function buildPlaybackLadder(
  sources: {
    generatedHlsUrl?: string;
    youtubeHlsUrl?: string;
    progressiveUrl?: string;
  },
  mode: PlaybackMode = "generated",
): PlaybackStep[] {
  const byKind: Record<PlaybackSourceKind, string | undefined> = {
    "generated-hls": sources.generatedHlsUrl,
    "youtube-hls": sources.youtubeHlsUrl,
    progressive: sources.progressiveUrl,
  };

  const order = ORDER_BY_MODE[mode] ?? ORDER_BY_MODE.generated;

  const candidates: PlaybackStep[] = order
    .map(kind => ({uri: byKind[kind], kind}))
    .filter(
      (step): step is {uri: string; kind: PlaybackSourceKind} => !!step.uri,
    )
    .map(step => ({...step, label: describeSourceKind(step.kind)}));

  const seen = new Set<string>();

  return candidates.filter(step => {
    if (seen.has(step.uri)) {
      return false;
    }
    seen.add(step.uri);
    return true;
  });
}

/** Ob die beiden Ladders dieselben Stufen in derselben Reihenfolge haben. */
export function sameLadder(a: PlaybackStep[], b: PlaybackStep[]): boolean {
  return a.length === b.length && a.every((step, i) => step.uri === b[i].uri);
}
