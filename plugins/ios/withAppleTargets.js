/* eslint-env node */
const withAppleTargets = require("@bacons/apple-targets/app.plugin");

const {isSiriBuildEnabled, isTVBuild} = require("./siriBuildConfig");
const {
  withAppleTargetSwiftPackages,
} = require("./withAppleTargetSwiftPackages");

module.exports = (config, options = {}) => {
  if (options.isTV === true || isTVBuild(config)) return config;

  const targetOptions = {
    ...options,
    match: isSiriBuildEnabled(config) ? "*" : "!(siri-intents)",
  };
  // Register first: target mods execute before this action, and the upstream
  // base provider must be the last registration for its custom Xcode mod.
  config = withAppleTargetSwiftPackages(config, targetOptions);
  return withAppleTargets(config, targetOptions);
};
