import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import {createRequire} from "node:module";
import {tmpdir} from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath, URL} from "node:url";

const require = createRequire(import.meta.url);
const {sync: globSync} = require("glob");

const {
  getSiriAppGroup,
  isSiriBuildEnabled,
} = require("../plugins/ios/siriBuildConfig.js");
const withSiri = require("../plugins/ios/withSiri.js");
const {
  addAppIntentFilesToProject,
  addSiriAppDelegateCode,
  formatStringsFile,
  isTVBuild,
} = require("../plugins/ios/withSiri.js");
const APP_DELEGATE = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {
  var window: UIWindow?

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return true
  }
}
`;

test("injects the Siri imports and in-app intent handler into the AppDelegate", () => {
  const result = addSiriAppDelegateCode(APP_DELEGATE);

  assert.match(
    result,
    /import ReactAppDependencyProvider\n.*\nimport Intents\n.*\ninternal import SiriMedia/,
  );
  assert.match(result, /handlerFor intent: INIntent/);
  // The handler has to stay inside the AppDelegate class, before the
  // universal links override.
  assert.ok(
    result.indexOf("handlerFor intent") < result.indexOf("// Universal Links"),
  );
  assert.ok(
    result.indexOf("handlerFor intent") > result.indexOf("class AppDelegate"),
  );
});

test("is idempotent across repeated prebuilds", () => {
  const once = addSiriAppDelegateCode(APP_DELEGATE);
  assert.equal(addSiriAppDelegateCode(once), once);
});

test("fails loudly when the AppDelegate template changed", () => {
  assert.throws(
    () => addSiriAppDelegateCode("class AppDelegate {}"),
    /Failed to match/,
  );
});

test("detects tvOS builds from the config-tv plugin", () => {
  const previous = process.env.EXPO_TV;
  delete process.env.EXPO_TV;
  try {
    assert.equal(
      isTVBuild({plugins: [["@react-native-tvos/config-tv", {isTV: true}]]}),
      true,
    );
    assert.equal(
      isTVBuild({plugins: [["@react-native-tvos/config-tv", {isTV: false}]]}),
      false,
    );
  } finally {
    if (previous !== undefined) {
      process.env.EXPO_TV = previous;
    }
  }
});

function loadFixtureProject() {
  const xcode = require("xcode");
  const project = xcode.project(
    fileURLToPath(new URL("./fixtures/siri-app.pbxproj", import.meta.url)),
  );
  project.parseSync();
  return project;
}

function buildPhaseFiles(project, phaseUuid) {
  const phases = {
    ...project.hash.project.objects.PBXSourcesBuildPhase,
    ...project.hash.project.objects.PBXResourcesBuildPhase,
  };
  return phases[phaseUuid].files.map(file => file.comment);
}

test("adds the App Intent sources and strings to the app target only", () => {
  const project = addAppIntentFilesToProject(loadFixtureProject(), "reacttube");

  // Phase uuids from the fixture: app target 1/2, watch target 3/4.
  assert.deepEqual(buildPhaseFiles(project, "A50000000000000000000001"), [
    "AppDelegate.swift in Sources",
    "ReactTubeAppIntents.swift in Sources",
    "ReactTubeAudioSchemaIntents.swift in Sources",
  ]);
  assert.deepEqual(buildPhaseFiles(project, "A50000000000000000000002"), [
    "Localizable.xcstrings in Resources",
    "AppShortcuts.strings in Resources",
  ]);
  assert.deepEqual(buildPhaseFiles(project, "A50000000000000000000003"), []);
  assert.deepEqual(buildPhaseFiles(project, "A50000000000000000000004"), []);

  const references = Object.values(project.pbxFileReferenceSection()).filter(
    reference => typeof reference === "object",
  );
  const catalog = references.find(reference =>
    String(reference.path).includes("Localizable.xcstrings"),
  );
  assert.equal(catalog.lastKnownFileType, "text.json.xcstrings");
  const phrases = references.find(reference =>
    String(reference.path).includes("AppShortcuts.strings"),
  );
  assert.equal(phrases.path, JSON.stringify("de.lproj/AppShortcuts.strings"));
  assert.doesNotMatch(project.writeSync(), /= undefined;/);
  assert.ok(project.hasKnownRegion("de"));
});

test("adds the App Intent files only once across repeated prebuilds", () => {
  const project = addAppIntentFilesToProject(
    addAppIntentFilesToProject(loadFixtureProject(), "reacttube"),
    "reacttube",
  );
  assert.equal(buildPhaseFiles(project, "A50000000000000000000001").length, 3);
  assert.equal(buildPhaseFiles(project, "A50000000000000000000002").length, 2);
});

test("every App Shortcut phrase is translated to German", () => {
  const swift = readFileSync(
    new URL("../plugins/ios/siri/ReactTubeAppIntents.swift", import.meta.url),
    "utf8",
  );
  const phrases = [...swift.matchAll(/"([^"]*\\\(\.applicationName\)[^"]*)"/g)]
    .map(match =>
      match[1].replace("\\(.applicationName)", "${applicationName}"),
    )
    .sort();
  const translations = JSON.parse(
    readFileSync(
      new URL("../plugins/ios/siri/AppShortcutPhrases.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(Object.keys(translations.de).sort(), phrases);
  for (const phrase of phrases) {
    // Each phrase has to name the app exactly once.
    assert.equal(translations.de[phrase].split("${applicationName}").length, 2);
  }
});

test("writes quoted .strings entries", () => {
  const appName = "${applicationName}";
  assert.equal(
    formatStringsFile({
      [`Search in ${appName}`]: `Suche "in" ${appName}`,
    }),
    `"Search in ${appName}" = "Suche \\"in\\" ${appName}";\n`,
  );
});

function siriConfig(enabled, reverse = false) {
  const plugins = [
    [
      "./plugins/ios/withAppleTargets.js",
      {appleTeamId: "XXXXXXXXXX", isTV: false},
    ],
    ["./plugins/ios/withSiri.js", {enabled}],
  ];
  return {
    name: "reacttube",
    slug: "reacttube",
    plugins: reverse ? plugins.reverse() : plugins,
  };
}

test("Siri defaults to enabled and reads one boolean regardless of plugin order", () => {
  assert.equal(isSiriBuildEnabled({}), true);
  assert.equal(
    isSiriBuildEnabled({plugins: ["./plugins/ios/withSiri.js"]}),
    true,
  );
  for (const enabled of [false, true]) {
    for (const reverse of [false, true]) {
      assert.equal(isSiriBuildEnabled(siriConfig(enabled, reverse)), enabled);
    }
  }
  assert.throws(
    () => isSiriBuildEnabled(siriConfig("false")),
    /must be a boolean/,
  );
});

test("target filter retains the watch target when Siri is disabled", () => {
  const projectRoot = fileURLToPath(new URL("..", import.meta.url));
  for (const enabled of [false, true]) {
    const config = siriConfig(enabled);
    const targets = globSync(
      `targets/${isSiriBuildEnabled(config) ? "*" : "!(siri-intents)"}/expo-target.config.@(json|js)`,
      {cwd: projectRoot},
    );
    assert.ok(targets.includes("targets/watch/expo-target.config.js"));
    assert.equal(
      targets.includes("targets/siri-intents/expo-target.config.js"),
      enabled,
    );
  }
});

test("disabled Siri only writes its native build marker and registers no Siri mods", async () => {
  const config = withSiri(siriConfig(false));
  assert.deepEqual(Object.keys(config.mods.ios), ["infoPlist"]);
  const result = await config.mods.ios.infoPlist({
    ...config,
    modResults: {UnrelatedKey: "preserved"},
    modRequest: {nextMod: value => value},
  });
  assert.deepEqual(result.modResults, {
    UnrelatedKey: "preserved",
    ReactTubeSiriEnabled: false,
  });
});

test("clean generated Siri configuration follows flag changes in both directions", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "reacttube-siri-plugin-"));
  try {
    for (const enabled of [true, false, true]) {
      const iosRoot = path.join(root, "ios");
      rmSync(iosRoot, {recursive: true, force: true});
      mkdirSync(path.join(iosRoot, "reacttube.xcodeproj"), {recursive: true});
      mkdirSync(path.join(iosRoot, "reacttube"), {recursive: true});
      writeFileSync(
        path.join(iosRoot, "reacttube/AppDelegate.swift"),
        APP_DELEGATE,
      );
      const config = withSiri(siriConfig(enabled));
      const runMod = async (name, modResults) => {
        if (!config.mods.ios[name]) return modResults;
        return (
          await config.mods.ios[name]({
            ...config,
            modResults,
            modRequest: {
              projectRoot: root,
              platformProjectRoot: iosRoot,
              nextMod: value => value,
            },
          })
        ).modResults;
      };
      const plist = await runMod("infoPlist", {});
      assert.equal(plist.ReactTubeSiriEnabled, enabled);
      assert.equal("NSSiriUsageDescription" in plist, enabled);
      assert.equal("INIntentsSupported" in plist, enabled);
      assert.equal("INAlternativeAppNames" in plist, enabled);
      const entitlements = await runMod("entitlements", {
        "unrelated.entitlement": true,
      });
      assert.equal(entitlements["unrelated.entitlement"], true);
      assert.equal(entitlements["com.apple.developer.siri"] === true, enabled);
      assert.equal(
        entitlements["com.apple.security.application-groups"]?.includes(
          "group.com.duell10111.reacttube",
        ) ?? false,
        enabled,
      );
      const delegate = await runMod("appDelegate", {
        language: "swift",
        contents: APP_DELEGATE,
      });
      assert.equal(delegate.contents.includes("handlerFor intent"), enabled);
      const project = await runMod("xcodeproj", loadFixtureProject());
      assert.equal(
        project.writeSync().includes("ReactTubeAppIntents.swift"),
        enabled,
      );
      assert.equal(
        existsSync(path.join(iosRoot, "reacttube/ReactTubeAppIntents.swift")),
        enabled,
      );
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test("tvOS never enables Siri even with enabled true", async () => {
  const config = siriConfig(true);
  config.plugins.push(["@react-native-tvos/config-tv", {isTV: true}]);
  assert.equal(isSiriBuildEnabled(config), false);
  const result = withSiri(config);
  assert.deepEqual(Object.keys(result.mods.ios), ["infoPlist"]);
});

test("EXPO_TV continues to exclude Siri even when its value is zero", () => {
  const previous = process.env.EXPO_TV;
  process.env.EXPO_TV = "0";
  try {
    assert.equal(isSiriBuildEnabled(siriConfig(true)), false);
  } finally {
    if (previous === undefined) delete process.env.EXPO_TV;
    else process.env.EXPO_TV = previous;
  }
});

test("App Group configuration follows the base bundle ID or an explicit override", () => {
  const config = siriConfig(true);
  assert.equal(getSiriAppGroup(config), "group.com.duell10111.reacttube");
  config.ios = {bundleIdentifier: "com.example.personal.reacttube"};
  assert.equal(getSiriAppGroup(config), "group.com.example.personal.reacttube");
  config.plugins.find(
    plugin => plugin[0] === "./plugins/ios/withSiri.js",
  )[1].appGroup = "group.example.music";
  assert.equal(getSiriAppGroup(config), "group.example.music");
  assert.throws(
    () => getSiriAppGroup(config, {appGroup: "invalid"}),
    /App Group identifier/,
  );
});
