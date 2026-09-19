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
 * Stellt die Stufen zusammen, die für dieses Video zur Verfügung stehen.
 *
 * Reihenfolge nach Qualität absteigend, weil jede Stufe auch ein Rückschritt
 * ist: das eigene Manifest bringt mehrsprachigen Ton und (mit AV1) 4K, YouTubes
 * Manifest ist dafür das verlässlichste, und der progressive Weg spielt bei
 * gekappten Clients nur ein paar Sekunden — besser als ein schwarzes Bild.
 *
 * Doppelte URLs fallen raus: steht die App auf YouTube-HLS, ist die erste Stufe
 * bereits dasselbe Manifest.
 */
export function buildPlaybackLadder(sources: {
  generatedHlsUrl?: string;
  youtubeHlsUrl?: string;
  progressiveUrl?: string;
}): PlaybackStep[] {
  const candidates: PlaybackStep[] = [
    {uri: sources.generatedHlsUrl, kind: "generated-hls" as const},
    {uri: sources.youtubeHlsUrl, kind: "youtube-hls" as const},
    {uri: sources.progressiveUrl, kind: "progressive" as const},
  ]
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
