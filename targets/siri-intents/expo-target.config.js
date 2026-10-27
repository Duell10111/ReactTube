/* eslint-env node */
const {expo} = require("../../app.json");
const {getSiriAppGroup} = require("../../plugins/ios/siriBuildConfig");

/**
 * Preserve the existing SiriKit extension identity across plugin migrations.
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: "intent",
  name: "SiriIntents",
  bundleIdentifier: ".siriIntents",
  deploymentTarget: "16.4",
  entitlements: {
    // The project uses static app.json configuration for all prebuild variants.
    "com.apple.security.application-groups": [getSiriAppGroup(expo)],
  },
};
