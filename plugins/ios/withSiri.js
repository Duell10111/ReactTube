// plugins/ios/withSiri.js
const {
  withAppDelegate,
  withEntitlementsPlist,
  withInfoPlist,
} = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");

/**
 * Wires the phone app up for SiriKit media intents (see
 * SIRI_SEARCH_AND_PLAY_PLAN.md):
 *  - Siri entitlement, the app group shared with the intents extension, usage
 *    description and the alternative app name;
 *  - `application(_:handlerFor:)` in the AppDelegate, because `ExpoAppDelegate`
 *    does not forward in-app intent handling to `modules/siri-media`.
 *
 * Skipped for tvOS builds, mirroring `@duell10111/apple-targets`, which also
 * leaves the intents extension out there.
 */
const APP_GROUP = "group.com.duell10111.reacttube";

const IMPORTS_TAG = "reacttube-siri-imports";
const HANDLER_TAG = "reacttube-siri-handler";

const IMPORTS_SNIPPET = `import Intents
// internal: ExpoModulesProvider imports the module with that access level.
internal import SiriMedia`;

const HANDLER_SNIPPET = `  // SiriKit: intents the extension answered with .handleInApp. React may not be
  // running yet when Siri launches the app in the background.
  @objc public func application(_ application: UIApplication, handlerFor intent: INIntent) -> Any? {
    return SiriMediaIntentRouter.handler(for: intent) { [weak self] in
      guard let self, let factory = self.reactNativeFactory else {
        return nil
      }
      return factory.rootViewFactory.view(
        withModuleName: self.reactNativeFactoryModuleName,
        initialProperties: nil,
        launchOptions: nil
      )
    }
  }
`;

function isTVBuild(config) {
  if (process.env.EXPO_TV !== undefined) {
    return true;
  }
  const tvPlugin = (config.plugins ?? []).find(
    plugin =>
      Array.isArray(plugin) && plugin[0] === "@react-native-tvos/config-tv",
  );
  return Boolean(tvPlugin?.[1]?.isTV);
}

// mergeContents throws when an anchor is missing, so template changes fail the
// prebuild instead of silently dropping Siri support.
function addSiriAppDelegateCode(appDelegate) {
  const withImports = mergeContents({
    tag: IMPORTS_TAG,
    src: appDelegate,
    newSrc: IMPORTS_SNIPPET,
    anchor: /^import ReactAppDependencyProvider$/m,
    offset: 1,
    comment: "//",
  });

  const withHandler = mergeContents({
    tag: HANDLER_TAG,
    src: withImports.contents,
    newSrc: HANDLER_SNIPPET,
    anchor: /^ {2}\/\/ Universal Links$/m,
    offset: 0,
    comment: "//",
  });
  return withHandler.contents;
}

const withSiri = config => {
  if (isTVBuild(config)) {
    return config;
  }

  config = withEntitlementsPlist(config, modConfig => {
    modConfig.modResults["com.apple.developer.siri"] = true;
    // Shared with the intents extension (targets/siri-intents).
    const groups =
      modConfig.modResults["com.apple.security.application-groups"] ?? [];
    if (!groups.includes(APP_GROUP)) {
      modConfig.modResults["com.apple.security.application-groups"] = [
        ...groups,
        APP_GROUP,
      ];
    }
    return modConfig;
  });

  config = withInfoPlist(config, modConfig => {
    modConfig.modResults.NSSiriUsageDescription =
      "ReactTube uses Siri to search and play music by voice.";
    modConfig.modResults.INAlternativeAppNames = [
      {
        INAlternativeAppName: "React Tube",
        INAlternativeAppNamePronunciationHint: "react tube",
      },
    ];
    return modConfig;
  });

  config = withAppDelegate(config, modConfig => {
    if (modConfig.modResults.language !== "swift") {
      throw new Error("[withSiri] Only a Swift AppDelegate is supported");
    }
    modConfig.modResults.contents = addSiriAppDelegateCode(
      modConfig.modResults.contents,
    );
    return modConfig;
  });

  return config;
};

module.exports = withSiri;
module.exports.addSiriAppDelegateCode = addSiriAppDelegateCode;
module.exports.isTVBuild = isTVBuild;
