/* eslint-env node */
// Learn more https://docs.expo.io/guides/customizing-metro
const {getDefaultConfig} = require("expo/metro-config");
const path = require("path");

const appJSONConfig = require("./app.json");

const config = getDefaultConfig(__dirname);

// When enabled, the optional code below will allow Metro to resolve
// and bundle source files with TV-specific extensions
// (e.g., *.ios.tv.tsx, *.android.tv.tsx, *.tv.tsx)
//
// Metro will still resolve source files with standard extensions
// as usual if TV-specific files are not found for a module.
//
/*
if (process.env?.EXPO_TV === '1') {
  const originalSourceExts = config.resolver.sourceExts;
  const tvSourceExts = [
    ...originalSourceExts.map((e) => `tv.${e}`),
    ...originalSourceExts,
  ];
  config.resolver.sourceExts = tvSourceExts;
}
 */

if (appJSONConfig.expo.plugins[0][1].isTV) {
  console.log("---- Adding TV file extensions ----");
  config.resolver.sourceExts.unshift(
    ...config.resolver.sourceExts.map(e => `tv.${e}`),
  );
}

config.resolver.sourceExts.push("sql");
config.resolver.unstable_enablePackageExports = true;

// youtubei.js wird als file:-Dependency aus dem Schwester-Repo eingebunden
// (Plan-Phase 1.1). Metro folgt dem Symlink nur, wenn das Ziel beobachtet wird —
// sonst findet es weder die Quellen noch deren eigene node_modules.
const youtubeJsPath = path.resolve(__dirname, "../../YouTube.js");
config.watchFolders = [...(config.watchFolders ?? []), youtubeJsPath];

// console.log(config.resolver.sourceExts);

module.exports = config;
