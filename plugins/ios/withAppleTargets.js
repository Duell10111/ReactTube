/* eslint-env node */
const withAppleTargets = require("@duell10111/apple-targets");

const {isSiriBuildEnabled} = require("./siriBuildConfig");

module.exports = (config, options = {}) =>
  withAppleTargets(config, {
    ...options,
    match: isSiriBuildEnabled(config) ? "*" : "!(siri-intents)",
  });
