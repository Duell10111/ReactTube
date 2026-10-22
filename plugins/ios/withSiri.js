// plugins/ios/withSiri.js
/* eslint-env node */
const {
  IOSConfig,
  withAppDelegate,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");
const fs = require("fs");
const path = require("path");

const APP_INTENT_SOURCE_DIR = path.join(__dirname, "siri");
const STRING_CATALOG_FILE_TYPE = "text.json.xcstrings";

/**
 * Translations of the App Shortcut phrases by language. They go into
 * `AppShortcuts.strings`, because the app still supports iOS 16 and
 * `AppShortcuts.xcstrings` requires iOS 17.
 */
const APP_SHORTCUT_PHRASES = require("./siri/AppShortcutPhrases.json");
const {
  getSiriAppGroup,
  isSiriBuildEnabled,
  isTVBuild,
} = require("./siriBuildConfig");

/**
 * Files of the App Intents feature: `diskPath` is relative to `ios/`, `filepath`
 * to the Xcode group (Expo resolves it like that). Expo locales use the same
 * `Supporting/<lang>.lproj` groups.
 */
function appIntentFiles(projectName) {
  return [
    {
      diskPath: `${projectName}/ReactTubeAppIntents.swift`,
      group: projectName,
      filepath: `${projectName}/ReactTubeAppIntents.swift`,
      kind: "source",
      source: "ReactTubeAppIntents.swift",
    },
    // iOS 27 App Schema intents for the Apple Intelligence planner.
    {
      diskPath: `${projectName}/ReactTubeAudioSchemaIntents.swift`,
      group: projectName,
      filepath: `${projectName}/ReactTubeAudioSchemaIntents.swift`,
      kind: "source",
      source: "ReactTubeAudioSchemaIntents.swift",
    },
    // A string catalog works on iOS 16, too; only App Shortcut phrases need
    // the legacy format.
    {
      diskPath: `${projectName}/Localizable.xcstrings`,
      group: projectName,
      filepath: `${projectName}/Localizable.xcstrings`,
      kind: "resource",
      source: "Localizable.xcstrings",
    },
    ...Object.entries(APP_SHORTCUT_PHRASES).map(([lang, phrases]) => ({
      diskPath: `${projectName}/Supporting/${lang}.lproj/AppShortcuts.strings`,
      group: `${projectName}/Supporting/${lang}.lproj`,
      filepath: `${lang}.lproj/AppShortcuts.strings`,
      kind: "resource",
      contents: formatStringsFile(phrases),
    })),
  ];
}

// JSON string literals are valid .strings literals for these phrases.
function formatStringsFile(entries) {
  return (
    Object.entries(entries)
      .map(
        ([key, value]) => `${JSON.stringify(key)} = ${JSON.stringify(value)};`,
      )
      .join("\n") + "\n"
  );
}

function writeAppIntentFiles(platformProjectRoot, projectName) {
  for (const entry of appIntentFiles(projectName)) {
    const target = path.join(platformProjectRoot, entry.diskPath);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    if (entry.source) {
      fs.copyFileSync(path.join(APP_INTENT_SOURCE_DIR, entry.source), target);
    } else {
      fs.writeFileSync(target, entry.contents);
    }
  }
}

const IMPORTS_TAG = "reacttube-siri-imports";
const HANDLER_TAG = "reacttube-siri-handler";

const IMPORTS_SNIPPET = `import Intents
// internal: ExpoModulesProvider imports the module with that access level.
internal import SiriMedia`;

const HANDLER_SNIPPET = `  // SiriKit: intents the extension answered with .handleInApp. React may not be
  // running yet when Siri launches the app in the background.
  // makeHeadlessReactRootView() is defined in ReactTubeAppIntents.swift.
  @objc public func application(_ application: UIApplication, handlerFor intent: INIntent) -> Any? {
    return SiriMediaIntentRouter.handler(for: intent) { [weak self] in
      self?.makeHeadlessReactRootView()
    }
  }
`;

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

/**
 * Adds the copied App Intent files to the app target. Passing the target
 * explicitly matters: the watch app is an application target, too.
 */
function addAppIntentFilesToProject(project, projectName) {
  const {uuid: targetUuid} = IOSConfig.XcodeUtils.getApplicationNativeTarget({
    project,
    projectName,
  });

  const files = appIntentFiles(projectName);
  for (const entry of files) {
    IOSConfig.XcodeUtils.ensureGroupRecursively(project, entry.group);
    const props = {
      filepath: entry.filepath,
      groupName: entry.group,
      project,
      targetUuid,
    };
    if (entry.kind === "source") {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup(props);
    } else {
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        ...props,
        isBuildFile: true,
      });
    }
  }

  const paths = files.map(entry => entry.filepath);
  for (const reference of Object.values(project.pbxFileReferenceSection())) {
    const filePath = String(reference?.path ?? "").replace(/"/g, "");
    if (typeof reference !== "object" || !paths.includes(filePath)) {
      continue;
    }
    // The xcode package leaves unknown attributes undefined, which it would
    // write as the literal `undefined`.
    for (const key of Object.keys(reference)) {
      if (reference[key] === undefined) {
        delete reference[key];
      }
    }
    // It also does not know string catalogs; without the file type Xcode
    // copies the raw JSON instead of compiling the localizations.
    if (filePath.endsWith(".xcstrings")) {
      reference.lastKnownFileType = STRING_CATALOG_FILE_TYPE;
    }
  }

  for (const lang of Object.keys(APP_SHORTCUT_PHRASES)) {
    project.addKnownRegion(lang);
  }
  return project;
}

