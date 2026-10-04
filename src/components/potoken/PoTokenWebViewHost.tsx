/**
 * Invisible WebView that runs BotGuard for PoTokens (plan phase 5.1).
 *
 * Mounted once at the app root. It registers itself as the runtime of
 * `poTokenMinter`; nothing runs until the first token is requested, which
 * happens only for clients that need one (`WEB`). tvOS has no
 * react-native-webview and uses `PoTokenWebViewHost.ios.tv.tsx` instead.
 */
import React, {useEffect, useMemo, useRef, useState} from "react";
import {StyleSheet, View} from "react-native";
import {WebView, type WebViewMessageEvent} from "react-native-webview";

import Logger from "@/utils/Logger";
import {poTokenMinter} from "@/utils/potoken/PoTokenProvider";
import {BOTGUARD_PAGE_HTML} from "@/utils/potoken/botguardPage";
import {
  BOTGUARD_USER_AGENT,
  initializeBotGuard,
  type BotGuardPageBridge,
} from "@/utils/potoken/botguardSession";

const LOGGER = Logger.extend("POTOKEN");

interface PendingCall {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export default function PoTokenWebViewHost() {
  const webViewRef = useRef<WebView>(null);
  const pendingRef = useRef(new Map<number, PendingCall>());
  const nextIdRef = useRef(0);
  const loadedRef = useRef<
    {promise: Promise<void>; resolve: () => void} | undefined
  >(undefined);
  // Remounting the WebView is the recovery path after its process died.
  const [generation, setGeneration] = useState(0);

  if (!loadedRef.current) {
    let resolve = () => {};
    const promise = new Promise<void>(done => {
      resolve = done;
    });
    loadedRef.current = {promise, resolve};
  }

  const host = useMemo(() => {
    const bridge: BotGuardPageBridge = {
      call: async (method: string, argument: unknown) => {
        await loadedRef.current?.promise;

        const id = ++nextIdRef.current;

        return new Promise<any>((resolve, reject) => {
          pendingRef.current.set(id, {resolve, reject});
          webViewRef.current?.injectJavaScript(
            `window.__potoken.${method}(${id}, ${JSON.stringify(
              argument,
            )}); true;`,
          );
        });
      },
    } as BotGuardPageBridge;

    return {
      initialize: () => initializeBotGuard(bridge),
      mint: (identifier: string) => bridge.call("mint", identifier),
    };
  }, []);

  useEffect(() => {
    poTokenMinter.setHost(host);
    return () => poTokenMinter.setHost(undefined);
  }, [host]);

  const rejectAll = (reason: string) => {
    const pending = pendingRef.current;
    pendingRef.current = new Map();
    pending.forEach(call => call.reject(new Error(reason)));
  };

  const onMessage = (event: WebViewMessageEvent) => {
    let message: {id?: number; ok?: boolean; value?: unknown; error?: string};

    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    const call =
      message.id !== undefined ? pendingRef.current.get(message.id) : undefined;

    if (!call || message.id === undefined) {
      return;
    }

    pendingRef.current.delete(message.id);

    if (message.ok) {
      call.resolve(message.value);
    } else {
      call.reject(new Error(message.error ?? "BotGuard page error"));
    }
  };

  const onProcessGone = () => {
    LOGGER.warn("BotGuard WebView process ended, restarting it");
    rejectAll("BotGuard WebView process ended");
    loadedRef.current = undefined;
    poTokenMinter.reset();
    setGeneration(value => value + 1);
  };

  return (
    <View pointerEvents={"none"} style={styles.hidden}>
      <WebView
        key={generation}
        ref={webViewRef}
        source={{html: BOTGUARD_PAGE_HTML, baseUrl: "https://www.youtube.com"}}
        originWhitelist={["*"]}
        userAgent={BOTGUARD_USER_AGENT}
        javaScriptEnabled
        incognito
        focusable={false}
        onLoadEnd={() => loadedRef.current?.resolve()}
        onMessage={onMessage}
        onContentProcessDidTerminate={onProcessGone}
        onRenderProcessGone={onProcessGone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Kept at 1×1 instead of 0×0: a zero-sized WebView may be throttled.
  hidden: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    overflow: "hidden",
  },
});
