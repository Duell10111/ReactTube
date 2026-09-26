import {registerWebModule, NativeModule} from "expo";

import {MediaServerModuleEvents, StartServerResult} from "./MediaServer.types";

/**
 * There is no server on web, and none is needed: the browser plays HLS from a
 * blob or a remote URL directly. Every call fails loudly rather than pretending
 * to work, so a caller that reaches here has a wiring bug.
 */
class MediaServerWebModule extends NativeModule<MediaServerModuleEvents> {
  async startServer(): Promise<StartServerResult> {
    throw new Error("The local media server is not available on web");
  }

  async stopServer(): Promise<void> {}

  isRunning(): boolean {
    return false;
  }

  registerText(): void {
    throw new Error("The local media server is not available on web");
  }

  registerStreamPrefix(): void {
    throw new Error("The local media server is not available on web");
  }

  respondToSegment(): void {}

  failSegment(): void {}
}

export default registerWebModule(MediaServerWebModule, "MediaServerModule");
