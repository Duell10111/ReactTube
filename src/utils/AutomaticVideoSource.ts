import type {AutomaticPlaybackType} from "./AutomaticPlayback.ts";
import type {PlaybackStep} from "./PlaybackLadder.ts";
import type {PlaybackMode, StreamingSource} from "./PlaybackSource.ts";

export interface AutomaticVideoSource extends PlaybackStep {
  streaming: StreamingSource;
  dispose?: () => void | Promise<void>;
}

interface SourcePreparation {
  resolve: (
    mode: PlaybackMode,
    signal: AbortSignal,
  ) => Promise<StreamingSource | undefined>;
  generate: (
    source: StreamingSource,
    allowAv1: boolean,
    signal: AbortSignal,
  ) => Promise<{uri: string; dispose?: () => void} | undefined>;
  sabr: (
    source: StreamingSource,
    signal: AbortSignal,
  ) => Promise<{masterUri: string; stop: () => Promise<void>} | undefined>;
  progressive: (source: StreamingSource) => Promise<string | undefined>;
}

const modes: Record<AutomaticPlaybackType, PlaybackMode> = {
  hls: "youtube-hls",
  hlsLocal: "generated",
  hlsLocalAv1: "generated",
  sabr: "sabr",
  http: "progressive",
};

function supportsType(source: StreamingSource, type: AutomaticPlaybackType) {
  if (type === "hls") return source.hasHlsManifest;
  if (type === "hlsLocal" || type === "hlsLocalAv1")
    return source.canGenerateHls;
  if (type === "sabr") return !source.authenticated && source.canUseSabr;
  return !!source.info.streaming_data?.formats?.some(
    format => format.has_video && format.has_audio,
  );
}

/** Cache player responses for one chain, without caching a failed preparation. */
export function createAutomaticVideoPreparer(operations: SourcePreparation) {
  const sources: StreamingSource[] = [];
  let authenticated: StreamingSource | undefined;

  return async (
    type: AutomaticPlaybackType,
    signal: AbortSignal,
  ): Promise<AutomaticVideoSource | undefined> => {
    if (signal.aborted) return undefined;
    let streaming = sources.find(source => supportsType(source, type));
    if (!streaming && !authenticated) {
      streaming = await operations.resolve(modes[type], signal);
      if (signal.aborted) return undefined;
      if (streaming) {
        sources.push(streaming);
        if (streaming.authenticated) authenticated = streaming;
      }
    }
    if (!streaming || !supportsType(streaming, type)) return undefined;

    if (type === "hls") {
      return {
        uri: streaming.info.streaming_data!.hls_manifest_url!,
        kind: "youtube-hls",
        label: "YouTube-HLS",
        streaming,
      };
    }
    if (type === "hlsLocal" || type === "hlsLocalAv1") {
      const source = await operations.generate(
        streaming,
        type === "hlsLocalAv1",
        signal,
      );
      if (signal.aborted) {
        source?.dispose?.();
        return undefined;
      }
      return source
        ? {
            ...source,
            kind: "generated-hls",
            label: type === "hlsLocalAv1" ? "HLS + AV1" : "HLS",
            streaming,
          }
        : undefined;
    }
    if (type === "sabr") {
      const source = await operations.sabr(streaming, signal);
      if (signal.aborted) {
        await source?.stop();
        return undefined;
      }
      return source
        ? {
            uri: source.masterUri,
            kind: "sabr-hls",
            label: "SABR",
            streaming,
            dispose: source.stop,
          }
        : undefined;
    }
    const uri = await operations.progressive(streaming);
    return !signal.aborted && uri
      ? {uri, kind: "progressive", label: "Progressive", streaming}
      : undefined;
  };
}
