// Learn more https://docs.expo.io/guides/customizing-metro
const {getDefaultConfig} = require("expo/metro-config");

// const appJSONConfig = require("./app.json");

// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname);

if (process.env.EXPO_TV) {
  console.log("---- Adding TV file extensions ----");
  config.resolver.sourceExts.unshift(
    ...config.resolver.sourceExts.map(e => `tv.${e}`),
  );
}

config.resolver.sourceExts.push("sql");
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
