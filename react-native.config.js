/* eslint-env node */
const appJSONConfig = require("./app.json");

// tvOS has no WKWebView and react-native-webview's podspec declares no tvOS
// platform, so a TV build must not link it on the Apple side. Android TV keeps
// it: the PoToken generator runs in its WebView there. Detection mirrors
// metro.config.js so that bundling and native linking always agree.
const isTVBuild =
  process.env.EXPO_TV === "1" || !!appJSONConfig.expo.plugins[0][1].isTV;

module.exports = {
  dependencies: isTVBuild
    ? {"react-native-webview": {platforms: {ios: null}}}
    : {},
};
