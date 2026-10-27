/* eslint-env node */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {createRequire} from "node:module";
import {tmpdir} from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const require = createRequire(import.meta.url);
const upstreamRequire = createRequire(
  require.resolve("@bacons/apple-targets/app.plugin"),
);
const {
  XcodeProject,
  PBXBuildFile,
  XCSwiftPackageProductDependency,
  XCRemoteSwiftPackageReference,
} = upstreamRequire("@bacons/xcode");
const {build} = upstreamRequire("@bacons/xcode/json");
const {
  configureSwiftPackages,
} = require("../plugins/ios/withAppleTargetSwiftPackages");
const withAppleTargets = require("../plugins/ios/withAppleTargets");
const withSiri = require("../plugins/ios/withSiri");
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const watchConfig = require("../targets/watch/expo-target.config");
const dependency = watchConfig.swiftDependencies[0];
const packageTarget = {
  bundleIdentifier: "com.example.reacttube.watch",
  type: "watch",
  dependencies: [dependency],
};

function fixture(t, siriEnabled = true) {
  const root = mkdtempSync(path.join(tmpdir(), "reacttube-apple-targets-"));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  mkdirSync(path.join(root, "ios/reacttube.xcodeproj"), {recursive: true});
  cpSync(
    path.join(repositoryRoot, "test/fixtures/siri-app.pbxproj"),
    path.join(root, "ios/reacttube.xcodeproj/project.pbxproj"),
  );
  const cleanProject = XcodeProject.open(
    path.join(root, "ios/reacttube.xcodeproj/project.pbxproj"),
  );
  cleanProject.rootObject.props.targets =
    cleanProject.rootObject.props.targets.filter(
      target => target.props.name === "reacttube",
    );
  writeFileSync(
    path.join(root, "ios/reacttube.xcodeproj/project.pbxproj"),
    build(cleanProject.toJSON()),
  );
  for (const directory of ["watch", "siri-intents"]) {
    const target = structuredClone(
      require(`../targets/${directory}/expo-target.config`),
    );
    delete target.icon;
    const destination = path.join(root, "targets", directory);
    mkdirSync(destination, {recursive: true});
    writeFileSync(
      path.join(destination, "expo-target.config.json"),
      JSON.stringify(target),
    );
    writeFileSync(
      path.join(destination, "Example.swift"),
      "import Foundation\n",
    );
  }
  mkdirSync(path.join(root, "ios/reacttube"), {recursive: true});
  writeFileSync(
    path.join(root, "ios/reacttube/AppDelegate.swift"),
    "import Foundation\n",
  );
  const config = {
    name: "reacttube",
    slug: "reacttube",
    ios: {bundleIdentifier: "com.example.reacttube"},
    _internal: {projectRoot: root},
    plugins: [
      ["@react-native-tvos/config-tv", {isTV: false}],
      ["./plugins/ios/withSiri.js", {enabled: siriEnabled}],
    ],
  };
  return {
    root,
    config,
    projectPath: path.join(root, "ios/reacttube.xcodeproj/project.pbxproj"),
  };
}

async function generate(config, root, siriFirst = false) {
  if (siriFirst) config = withSiri(config);
  let configured = withAppleTargets(config, {appleTeamId: "XXXXXXXXXX"});
  if (!siriFirst) configured = withSiri(configured);
  if (configured.mods.ios.xcodeproj) {
    const parsed = require("xcode").project(
      path.join(root, "ios/reacttube.xcodeproj/project.pbxproj"),
    );
    parsed.parseSync();
    const result = await configured.mods.ios.xcodeproj({
      ...configured,
      modResults: parsed,
      modRequest: {
        projectRoot: root,
        platformProjectRoot: path.join(root, "ios"),
      },
    });
    writeFileSync(
      path.join(root, "ios/reacttube.xcodeproj/project.pbxproj"),
      result.modResults.writeSync(),
    );
  }
  await configured.mods.ios.dangerous({
    ...configured,
    modRequest: {
      projectRoot: root,
      platformProjectRoot: path.join(root, "ios"),
    },
  });
  await configured.mods.ios.xcodeProjectBeta2({
    ...configured,
    modRequest: {
      projectRoot: root,
      platformProjectRoot: path.join(root, "ios"),
      platform: "ios",
      modName: "xcodeProjectBeta2",
    },
  });
  return XcodeProject.open(
    path.join(root, "ios/reacttube.xcodeproj/project.pbxproj"),
  );
}

