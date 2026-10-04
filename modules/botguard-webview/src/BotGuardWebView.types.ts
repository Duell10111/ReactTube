export type BotGuardWebViewMessageEvent = {
  /** What the page posted to `window.webkit.messageHandlers.reacttube`. */
  data: string;
};

export type BotGuardWebViewModuleEvents = {
  onMessage: (event: BotGuardWebViewMessageEvent) => void;
};
