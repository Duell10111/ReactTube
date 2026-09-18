/**
 * Eigenes HLS-Manifest aus den adaptiven Formaten — Plan-Phase 2c.
 *
 * YouTubes eigenes Manifest (Phase 2a) liefert auf AVPlayer höchstens avc1 in
 * 1080p, mit gemuxtem Ton und ohne Sprachwahl. Die adaptiven Formate tragen
 * beides — 2160p in av01 und getrennte Tonspuren —, brauchen aber eine
 * ausgeschriebene Segmentliste: AVPlayer löst einen `sidx`-Index nicht selbst
 * auf, anders als ExoPlayer bei DASH. Der Fork erzeugt die Liste
 * (`YouTube.js/src/utils/HlsManifest.ts`), hier wird sie abgelegt.
 *
 * **Wie es zum Player kommt (Spike 2.0, gemessen):** AVPlayer weigert sich, ein
 * HLS-Master über `file://` zu laden — der Versuch endet in
 * `AVFoundationErrorDomain -11800 / OSStatus -16913`
 * (`assetProperty_MediaPlaybackValidation`), ohne dass ein Fehler beim Player
 * ankommt. Dieselben Dateien über `http://` ausgeliefert laden anstandslos;
 * nachgemessen mit AVFoundation auf dem Mac.
 *
 * Es ist aber **nur das Master** betroffen. Als `data:`-URI übergeben wird es
 * angenommen — und darf von dort aus die Medien-Playlists per absolutem
 * `file://` referenzieren. Also: die großen Playlists bleiben Dateien im Cache,
 * das Master (knapp 4 KB) wandert als `data:`-URI direkt in die Quelle des
 * Players. Damit braucht die App **keinen lokalen Server**; Phase 3 bleibt SABR
 * vorbehalten.
 *
 * **Dafür ist ein Patch nötig** (`patches/react-native-video+6.19.2.patch`):
 * `react-native-video` teilt Quellen anhand des Schemas in „Netzwerk", „Asset"
 * und „alles andere" ein, und `data:` fiel in die dritte Gruppe. Dort sucht es
 * die URI als Bundle-Ressource und landet bei einem leeren Pfad —
 * `AVFoundationErrorDomain -11828 „Cannot Open"`. Der Patch ergänzt `data` in
 * der Asset-Erkennung, womit die URI unverändert an `AVURLAsset` durchgereicht
 * wird. Zwei Zeilen, `lib/Video.js` und `src/Video.tsx`.
 *
 * **Client-Bedingung:** Die Byte-Range-Auslieferung ist für die meisten
 * InnerTube-Clients nach rund 0,37 MB gekappt (HTTP 403). Gemessen wird
 * `VISIONOS` vollständig bedient, `IOS`, `TV_SIMPLY` und `ANDROID_VR` nicht —
 * siehe `YouTube.js/docs/byte-range-cap.md`. Die Streaming-Daten müssen also von
 * einem ungekappten Client stammen; darum kümmert sich `PlaybackSource.ts`.
 */
import {Directory, File, Paths} from "expo-file-system";

import Logger from "@/utils/Logger";
import {YT} from "@/utils/Youtube";

const LOGGER = Logger.extend("PLAYBACK");

const ROOT_DIRECTORY = "generated-hls";

/** Nach dieser Zeit sind die Segment-URLs ohnehin abgelaufen. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface GeneratedHlsOptions {
  /**
   * AV1-Varianten mit anbieten.
   *
   * Ohne AV1 endet die Leiter bei 1080p — mehr gibt YouTube in avc1 nicht her.
   * Mit AV1 kommen 1440p und 2160p dazu, aber nur Apple TV 4K (3. Gen)
   * dekodiert sie in Hardware. Fehlt der Decoder, bleibt der Player im
   * Ladezustand stehen, **ohne** einen Fehler zu melden — die Ladder greift
   * dann nicht. Deshalb ist es eine bewusste Entscheidung, keine Vorgabe.
   */
  allowAv1?: boolean;
  /** Höchste angebotene Videohöhe in Pixeln. */
  maxHeight?: number;
}

function rootDirectory() {
  return new Directory(Paths.cache, ROOT_DIRECTORY);
}

/**
 * Räumt alte Manifeste weg.
 *
 * Die Segment-URLs in einem Manifest laufen ab; ein liegengebliebenes
 * Verzeichnis ist nur noch Ballast im Cache.
 */