function assertPackages(project, dependencies = watchConfig.swiftDependencies) {
  const watch = project.rootObject.props.targets.find(
    t =>
      t.getDefaultBuildSetting("PRODUCT_BUNDLE_IDENTIFIER") ===
      "com.example.reacttube.watch",
  );
  assert.ok(watch);
  assert.equal(
    watch.getDefaultBuildSetting("WATCHOS_DEPLOYMENT_TARGET"),
    "10.0",
  );
  const references = project.rootObject.props.packageReferences;
  for (const item of dependencies) {
    const refs = references.filter(
      ref => ref.props.repositoryURL === item.repository,
    );
    assert.equal(refs.length, 1);
    assert.deepEqual(refs[0].props.requirement, {
      kind: "branch",
      branch: item.branch,
    });
    const products = watch.props.packageProductDependencies.filter(
      product => product.props.productName === item.name,
    );
    assert.equal(products.length, 1);
    assert.equal(products[0].props.package.uuid, refs[0].uuid);
    assert.equal(
      watch
        .getFrameworksBuildPhase()
        .props.files.filter(
          file => file.props.productRef?.uuid === products[0].uuid,
        ).length,
      1,
    );
  }
  return watch;
}

for (const enabled of [false, true]) {
  test(`upstream provider links Watch packages and preserves identities with Siri=${enabled}`, async t => {
    const {config, root} = fixture(t, enabled);
    for (const reverse of [false, true]) {
      const input = structuredClone(config);
      if (reverse) input.plugins.reverse();
      const project = await generate(input, root, reverse);
      const watch = assertPackages(project);
      assert.equal(watch.props.name, "RT-Watch");
      const siri = project.rootObject.props.targets.filter(
        target => target.props.name === "SiriIntents",
      );
      assert.equal(siri.length, enabled ? 1 : 0);
      if (enabled) {
        assert.ok(
          readFileSync(
            path.join(root, "ios/reacttube.xcodeproj/project.pbxproj"),
            "utf8",
          ).includes("ReactTubeAppIntents.swift"),
        );
        assert.equal(
          siri[0].getDefaultBuildSetting("PRODUCT_BUNDLE_IDENTIFIER"),
          "com.example.reacttube.siriIntents",
        );
        assert.equal(
          String(siri[0].getDefaultBuildSetting("IPHONEOS_DEPLOYMENT_TARGET")),
          "16.4",
        );
      }
      assert.equal(project.rootObject.props.targets.length, enabled ? 3 : 2);
    }
  });
}

test("TV flags return without registering target, Podfile or SPM mods", () => {
  const previous = process.env.EXPO_TV;
  try {
    for (const source of ["options", "config", "environment"]) {
      delete process.env.EXPO_TV;
      const config = {
        plugins: [
          ["@react-native-tvos/config-tv", {isTV: source === "config"}],
        ],
      };
      if (source === "environment") process.env.EXPO_TV = "1";
      const result = withAppleTargets(config, {isTV: source === "options"});
      assert.equal(result, config);
      assert.equal(result.mods, undefined);
    }
  } finally {
    if (previous === undefined) delete process.env.EXPO_TV;
    else process.env.EXPO_TV = previous;
  }
});

test("SPM adapter preserves unrelated packages and reuses existing references after serialization", async t => {
  const {config, root} = fixture(t);
  let project = await generate(config, root);
  const watch = assertPackages(project);
  const foreign = XCRemoteSwiftPackageReference.create(project, {
    repositoryURL: "https://example.com/Other.git",
    requirement: {kind: "branch", branch: "main"},
  });
  project.rootObject.props.packageReferences.push(foreign);
  const foreignProduct = XCSwiftPackageProductDependency.create(project, {
    productName: "Other",
    package: foreign,
  });
  watch.props.packageProductDependencies.push(foreignProduct);
  watch
    .getFrameworksBuildPhase()
    .props.files.push(
      PBXBuildFile.create(project, {productRef: foreignProduct}),
    );
  const target = {
    ...packageTarget,
    dependencies: watchConfig.swiftDependencies,
  };
  const before = build(project.toJSON());
  configureSwiftPackages(project, [target]);
  assert.equal(build(project.toJSON()), before);
  const serialized = path.join(root, "roundtrip.pbxproj");
  writeFileSync(serialized, before);
  project = XcodeProject.open(serialized);
  configureSwiftPackages(project, [target]);
  assert.equal(build(project.toJSON()), before);
  assertPackages(project);
});

