/* eslint-env node */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {createRequire} from "node:module";
import {tmpdir} from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath, URL} from "node:url";

const require = createRequire(import.meta.url);
const plist = require("@expo/plist").default;
const YAML = require("yaml");

const {configureBuild, parseBoolean} = require("../scripts/configure-build.js");
const {verifyBundle, verifyIpa} = require("../scripts/verify-apple-build.js");
const root = fileURLToPath(new URL("..", import.meta.url));
const config = JSON.parse(readFileSync(path.join(root, "app.json"), "utf8"));
const options = (data, name) =>
  data.expo.plugins.find(entry => Array.isArray(entry) && entry[0] === name)[1];

function temporary(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "reacttube-apple-build-"));
  t.after(() => rmSync(directory, {recursive: true, force: true}));
  return directory;
}

function writePlist(file, data) {
  mkdirSync(path.dirname(file), {recursive: true});
  writeFileSync(file, plist.build(data));
}

function createBundle(
  t,
  {
    siriEnabled = false,
    isTV = false,
    appGroup = "group.com.example.reacttube",
  } = {},
) {
  const directory = temporary(t);
  const bundle = path.join(
    directory,
    "reacttube.xcarchive/Products/Applications/reacttube.app",
  );
  const info = {
    CFBundleIdentifier: "com.example.reacttube",
    ReactTubeSiriEnabled: siriEnabled,
  };
  if (siriEnabled)
    Object.assign(info, {
      ReactTubeSiriAppGroup: appGroup,
      NSSiriUsageDescription: "Siri test fixture",
      INIntentsSupported: ["INUpdateMediaAffinityIntent"],
      INAlternativeAppNames: [{INAlternativeAppName: "React Tube"}],
    });
  writePlist(path.join(bundle, "Info.plist"), info);
  if (siriEnabled)
    writePlist(path.join(bundle, "PlugIns/SiriIntents.appex/Info.plist"), {
      CFBundleIdentifier: "com.example.reacttube.siriIntents",
      ReactTubeSiriAppGroup: appGroup,
      NSExtension: {NSExtensionPointIdentifier: "com.apple.intents-service"},
    });
  if (!isTV)
    writePlist(path.join(bundle, "Watch/RT-Watch.app/Info.plist"), {
      CFBundleIdentifier: "com.example.reacttube.watch",
      WKCompanionAppBundleIdentifier: "com.example.reacttube",
    });
  return {directory, bundle, info};
}

test("CI selects plugins by name, preserves options and overrides checked-in Siri", () => {
  const reversed = structuredClone(config);
  reversed.expo.plugins.reverse();
  for (const siriEnabled of [true, false]) {
    const result = configureBuild(reversed, {
      platform: "ios",
      isTV: false,
      siriEnabled,
    });
    assert.equal(
      options(result, "./plugins/ios/withSiri.js").enabled,
      siriEnabled,
    );
    assert.equal(options(result, "@react-native-tvos/config-tv").isTV, false);
    assert.deepEqual(options(result, "./plugins/ios/withAppleTargets.js"), {
      ...options(reversed, "./plugins/ios/withAppleTargets.js"),
      isTV: false,
    });
    assert.equal(
      result.expo.ios.bundleIdentifier,
      reversed.expo.ios.bundleIdentifier,
    );
  }
  assert.deepEqual(reversed.expo.plugins, [...config.expo.plugins].reverse());
});

test("TV CI always disables Siri and Android preserves its original Siri option", () => {
  const tv = configureBuild(config, {
    platform: "ios",
    isTV: true,
    siriEnabled: true,
  });
  assert.equal(options(tv, "./plugins/ios/withSiri.js").enabled, false);
  for (const name of [
    "@react-native-tvos/config-tv",
    "./plugins/ios/withAppleTargets.js",
  ])
    assert.equal(options(tv, name).isTV, true);
  const android = configureBuild(config, {
    platform: "android",
    isTV: false,
    siriEnabled: false,
  });
  assert.deepEqual(
    options(android, "./plugins/ios/withSiri.js"),
    options(config, "./plugins/ios/withSiri.js"),
  );
});

