import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import {fileURLToPath} from "node:url";

const require = createRequire(import.meta.url);
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
  assert.equal(phrases.path, '"de.lproj/AppShortcuts.strings"');
  assert.doesNotMatch(project.writeSync(), /= undefined;/);
  assert.ok(project.hasKnownRegion("de"));
});

test("adds the App Intent files only once across repeated prebuilds", () => {
  const project = addAppIntentFilesToProject(
    addAppIntentFilesToProject(loadFixtureProject(), "reacttube"),
    "reacttube",
  );
  assert.equal(buildPhaseFiles(project, "A50000000000000000000001").length, 2);
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
  assert.equal(
    formatStringsFile({
      "Search in ${applicationName}": 'Suche "in" ${applicationName}',
    }),
    '"Search in ${applicationName}" = "Suche \\"in\\" ${applicationName}";\n',
  );
});