/**
 * Wires the phone app up for SiriKit media intents (see
 * SIRI_SEARCH_AND_PLAY_PLAN.md):
 *  - Siri entitlement, the app group shared with the intents extension, usage
 *    description and the alternative app name;
 *  - `application(_:handlerFor:)` in the AppDelegate, because `ExpoAppDelegate`
 *    does not forward in-app intent handling to `modules/siri-media`;
 *  - the App Intents and App Shortcuts in `plugins/ios/siri/`, copied into the
 *    app target because App Intent metadata is only extracted from there.
 *
 * Skipped for tvOS builds, matching the local Apple Targets wrapper.
 */
const withSiri = (config, options = {}) => {
  const enabled = isSiriBuildEnabled(config, options);
  // A linked module alone does not mean this build has Siri capabilities.
  config = withInfoPlist(config, modConfig => {
    modConfig.modResults.ReactTubeSiriEnabled = enabled;
    return modConfig;
  });
  if (!enabled) {
    return config;
  }
  const appGroup = getSiriAppGroup(config, options);

  config = withEntitlementsPlist(config, modConfig => {
    modConfig.modResults["com.apple.developer.siri"] = true;
    // Shared with the intents extension (targets/siri-intents).
    const groups =
      modConfig.modResults["com.apple.security.application-groups"] ?? [];
    if (!groups.includes(appGroup)) {
      modConfig.modResults["com.apple.security.application-groups"] = [
        ...groups,
        appGroup,
      ];
    }
    return modConfig;
  });

  config = withInfoPlist(config, modConfig => {
    modConfig.modResults.ReactTubeSiriAppGroup = appGroup;
    modConfig.modResults.NSSiriUsageDescription =
      "ReactTube uses Siri to search and play music by voice.";
    // Handled by the app itself (SiriMediaIntentRouter): the extension cannot
    // hand like/dislike over with .handleInApp. INAddMediaIntent goes through
    // the extension, because Siri's media flow only offers apps whose
    // extension declares the intent.
    modConfig.modResults.INIntentsSupported = ["INUpdateMediaAffinityIntent"];
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

  config = withXcodeProject(config, modConfig => {
    const {projectRoot, platformProjectRoot} = modConfig.modRequest;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    writeAppIntentFiles(platformProjectRoot, projectName);
    modConfig.modResults = addAppIntentFilesToProject(
      modConfig.modResults,
      projectName,
    );
    // The extension inherits this project setting even if apple-targets adds
    // its target after this mod. Its Info.plist expands the same group as the app.
    modConfig.modResults.addBuildProperty(
      "REACTTUBE_SIRI_APP_GROUP",
      JSON.stringify(appGroup),
    );
    return modConfig;
  });

  return config;
};

module.exports = withSiri;
module.exports.addSiriAppDelegateCode = addSiriAppDelegateCode;
module.exports.addAppIntentFilesToProject = addAppIntentFilesToProject;
module.exports.formatStringsFile = formatStringsFile;
module.exports.isTVBuild = isTVBuild;
