import assert from "node:assert/strict";
import {createRequire} from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  addSiriAppDelegateCode,
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
