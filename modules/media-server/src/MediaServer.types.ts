/**
 * The server asks JavaScript for a segment it cannot know in advance.
 *
 * Every request must be answered — with `respondToSegment` or `failSegment` —
 * otherwise the connection waits out the native timeout and AVPlayer stalls for
 * that long.
 */
export type SegmentRequestEvent = {
  /** Hand this back when answering. */
  requestId: number;
  /** Percent-decoded request path, e.g. `/sabr/<token>/401:/42.m4s`. */
  path: string;
};

export type MediaServerModuleEvents = {
  onSegmentRequest: (event: SegmentRequestEvent) => void;
};

export type StartServerResult = {
  /** Port on 127.0.0.1 the listener bound to. */
  port: number;
};
