interface VideoMetadataRequest {
  videoId: string;
  requestId?: string;
}

/**
 * Returned by a resolver while the phone cannot answer yet, for example before
 * the YouTube client is initialized. The watch retries these responses.
 */
export const WATCH_METADATA_NOT_READY = Symbol("watchMetadataNotReady");

/** Always completes a video request, including unavailable clients and failures. */
export async function completeWatchVideoRequest<T extends object>(
  request: VideoMetadataRequest,
  resolve: () => Promise<T | typeof WATCH_METADATA_NOT_READY | undefined>,
  onError: (error: unknown) => void,
) {
  const identity = {
    type: "videoResponse" as const,
    id: request.videoId,
    ...(request.requestId ? {requestId: request.requestId} : {}),
  };
  try {
    const response = await resolve();
    if (response === WATCH_METADATA_NOT_READY) {
      return {...identity, error: "metadata_not_ready"};
    }
    return response
      ? {...response, ...identity}
      : {...identity, error: "metadata_unavailable"};
  } catch (error) {
    onError(error);
    return {...identity, error: "metadata_failed"};
  }
}
