/**
 * SiriKit media intents extension. The bundle id is derived from the folder
 * name: com.duell10111.reacttube.siri-intents.
 * @type {import('@duell10111/apple-targets').Config}
 */
module.exports = {
  type: "intent",
  name: "SiriIntents",
  deploymentTarget: "16.4",
  entitlements: {
    // Shared with the app (plugins/ios/withSiri.js) for diagnostics now and
    // the library snapshot later.
    "com.apple.security.application-groups": ["group.com.duell10111.reacttube"],
  },
};
