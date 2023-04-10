/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const {getDefaultConfig} = require("metro-config");

module.exports = (async () => {
  const {
    resolver: {sourceExts, platforms},
  } = await getDefaultConfig();
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
  console.log(config);
  return config;
})();
