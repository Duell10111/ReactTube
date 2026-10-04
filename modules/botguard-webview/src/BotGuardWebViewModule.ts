import {NativeModule, requireNativeModule} from "expo";

import {BotGuardWebViewModuleEvents} from "./BotGuardWebView.types";

/**
 * A headless WKWebView for tvOS, where react-native-webview does not exist
 * (plan phase 5).
 *
 * tvOS carries WebKit but its SDK hides it, so the native side loads it at
 * runtime — private API, the approach of jvanakker/tvOSBrowser. Only for
 * locally built apps, not the App Store.
 */
declare class BotGuardWebViewModule extends NativeModule<BotGuardWebViewModuleEvents> {
  /** Whether WebKit could be loaded on this device. */
  isAvailable(): Promise<boolean>;
  /** Creates the web view, replacing a previous one. */
  create(userAgent?: string): Promise<void>;
  /** Loads `html` under `baseUrl` and resolves once the document is complete. */
  loadHtml(html: string, baseUrl: string): Promise<void>;
  /** Runs `script`; resolves with its result as a string, or null. */
  evaluate(script: string): Promise<string | null>;
  destroy(): Promise<void>;
}

export default requireNativeModule<BotGuardWebViewModule>("BotGuardWebView");
