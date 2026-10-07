/**
 * Self-built HLS manifest from the adaptive formats — plan phase 2c.
 *
 * YouTube's own manifest (phase 2a) gives AVPlayer at most avc1 in 1080p,
 * with muxed audio and no language choice. The adaptive formats carry both —
 * 2160p in av01 and separate audio tracks — but need a written-out segment
 * list: AVPlayer does not resolve a `sidx` index itself, unlike ExoPlayer with
 * DASH. The fork generates the list (`YouTube.js/src/utils/HlsManifest.ts`);
 * it is stored here.
 *
 * **How it reaches the player (spike 2.0, measured):** AVPlayer refuses to
 * load an HLS master over `file://` — the attempt ends in
 * `AVFoundationErrorDomain -11800 / OSStatus -16913`
 * (`assetProperty_MediaPlaybackValidation`) without any error reaching the
 * player. The same files served over `http://` load fine; verified with
 * AVFoundation on the Mac.
 *
 * Only **the master** is affected, though. Passed as a `data:` URI it is
 * accepted — and may reference the media playlists from there via absolute
 * `file://` URIs. So the large playlists stay files in the cache, and the
 * master (about 4 KB) goes into the player's source directly as a `data:`
 * URI. The app therefore needs **no local server**; phase 3 stays reserved
 * for SABR.
 *
 * **This needs a patch** (`patches/react-native-video+6.19.2.patch`):
 * `react-native-video` sorts sources by scheme into "network", "asset" and
 * "everything else", and `data:` fell into the third group. There it looks up
 * the URI as a bundle resource and ends up with an empty path —
 * `AVFoundationErrorDomain -11828 "Cannot Open"`. The patch adds `data` to the
 * asset detection, so the URI reaches `AVURLAsset` unchanged. Two lines,
 * `lib/Video.js` and `src/Video.tsx`.
 *
 * **Client requirement:** byte-range delivery is capped after about 0.37 MB
 * (HTTP 403) for most InnerTube clients. As measured, `VISIONOS` is served
 * completely, `IOS`, `TV_SIMPLY` and `ANDROID_VR` are not — see
 * `YouTube.js/docs/byte-range-cap.md`. The streaming data must therefore come
 * from an uncapped client; `PlaybackSource.ts` takes care of that.
 *
 * Subtitle tracks are added as WebVTT renditions (verified with AVFoundation
 * on the Mac: every rendition shows up in the legible group with its `NAME`).
 */
import {Directory, File, Paths} from "expo-file-system";

import Logger from "@/utils/Logger";
import {
  addSubtitlesToMasterPlaylist,
  buildSubtitleMediaPlaylist,
  HlsSubtitleRendition,
  SubtitleTrack,
} from "@/utils/Subtitles";
import {YT} from "@/utils/Youtube";

const LOGGER = Logger.extend("PLAYBACK");

const ROOT_DIRECTORY = "generated-hls";

/** After this time the segment URLs have expired anyway. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface GeneratedHlsOptions {
  /**
   * Also offer AV1 variants.
   *
   * Without AV1 the ladder ends at 1080p — YouTube offers no more in avc1.
   * AV1 adds 1440p and 2160p, but only Apple TV 4K (3rd gen) decodes them in
   * hardware. Without a decoder the player stays in the loading state
   * **without** reporting an error — the ladder then does not kick in. So it
   * is a deliberate choice, not a default.
   */
  allowAv1?: boolean;
  /** Highest offered video height in pixels. */
  maxHeight?: number;
  /**
   * Subtitle tracks to offer as HLS renditions, so the native player lists
   * them in its own subtitle menu. `label` names them in that menu.
   */
  subtitles?: {
    tracks: SubtitleTrack[];
    label: (track: SubtitleTrack) => string;
  };
}

function rootDirectory() {
  return new Directory(Paths.cache, ROOT_DIRECTORY);
}

/**
 * Removes old manifests.
 *
 * The segment URLs in a manifest expire; a leftover directory is just
 * ballast in the cache.
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

      // The timestamp is part of the directory name (`<videoId>-<ms>`)
      // because expo-file-system exposes no modification time for directories.
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
 * Replaces the file names in the master with absolute `file://` URIs.
 *
 * Needed because the master, as a `data:` URI, has no base a relative name
 * could resolve against.
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

      // The line after an EXT-X-STREAM-INF is the bare file name.
      return uriByName.get(line) ?? line;
    })
    .join("\n");
}

/**
 * Builds the manifest, stores the media playlists in the cache and wraps the
 * master as a `data:` URI.
 *
 * @returns Source for the player, or `undefined` if the formats do not allow
 *   building one (SABR-only, no mp4, no index). The caller then falls back to
 *   YouTube's own manifest.
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
        // avc1 always forms the base ladder; AV1 only adds the heights avc1
        // does not reach.
        codec_preference: options?.allowAv1 ? ["avc1", "av01"] : ["avc1"],
        max_height: options?.maxHeight,
      },
    });

    // A fresh directory per call: the previous round's segment URLs are bound
    // to an expired session and must not live on.
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

    const renditions: HlsSubtitleRendition[] = [];
    const duration = info.basic_info.duration ?? 0;
    if (duration > 0) {
      options?.subtitles?.tracks.forEach((track, index) => {
        const file = new File(directory, `subtitles-${index}.m3u8`);
        file.create({overwrite: true});
        file.write(buildSubtitleMediaPlaylist(track, duration));
        renditions.push({
          name: options.subtitles?.label(track) ?? track.name,
          languageCode: track.languageCode,
          uri: file.uri,
        });
      });
    }

    const master = addSubtitlesToMasterPlaylist(
      withAbsoluteReferences(manifest.master, uriByName),
      renditions,
    );

    // Percent-encoded on purpose instead of base64: `encodeURIComponent` is
    // UTF-8 safe (track names can contain umlauts) and needs no extra
    // dependency. Checked with AVFoundation; it is accepted.
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
        `${renditions.length} subtitle tracks · ` +
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
