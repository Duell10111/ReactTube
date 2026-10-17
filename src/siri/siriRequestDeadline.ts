import type {SiriMediaRequest} from "../../modules/siri-media/src/SiriMedia.types.ts";

/**
 * True once Siri stopped waiting for the request. Starting playback then would
 * surprise the user after Siri already reported a failure.
 */
export function isSiriRequestExpired(
  request: Pick<SiriMediaRequest, "deadline">,
  now: number = Date.now(),
) {
  return request.deadline !== undefined && now > request.deadline;
}
