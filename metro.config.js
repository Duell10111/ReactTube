const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const {
  resolver: {sourceExts, platforms},
} = getDefaultConfig();

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
  resolver: {
    sourceExts: [...sourceExts, "cjs"],
    platforms,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
