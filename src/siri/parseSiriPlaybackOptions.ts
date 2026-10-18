import type {SiriMediaRequest} from "../../modules/siri-media/src/SiriMedia.types.ts";

/** Raw `INPlaybackRepeatMode` values. */
const SiriRepeatMode = {none: 1, all: 2, one: 3} as const;

/** Raw `INPlaybackQueueLocation` values. */
const SiriQueueLocation = {next: 2, later: 3} as const;

export interface SiriPlaybackOptions {
  /** Only set when the request says so ("shuffle", "in order"). */
  shuffle?: boolean;
  /** `off` turns repeat off; undefined leaves it as it is. */
  repeat?: "RepeatOne" | "RepeatAll" | "off";
  /**
   * `next` ("play X next" or "… later"): after the current track instead of
   * replacing the queue. The player has no "end of queue" insert, so "later"
   * is treated like "next".
   */
  queue: "now" | "next";
}

export function parseSiriPlaybackOptions(
  request: Pick<
    SiriMediaRequest,
    "playShuffled" | "repeatMode" | "queueLocation"
  >,
): SiriPlaybackOptions {
  let repeat: SiriPlaybackOptions["repeat"];
  switch (request.repeatMode) {
    case SiriRepeatMode.none:
      repeat = "off";
      break;
    case SiriRepeatMode.all:
      repeat = "RepeatAll";
      break;
    case SiriRepeatMode.one:
      repeat = "RepeatOne";
      break;
  }
  const queue =
    request.queueLocation === SiriQueueLocation.next ||
    request.queueLocation === SiriQueueLocation.later
      ? "next"
      : "now";
  return {shuffle: request.playShuffled, repeat, queue};
}
