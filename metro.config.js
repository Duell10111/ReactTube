// Learn more https://docs.expo.io/guides/customizing-metro
const {getDefaultConfig} = require("expo/metro-config");

const appJSONConfig = require("./app.json");

// eslint-disable-next-line no-undef
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

// console.log(config.resolver.sourceExts);

module.exports = config;
