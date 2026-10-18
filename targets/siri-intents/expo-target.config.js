/* eslint-env node */
const {expo} = require("../../app.json");
const {getSiriAppGroup} = require("../../plugins/ios/siriBuildConfig");

/**
 * SiriKit extension. apple-targets derives its bundle ID from the app's ID and
 * the camel-cased folder name: <app bundle ID>.siriIntents.
 * @type {import('@duell10111/apple-targets').Config}
 */
module.exports = {
  type: "intent",
  name: "SiriIntents",
  deploymentTarget: "16.4",
  entitlements: {
    // The project uses static app.json configuration for all prebuild variants.
    "com.apple.security.application-groups": [getSiriAppGroup(expo)],
  },
};
