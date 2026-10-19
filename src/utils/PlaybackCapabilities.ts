import {Platform} from "react-native";
import {VideoDecoderProperties} from "react-native-video";

import MediaServer, {isMediaServerAvailable} from "../../modules/media-server";

import type {PlaybackCapabilities} from "@/utils/AutomaticPlayback";

let cached: Promise<PlaybackCapabilities> | undefined;

/**
 * Device codec support does not change at runtime, so the probe runs once:
 * on Android it can take up to two seconds before the first attempt starts.
 */
export function getPlaybackCapabilities(): Promise<PlaybackCapabilities> {
  if (!cached) {
    const probe = probePlaybackCapabilities();
    cached = probe.then(result => result.capabilities);
    probe.then(
      result => {
        // A timed-out probe is not an answer; ask again next time.
        if (!result.definite) cached = undefined;
      },
      () => {
        cached = undefined;
      },
    );
  }
  return cached;
}

/** Unknown codec support stays disabled; manual AV1 selection remains available. */
async function probePlaybackCapabilities(): Promise<{
  capabilities: PlaybackCapabilities;
  definite: boolean;
}> {
  let av1 = false;
  let definite = true;
  if (Platform.OS === "ios") {
    try {
      av1 = MediaServer?.supportsAv1?.() === true;
    } catch {
      // Older native builds do not expose codec capabilities.
    }
  }
  if (Platform.OS === "android") {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const support = await Promise.race([
        VideoDecoderProperties.isCodecSupported("video/av01", 3840, 2160),
        new Promise<undefined>(resolve => {
          timer = setTimeout(() => resolve(undefined), 2_000);
        }),
      ]);
      definite = support !== undefined;
      av1 = support === "hardware" || support === "software";
    } catch {
      // Missing native codec information means support is unknown.
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    capabilities: {
      generatedHls: Platform.OS === "ios" || Platform.OS === "android",
      av1,
      sabr: Platform.OS === "ios" && isMediaServerAvailable,
    },
    definite,
  };
}
