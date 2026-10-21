interface VideoMetadataRequest {
  videoId: string;
  requestId?: string;
}

/** Always completes a video request, including unavailable clients and failures. */
export async function completeWatchVideoRequest<T extends object>(
  request: VideoMetadataRequest,
  resolve: () => Promise<T | undefined>,
  onError: (error: unknown) => void,
) {
  const identity = {
    type: "videoResponse" as const,
    id: request.videoId,
    ...(request.requestId ? {requestId: request.requestId} : {}),
  };
  try {
    const response = await resolve();
    return response
      ? {...response, ...identity}
      : {...identity, error: "metadata_unavailable"};
  } catch (error) {
    onError(error);
    return {...identity, error: "metadata_failed"};
  }
}