function pruneOldManifests(keep: string) {
  try {
    const root = rootDirectory();

    if (!root.exists) {
      return;
    }

    const now = Date.now();

    for (const entry of root.list()) {
      if (!(entry instanceof Directory) || entry.name === keep) {
        continue;
      }

      // Der Zeitstempel steckt im Verzeichnisnamen (`<videoId>-<ms>`), weil
      // expo-file-system keine Änderungszeit für Verzeichnisse herausgibt.
      const created = Number(entry.name.split("-").pop());

      if (!Number.isFinite(created) || now - created > MAX_AGE_MS) {
        entry.delete();
      }
    }
  } catch (error) {
    LOGGER.debug(`Aufräumen alter Manifeste fehlgeschlagen: ${String(error)}`);
  }
}

/**
 * Ersetzt die Dateinamen im Master durch absolute `file://`-URIs.
 *
 * Nötig, weil das Master als `data:`-URI keine Basis hat, gegen die sich ein
 * relativer Name auflösen ließe.
 */
function withAbsoluteReferences(
  master: string,
  uriByName: Map<string, string>,
): string {
  return master
    .split("\n")
    .map(line => {
      if (line.startsWith("#EXT-X-MEDIA")) {
        return line.replace(/URI="([^"]+)"/, (match, name) => {
          const uri = uriByName.get(name);
          return uri ? `URI="${uri}"` : match;
        });
      }

      // Die Zeile hinter einem EXT-X-STREAM-INF ist der blanke Dateiname.
      return uriByName.get(line) ?? line;
    })
    .join("\n");
}

/**
 * Baut das Manifest, legt die Medien-Playlists im Cache ab und verpackt das
 * Master als `data:`-URI.
 *
 * @returns Quelle für den Player, oder `undefined`, wenn sich aus den Formaten
 *   keins bauen lässt (SABR-only, kein mp4, kein Index). Der Aufrufer fällt dann
 *   auf YouTubes eigenes Manifest zurück.
 */
export async function buildGeneratedHls(
  info: YT.VideoInfo,
  videoId: string,
  options?: GeneratedHlsOptions,
): Promise<string | undefined> {
  const started = Date.now();

  try {
    const manifest = await info.toHLS({
      manifest_options: {
        mode: "byterange",
        // avc1 bildet immer die Grundleiter; AV1 steuert nur die Höhen bei, die
        // avc1 nicht erreicht.
        codec_preference: options?.allowAv1 ? ["avc1", "av01"] : ["avc1"],
        max_height: options?.maxHeight,
      },
    });

    // Frisches Verzeichnis je Aufruf: die Segment-URLs der vorigen Runde sind
    // an eine abgelaufene Session gebunden und dürfen nicht weiterleben.
    const name = `${videoId.replace(/[^a-zA-Z0-9_-]/g, "_")}-${started}`;
    const directory = new Directory(rootDirectory(), name);

    directory.create({intermediates: true, idempotent: true});

    const uriByName = new Map<string, string>();

    for (const playlist of manifest.playlists) {
      const file = new File(directory, playlist.name);
      file.create({overwrite: true});
      file.write(playlist.content);
      uriByName.set(playlist.name, file.uri);
    }

    const master = withAbsoluteReferences(manifest.master, uriByName);

    // Bewusst prozentkodiert statt base64: `encodeURIComponent` ist UTF-8-sicher
    // (Spurnamen können Umlaute tragen) und braucht keine zusätzliche
    // Abhängigkeit. Von AVFoundation geprüft, wird angenommen.
    const source = `data:application/vnd.apple.mpegurl,${encodeURIComponent(master)}`;

    pruneOldManifests(name);

    const variants = master
      .split("\n")
      .filter(line => line.startsWith("#EXT-X-STREAM-INF"));
    const top = variants
      .map(line => parseInt(line.match(/RESOLUTION=\d+x(\d+)/)?.[1] ?? "0", 10))
      .sort((a, b) => b - a)[0];
    const codecs = [
      ...new Set(
        variants.map(line => line.match(/CODECS="([^.,"]+)/)?.[1] ?? "?"),
      ),
    ];

    LOGGER.info(
      `Eigenes HLS gebaut: ${variants.length} Varianten bis ${top}p ` +
        `(${codecs.join(", ")}) · ${manifest.playlists.length} Playlists · ` +
        `Master ${source.length} Zeichen · ${Date.now() - started} ms`,
    );

    return source;
  } catch (error: any) {
    LOGGER.warn(
      `Eigenes HLS nicht möglich (${String(
        error?.message ?? error,
      )}) — es bleibt bei YouTubes Manifest.`,
    );
    return undefined;
  }
}
