/**
 * BotGuard runtime for tvOS (plan phase 5).
 *
 * tvOS has no react-native-webview, so this drives the headless,
 * runtime-resolved WKWebView of `modules/botguard-webview` instead. The page,
 * the challenge flow and the minter are the same as on the other platforms;
 * only the bridge differs: calls go in through `evaluate`, answers come back
 * through the `reacttube` message handler.
 *
 * Renders nothing — the web view lives outside the view hierarchy, so it can
 * never take part in TV focus.
 */
import {useEffect} from "react";

import BotGuardWebView from "../../../modules/botguard-webview";

import Logger from "@/utils/Logger";
import {poTokenMinter} from "@/utils/potoken/PoTokenProvider";
import {BOTGUARD_PAGE_HTML} from "@/utils/potoken/botguardPage";
import {
  BOTGUARD_USER_AGENT,
  initializeBotGuard,
  type BotGuardPageBridge,
} from "@/utils/potoken/botguardSession";

const LOGGER = Logger.extend("POTOKEN");

/** Routes the page's replies to the native message handler. */
const MESSAGE_SHIM =
  "window.ReactNativeWebView = {postMessage: function (message) {" +
  " window.webkit.messageHandlers.reacttube.postMessage(message); }}; true;";

interface PendingCall {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export default function PoTokenWebViewHost() {
  useEffect(() => {
    let disposed = false;
    let nextId = 0;
    let pending = new Map<number, PendingCall>();
    let ready: Promise<void> | undefined;
    let pageUsed = false;

    const rejectAll = (reason: string) => {
      const calls = pending;
      pending = new Map();
      calls.forEach(call => call.reject(new Error(reason)));
    };

    const subscription = BotGuardWebView.addListener("onMessage", ({data}) => {
      let message: {id?: number; ok?: boolean; value?: unknown; error?: string};

      try {
        message = JSON.parse(data);
      } catch {
        return;
      }

      const call =
        message.id !== undefined ? pending.get(message.id) : undefined;

      if (!call || message.id === undefined) {
        return;
      }

      pending.delete(message.id);

      if (message.ok) {
        call.resolve(message.value);
      } else {
        call.reject(new Error(message.error ?? "BotGuard page error"));
      }
    });

    const prepare = () => {
      ready ??= (async () => {
        await BotGuardWebView.create(BOTGUARD_USER_AGENT);
        await BotGuardWebView.loadHtml(
          BOTGUARD_PAGE_HTML,
          "https://www.youtube.com",
        );
        await BotGuardWebView.evaluate(MESSAGE_SHIM);
      })().catch(error => {
        ready = undefined;
        throw error;
      });

      return ready;
    };

    const bridge = {
      call: async (method: string, argument: unknown) => {
        await prepare();

        const id = ++nextId;
        const answer = new Promise<any>((resolve, reject) => {
          pending.set(id, {resolve, reject});
        });

        try {
          await BotGuardWebView.evaluate(
            `window.__potoken.${method}(${id}, ${JSON.stringify(argument)}); true;`,
          );
        } catch (error) {
          pending.delete(id);
          throw error;
        }

        return answer;
      },
    } as BotGuardPageBridge;

    const host = {
      initialize: () => {
        // Every BotGuard run after the first gets a fresh page: that also
        // recovers from a web content process that died in between.
        if (pageUsed) {
          rejectAll("BotGuard page replaced");
          ready = undefined;
        }
        pageUsed = true;

        return initializeBotGuard(bridge);
      },
      mint: (identifier: string) => bridge.call("mint", identifier),
    };

    BotGuardWebView.isAvailable()
      .then(available => {
        if (disposed) {
          return;
        }

        if (!available) {
          LOGGER.info("WebKit unavailable on this tvOS version, no PoTokens");
          return;
        }

        poTokenMinter.setHost(host);
        // Warm up now: the first WKWebView start after launch was measured at
        // tens of seconds in the simulator, far beyond the mint timeout.
        prepare().catch(error =>
          LOGGER.warn(
            `BotGuard page failed to load: ${error?.message ?? error}`,
          ),
        );
      })
      .catch(error =>
        LOGGER.warn(`BotGuard WebView unavailable: ${error?.message ?? error}`),
      );

    return () => {
      disposed = true;
      subscription.remove();
      rejectAll("BotGuard host unmounted");
      poTokenMinter.setHost(undefined);
      BotGuardWebView.destroy().catch(() => {});
    };
  }, []);

  return null;
}