test("build configuration rejects invalid flags and missing plugins", () => {
  assert.equal(parseBoolean("false", "flag"), false);
  assert.equal(parseBoolean("true", "flag"), true);
  assert.throws(() => parseBoolean("0", "flag"), /must be true or false/);
  assert.throws(
    () =>
      configureBuild(config, {
        platform: "ios",
        isTV: "false",
        siriEnabled: false,
      }),
    /must be booleans/,
  );
  assert.throws(
    () =>
      configureBuild(
        {expo: {plugins: []}},
        {platform: "ios", isTV: false, siriEnabled: false},
      ),
    /exactly one/,
  );
});

test("configuration CLI defaults to no Siri, even when the checkout enables it", t => {
  const directory = temporary(t);
  writeFileSync(path.join(directory, "app.json"), JSON.stringify(config));
  execFileSync(
    process.execPath,
    [path.join(root, "scripts/configure-build.js"), "ios", "false"],
    {cwd: directory},
  );
  const result = JSON.parse(
    readFileSync(path.join(directory, "app.json"), "utf8"),
  );
  assert.equal(options(result, "./plugins/ios/withSiri.js").enabled, false);
});

test("each Apple workflow variant has a distinct artifact and explicit Siri option", () => {
  const workflow = YAML.parse(
    readFileSync(path.join(root, ".github/workflows/build.yml"), "utf8"),
  );
  const inputs = workflow.on.workflow_dispatch.inputs;
  assert.equal(inputs["build-ios-phone"].default, false);
  assert.equal(inputs["build-ios-siri"].default, false);
  const appleJobs = Object.values(workflow.jobs).filter(job =>
    job.steps.some(step => step.uses === "./.github/actions/apple-archive"),
  );
  const archives = appleJobs.map(job =>
    job.steps.find(step => step.uses === "./.github/actions/apple-archive"),
  );
  assert.deepEqual(archives.map(step => step.with["artifact-name"]).sort(), [
    "reacttube-ios-no-siri",
    "reacttube-ios-siri",
    "reacttube-tvos-no-siri",
  ]);
  for (const job of appleJobs) {
    const archive = job.steps.find(
      step => step.uses === "./.github/actions/apple-archive",
    );
    if (archive.with["artifact-name"] === "reacttube-ios-siri") {
      assert.equal(archive.with["siri-enabled"], "true");
      assert.match(job.if, /workflow_dispatch.*inputs.build-ios-siri/);
    } else assert.equal(archive.with["siri-enabled"], "false");
  }
  const prebuild = YAML.parse(
    readFileSync(
      path.join(root, ".github/actions/prebuild/action.yml"),
      "utf8",
    ),
  );
  assert.equal(prebuild.inputs["siri-enabled"].default, "false");
  assert.ok(prebuild.runs.steps.some(step => step.run?.includes("--clean")));
  assert.ok(
    prebuild.runs.steps.some(step =>
      step.run?.includes("verify-apple-build.js --project"),
    ),
  );
  const archive = YAML.parse(
    readFileSync(
      path.join(root, ".github/actions/apple-archive/action.yml"),
      "utf8",
    ),
  );
  assert.ok(
    archive.runs.steps.some(step =>
      step.run?.includes("CODE_SIGNING_ALLOWED=NO"),
    ),
  );
  assert.ok(
    archive.runs.steps.some(step =>
      step.run?.includes("verify-apple-build.js --ipa"),
    ),
  );
});

for (const {siriEnabled, isTV} of [
  {siriEnabled: false, isTV: false},
  {siriEnabled: true, isTV: false},
  {siriEnabled: false, isTV: true},
]) {
  test(`verifies packaged bundle Siri=${siriEnabled}, TV=${isTV}`, t => {
    const {bundle} = createBundle(t, {siriEnabled, isTV});
    verifyBundle(bundle, {siriEnabled, isTV});
  });
}

test("rejects stale Siri data in a no-Siri package", t => {
  const {bundle, info} = createBundle(t);
  writePlist(path.join(bundle, "Info.plist"), {
    ...info,
    NSSiriUsageDescription: "Stale permission",
  });
  assert.throws(
    () => verifyBundle(bundle, {siriEnabled: false, isTV: false}),
    /NSSiriUsageDescription/,
  );
});

