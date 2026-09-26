import {NativeModule, requireNativeModule} from "expo";

import {MediaServerModuleEvents, StartServerResult} from "./MediaServer.types";

/**
 * A loopback HTTP server for HLS manifests and SABR segments — plan phase 3.
 *
 * AVPlayer refuses an HLS master over `file://` (measured: `OSStatus -16913`),
 * and SABR segments cannot be laid down as files at all because they only come
 * into being when asked for. Both need an address to be fetched from, and that
 * is what this serves — on 127.0.0.1, so nothing reaches the network and tvOS
 * never asks for local network permission.
 */
declare class MediaServerModule extends NativeModule<MediaServerModuleEvents> {
  /** Binds to a free port on the loopback interface. Idempotent. */
  startServer(): Promise<StartServerResult>;
  /** Stops the listener and drops every registration. */
  stopServer(): Promise<void>;
  isRunning(): boolean;
  /** Stores a body to serve verbatim — the manifests. */
  registerText(path: string, body: string, contentType: string): void;
  /**
   * Marks a path prefix as answered from JavaScript. Requests below it arrive as
   * `onSegmentRequest` and have to be answered.
   */
  registerStreamPrefix(prefix: string): void;
  /**
   * Answers a segment request.
   *
   * Synchronous on purpose: the bytes are copied while the caller is still on
   * the JavaScript thread, where the `Uint8Array` is valid.
   */
  respondToSegment(
    requestId: number,
    data: Uint8Array,
    contentType: string,
  ): void;
  failSegment(requestId: number, status: number, message: string): void;
}

export default requireNativeModule<MediaServerModule>("MediaServer");