test("missing, ambiguous and wrong-platform package targets fail explicitly", async t => {
  const {config, root} = fixture(t);
  const project = await generate(config, root);
  assert.throws(
    () =>
      configureSwiftPackages(project, [
        {...packageTarget, bundleIdentifier: "com.missing"},
      ]),
    /found 0/,
  );
  assert.throws(
    () => configureSwiftPackages(project, [{...packageTarget, type: "intent"}]),
    /found 0/,
  );
  const watch = project.rootObject.props.targets.find(
    target => target.props.name === "RT-Watch",
  );
  project.rootObject.props.targets.push(watch);
  assert.throws(
    () => configureSwiftPackages(project, [packageTarget]),
    /found 2/,
  );
});

test("invalid package configuration fails before registering the original plugin", t => {
  const {config, root} = fixture(t);
  const file = path.join(root, "targets/watch/expo-target.config.json");
  writeFileSync(
    file,
    JSON.stringify({
      ...watchConfig,
      swiftDependencies: [{...dependency, branch: ""}],
    }),
  );
  assert.throws(
    () => withAppleTargets(config),
    /require name, repository and branch/,
  );
});

test("unused ExtensionStorage native module is excluded from Expo autolinking", () => {
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [
        path.join(
          path.dirname(require.resolve("expo/package.json")),
          "bin/autolinking",
        ),
        "resolve",
        "--platform",
        "apple",
        "--project-root",
        repositoryRoot,
        "--json",
      ],
      {cwd: repositoryRoot, encoding: "utf8"},
    ),
  );
  assert.equal(
    result.modules.some(
      module => module.packageName === "@bacons/apple-targets",
    ),
    false,
  );
});

test("CI verification rejects an SPM product missing from the Frameworks phase", async t => {
  const {config, root, projectPath} = fixture(t);
  const project = await generate(config, root);
  const xcode = require("xcode");
  const parsed = xcode.project(projectPath);
  parsed.parseSync();
  const watch = Object.values(parsed.pbxNativeTargetSection()).find(
    target => target?.name?.replace(/^"|"$/g, "") === "RT-Watch",
  );
  const {verifyWatchPackages} = require("../scripts/verify-apple-build");
  verifyWatchPackages(parsed, watch, watchConfig.swiftDependencies);
  const watchModel = assertPackages(project);
  const frameworkProduct = watchModel.props.packageProductDependencies.find(
    product => product.props.productName === dependency.name,
  );
  const phase = watchModel.getFrameworksBuildPhase();
  phase.props.files = phase.props.files.filter(
    file => file.props.productRef?.uuid !== frameworkProduct.uuid,
  );
  writeFileSync(projectPath, build(project.toJSON()));
  const broken = xcode.project(projectPath);
  broken.parseSync();
  const brokenWatch = Object.values(broken.pbxNativeTargetSection()).find(
    target => target?.name?.replace(/^"|"$/g, "") === "RT-Watch",
  );
  assert.throws(
    () =>
      verifyWatchPackages(broken, brokenWatch, watchConfig.swiftDependencies),
    /Watch links SwiftAudioEx in Frameworks/,
  );
});

test("SPM adapter repairs a missing link and updates the selected branch without duplicate products", async t => {
  const {config, root} = fixture(t);
  const project = await generate(config, root);
  const watch = assertPackages(project);
  const products = watch.props.packageProductDependencies.length;
  const phase = watch.getFrameworksBuildPhase();
  phase.props.files = phase.props.files.filter(
    file => file.props.productRef?.props.productName !== dependency.name,
  );
  const updated = {...dependency, branch: "another-branch"};
  configureSwiftPackages(project, [
    {...packageTarget, dependencies: [updated]},
  ]);
  assertPackages(project, [updated]);
  assert.equal(watch.props.packageProductDependencies.length, products);
});