test("rejects a missing extension or mismatched App Group in a Siri package", t => {
  const {bundle} = createBundle(t, {siriEnabled: true});
  const extension = path.join(bundle, "PlugIns/SiriIntents.appex/Info.plist");
  const info = plist.parse(readFileSync(extension, "utf8"));
  writePlist(extension, {...info, ReactTubeSiriAppGroup: "group.wrong"});
  assert.throws(
    () => verifyBundle(bundle, {siriEnabled: true, isTV: false}),
    /extension's App Group/,
  );
  rmSync(path.join(bundle, "PlugIns"), {recursive: true});
  assert.throws(
    () => verifyBundle(bundle, {siriEnabled: true, isTV: false}),
    /Packaged Siri extension/,
  );
});

test("accepts a configured App Group and detects a lost Watch payload", t => {
  const {bundle} = createBundle(t, {
    siriEnabled: true,
    appGroup: "group.custom.music",
  });
  verifyBundle(bundle, {
    siriEnabled: true,
    isTV: false,
    appGroup: "group.custom.music",
  });
  rmSync(path.join(bundle, "Watch"), {recursive: true});
  assert.throws(
    () =>
      verifyBundle(bundle, {
        siriEnabled: true,
        isTV: false,
        appGroup: "group.custom.music",
      }),
    /Watch app/,
  );
});

test("the archive packager and IPA verifier retain the Siri and Watch bundles", t => {
  const {directory} = createBundle(t, {siriEnabled: true});
  execFileSync(
    "bash",
    [path.join(root, "scripts/xcarchive_to_ipa.sh"), "reacttube.xcarchive"],
    {cwd: directory},
  );
  const ipa = path.join(directory, "reacttube.ipa");
  verifyIpa(ipa, {siriEnabled: true, isTV: false});
  assert.throws(
    () => verifyIpa(ipa, {siriEnabled: false, isTV: false}),
    /build marker/,
  );
});

test(
  "reads binary Info.plist files from an actual Apple archive format",
  {skip: process.platform !== "darwin"},
  t => {
    const {bundle} = createBundle(t);
    execFileSync("plutil", [
      "-convert",
      "binary1",
      path.join(bundle, "Info.plist"),
    ]);
    verifyBundle(bundle, {siriEnabled: false, isTV: false});
  },
);

test("rejects a leftover Siri extension even when the main app marker is disabled", t => {
  const {bundle} = createBundle(t, {siriEnabled: true});
  writePlist(path.join(bundle, "Info.plist"), {
    CFBundleIdentifier: "com.example.reacttube",
    ReactTubeSiriEnabled: false,
  });
  assert.throws(
    () => verifyBundle(bundle, {siriEnabled: false, isTV: false}),
    /Packaged Siri extension/,
  );
});

test("rejects a Watch companion identifier from a different app", t => {
  const {bundle} = createBundle(t);
  writePlist(path.join(bundle, "Watch/RT-Watch.app/Info.plist"), {
    CFBundleIdentifier: "com.example.reacttube.watch",
    WKCompanionAppBundleIdentifier: "com.other.app",
  });
  assert.throws(
    () => verifyBundle(bundle, {siriEnabled: false, isTV: false}),
    /Watch companion/,
  );
});

test("IPA CLI verifies configured IDs and custom App Groups from app.json", t => {
  const {directory} = createBundle(t, {
    siriEnabled: true,
    appGroup: "group.custom.music",
  });
  execFileSync(
    "bash",
    [path.join(root, "scripts/xcarchive_to_ipa.sh"), "reacttube.xcarchive"],
    {cwd: directory},
  );
  const file = path.join(directory, "app.json");
  const configFile = {
    expo: {
      ios: {bundleIdentifier: "com.example.reacttube"},
      plugins: [
        [
          "./plugins/ios/withSiri.js",
          {enabled: true, appGroup: "group.custom.music"},
        ],
      ],
    },
  };
  writeFileSync(file, JSON.stringify(configFile));
  const args = [
    path.join(root, "scripts/verify-apple-build.js"),
    "--ipa",
    path.join(directory, "reacttube.ipa"),
    "--siri",
    "true",
    "--config",
    file,
  ];
  execFileSync(process.execPath, args);
  configFile.expo.ios.bundleIdentifier = "com.different.app";
  writeFileSync(file, JSON.stringify(configFile));
  assert.throws(
    () => execFileSync(process.execPath, args, {stdio: "pipe"}),
    /configured bundle ID/,
  );
});
