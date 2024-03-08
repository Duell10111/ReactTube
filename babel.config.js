module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          lazyImports: false,
        },
      ],
    ],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            stream: "stream-browserify",
            buffer: "@craftzdog/react-native-buffer",
          },
        },
      ],
    ],
  };
};
