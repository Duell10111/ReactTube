/* eslint-env node */
const plist = require("@expo/plist").default;
const assert = require("assert").strict;
const {execFileSync} = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const xcode = require("xcode");

const {parseBoolean} = require("./configure-build");
const {getSiriAppGroup} = require("../plugins/ios/siriBuildConfig");

const unquote = value => String(value ?? "").replace(/^"|"$/g, "");

function readPlist(file) {
  const data = fs.readFileSync(file);
  const xml =
    data.subarray(0, 6).toString() === "bplist"
      ? execFileSync("plutil", ["-convert", "xml1", "-o", "-", file], {
          encoding: "utf8",
        })
      : data.toString();
  return plist.parse(xml);
}

function assertSiriPlist(info, enabled) {
  assert.equal(info.ReactTubeSiriEnabled, enabled, "Native Siri build marker");
  for (const key of [
    "NSSiriUsageDescription",
    "INIntentsSupported",
    "INAlternativeAppNames",
    "ReactTubeSiriAppGroup",
  ]) {
    assert.equal(key in info, enabled, `${key} must follow the Siri flag`);
  }
}

function assertSiriEntitlements(entitlements, enabled, appGroup, app = true) {
  assert.equal(
    entitlements["com.apple.developer.siri"] === true,
    enabled && app,
    "Siri entitlement",
  );
  const groups = entitlements["com.apple.security.application-groups"] ?? [];
  assert.equal(
    groups.includes(appGroup),
    enabled,
    "Siri App Group entitlement",
  );
}

function configurations(project, owner) {
  const list = project.pbxXCConfigurationList()[owner.buildConfigurationList];
  return list.buildConfigurations.map(
    ({value}) => project.pbxXCBuildConfigurationSection()[value].buildSettings,
  );
}

function verifyWatchPackages(project, watch, dependencies) {
  const objects = project.hash.project.objects;
  const reference = value => value?.value ?? value;
  const root = project.getFirstProject().firstProject;
  const packages = (root.packageReferences ?? []).map(
    value => objects.XCRemoteSwiftPackageReference?.[reference(value)],
  );
  const products = (watch.packageProductDependencies ?? []).map(value => ({
    uuid: reference(value),
    ...objects.XCSwiftPackageProductDependency?.[reference(value)],
  }));
  const frameworks = watch.buildPhases
    .map(value => objects.PBXFrameworksBuildPhase?.[reference(value)])
    .filter(Boolean)
    .flatMap(phase =>
      phase.files.map(value => objects.PBXBuildFile[reference(value)]),
    );
  for (const dependency of dependencies) {
    const refs = packages.filter(
      pkg => unquote(pkg?.repositoryURL) === dependency.repository,
    );
    assert.equal(
      refs.length,
      1,
      `One package reference for ${dependency.name}`,
    );
    assert.equal(unquote(refs[0].requirement.kind), "branch");
    assert.equal(unquote(refs[0].requirement.branch), dependency.branch);
    const linked = products.filter(
      product => unquote(product.productName) === dependency.name,
    );
    assert.equal(
      linked.length,
      1,
      `One Watch package product for ${dependency.name}`,
    );
    assert.equal(
      objects.XCRemoteSwiftPackageReference[reference(linked[0].package)],
      refs[0],
    );
    assert.equal(
      frameworks.filter(file => reference(file.productRef) === linked[0].uuid)
        .length,
      1,
      `Watch links ${dependency.name} in Frameworks`,
    );
  }
}

function verifyProject(root, {siriEnabled, isTV}) {
  const config = JSON.parse(
    fs.readFileSync(path.join(root, "app.json"), "utf8"),
  ).expo;
  const enabled = siriEnabled && !isTV;
  const appGroup = getSiriAppGroup(config);
  const iosRoot = path.join(root, "ios");
  const projects = fs
    .readdirSync(iosRoot)
    .filter(name => name.endsWith(".xcodeproj"));
  assert.equal(projects.length, 1, "One generated app project expected");
  const project = xcode.project(
    path.join(iosRoot, projects[0], "project.pbxproj"),
  );
  project.parseSync();
  const targets = Object.values(project.pbxNativeTargetSection()).filter(
    value => value?.isa === "PBXNativeTarget",
  );
  const app = targets.find(target =>
    configurations(project, target).some(
      settings =>
        unquote(settings.PRODUCT_BUNDLE_IDENTIFIER) ===
        config.ios.bundleIdentifier,
    ),
  );
  assert.ok(app, "Main app target");
  const siriTargets = targets.filter(
    target => unquote(target.name) === "SiriIntents",
  );
  assert.equal(siriTargets.length, enabled ? 1 : 0, "Siri extension target");
  assert.equal(
    targets.filter(target => unquote(target.name) === "RT-Watch").length,
    isTV ? 0 : 1,
    "Watch target is preserved on iOS only",
  );
  for (const watch of targets.filter(
    target => unquote(target.name) === "RT-Watch",
  )) {
    const watchConfig = require(
      path.join(root, "targets/watch/expo-target.config.js"),
    );
    verifyWatchPackages(project, watch, watchConfig.swiftDependencies);
    for (const settings of configurations(project, watch)) {
      assert.equal(
        unquote(settings.WATCHOS_DEPLOYMENT_TARGET),
        watchConfig.deploymentTarget,
      );
      assert.equal(
        unquote(settings.PRODUCT_BUNDLE_IDENTIFIER),
        `${config.ios.bundleIdentifier}.watch`,
      );
      assert.equal(
        unquote(settings.INFOPLIST_KEY_WKCompanionAppBundleIdentifier),
        config.ios.bundleIdentifier,
      );
    }
  }

  for (const settings of configurations(project, app)) {
    const info = readPlist(
      path.resolve(iosRoot, unquote(settings.INFOPLIST_FILE)),
    );
    assertSiriPlist(info, enabled);
    const entitlements = readPlist(
      path.resolve(iosRoot, unquote(settings.CODE_SIGN_ENTITLEMENTS)),
    );
    assertSiriEntitlements(entitlements, enabled, appGroup);
    if (enabled) assert.equal(info.ReactTubeSiriAppGroup, appGroup);
  }
  const sourceRoot = path.join(iosRoot, unquote(app.name));
  const delegate = fs.readFileSync(
    path.join(sourceRoot, "AppDelegate.swift"),
    "utf8",
  );
  assert.equal(
    delegate.includes("handlerFor intent: INIntent"),
    enabled,
    "Siri AppDelegate handler",
  );
  for (const name of [
    "ReactTubeAppIntents.swift",
    "ReactTubeAudioSchemaIntents.swift",
  ]) {
    assert.equal(fs.existsSync(path.join(sourceRoot, name)), enabled, name);
    assert.equal(
      project.writeSync().includes(name),
      enabled,
      `${name} target membership`,
    );
  }
  if (enabled) {
    for (const settings of configurations(
      project,
      project.getFirstProject().firstProject,
    )) {
      assert.equal(
        unquote(settings.REACTTUBE_SIRI_APP_GROUP),
        appGroup,
        "Extension's inherited App Group setting",
      );
    }
    for (const settings of configurations(project, siriTargets[0])) {
      assert.equal(unquote(settings.IPHONEOS_DEPLOYMENT_TARGET), "16.4");
      assert.equal(
        unquote(settings.PRODUCT_BUNDLE_IDENTIFIER),
        `${config.ios.bundleIdentifier}.siriIntents`,
      );
      assertSiriEntitlements(
        readPlist(
          path.resolve(iosRoot, unquote(settings.CODE_SIGN_ENTITLEMENTS)),
        ),
        true,
        appGroup,
        false,
      );
      const info = readPlist(
        path.resolve(iosRoot, unquote(settings.INFOPLIST_FILE)),
      );
      assert.equal(info.ReactTubeSiriAppGroup, "$(REACTTUBE_SIRI_APP_GROUP)");
    }
  }
}

function childBundles(directory, suffix) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter(name => name.endsWith(suffix))
    .map(name => path.join(directory, name));
}

function verifySignature(bundle, appGroup, siriEnabled, isMainApp, team) {
  execFileSync("codesign", ["--verify", "--strict", bundle]);
  const entitlements = plist.parse(
    execFileSync("codesign", ["-d", "--entitlements", ":-", bundle], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  const profile = plist.parse(
    execFileSync(
      "security",
      ["cms", "-D", "-i", path.join(bundle, "embedded.mobileprovision")],
      {encoding: "utf8"},
    ),
  );
  const bundleId = readPlist(
    path.join(bundle, "Info.plist"),
  ).CFBundleIdentifier;
  assert.ok(
    profile.ExpirationDate > new Date(),
    "Provisioning profile is not expired",
  );
  assert.ok(
    profile.TeamIdentifier.includes(
      entitlements["com.apple.developer.team-identifier"],
    ),
    "Signing team matches the profile",
  );
  if (team)
    assert.equal(
      entitlements["com.apple.developer.team-identifier"],
      team,
      "All bundles use the same team",
    );
  const identifier = entitlements["application-identifier"];
  assert.ok(
    identifier.endsWith(`.${bundleId}`),
    "Signed application identifier matches bundle ID",
  );
  const allowed = profile.Entitlements["application-identifier"];
  assert.ok(
    allowed === identifier ||
      (allowed.endsWith("*") && identifier.startsWith(allowed.slice(0, -1))),
    "Profile covers the signed application identifier",
  );
  assertSiriEntitlements(entitlements, siriEnabled, appGroup, isMainApp);
  if (siriEnabled) {
    assert.ok(
      profile.Entitlements["com.apple.security.application-groups"]?.includes(
        appGroup,
      ),
      "Profile covers the App Group",
    );
    if (isMainApp)
      assert.equal(profile.Entitlements["com.apple.developer.siri"], true);
  }
  return entitlements["com.apple.developer.team-identifier"];
}

function verifyBundle(
  bundle,
  {siriEnabled, isTV, appGroup, bundleIdentifier, signed = false},
) {
  const enabled = siriEnabled && !isTV;
  const info = readPlist(path.join(bundle, "Info.plist"));
  if (bundleIdentifier)
    assert.equal(
      info.CFBundleIdentifier,
      bundleIdentifier,
      "Packaged app matches the configured bundle ID",
    );
  appGroup ??= `group.${info.CFBundleIdentifier}`;
  assertSiriPlist(info, enabled);
  if (enabled)
    assert.equal(info.ReactTubeSiriAppGroup, appGroup, "Built app's App Group");
  const extensions = childBundles(path.join(bundle, "PlugIns"), ".appex");
  const siriExtensions = extensions.filter(
    extension =>
      readPlist(path.join(extension, "Info.plist")).NSExtension
        ?.NSExtensionPointIdentifier === "com.apple.intents-service",
  );
  assert.equal(
    siriExtensions.length,
    enabled ? 1 : 0,
    "Packaged Siri extension",
  );
  for (const extension of siriExtensions) {
    const extensionInfo = readPlist(path.join(extension, "Info.plist"));
    assert.equal(
      extensionInfo.CFBundleIdentifier,
      `${info.CFBundleIdentifier}.siriIntents`,
    );
    assert.equal(
      extensionInfo.ReactTubeSiriAppGroup,
      appGroup,
      "Built extension's App Group",
    );
  }
  const watches = childBundles(path.join(bundle, "Watch"), ".app");
  assert.equal(watches.length, isTV ? 0 : 1, "Packaged Watch app");
  for (const watch of watches) {
    const watchInfo = readPlist(path.join(watch, "Info.plist"));
    assert.equal(
      watchInfo.CFBundleIdentifier,
      `${info.CFBundleIdentifier}.watch`,
    );
    assert.equal(
      watchInfo.WKCompanionAppBundleIdentifier,
      info.CFBundleIdentifier,
      "Watch companion matches the built app",
    );
  }
  if (signed) {
    const team = verifySignature(bundle, appGroup, enabled, true);
    for (const extension of extensions)
      verifySignature(
        extension,
        appGroup,
        enabled && siriExtensions.includes(extension),
        false,
        team,
      );
    for (const watch of watches)
      verifySignature(watch, appGroup, false, false, team);
  }
}

function verifyIpa(file, options) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "reacttube-ipa-"));
  try {
    execFileSync("unzip", ["-q", path.resolve(file), "-d", temp]);
    const bundles = childBundles(path.join(temp, "Payload"), ".app");
    assert.equal(bundles.length, 1, "IPA contains exactly one main app");
    verifyBundle(bundles[0], options);
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
}

if (require.main === module) {
  const {parseArgs} = require("util");
  const {values} = parseArgs({
    options: {
      project: {type: "string"},
      ipa: {type: "string"},
      siri: {type: "string", default: "false"},
      tv: {type: "string", default: "false"},
      "app-group": {type: "string"},
      config: {type: "string"},
      signed: {type: "boolean", default: false},
    },
  });
  const config = values.config
    ? JSON.parse(fs.readFileSync(values.config, "utf8")).expo
    : undefined;
  const options = {
    siriEnabled: parseBoolean(values.siri, "siri"),
    isTV: parseBoolean(values.tv, "tv"),
    appGroup:
      values["app-group"] ?? (config ? getSiriAppGroup(config) : undefined),
    bundleIdentifier: config?.ios?.bundleIdentifier,
    signed: values.signed,
  };
  assert.ok(
    Boolean(values.project) !== Boolean(values.ipa),
    "Pass exactly one of --project or --ipa",
  );
  if (values.project) verifyProject(path.resolve(values.project), options);
  else verifyIpa(values.ipa, options);
  process.stdout.write(
    `Apple build verified: Siri=${options.siriEnabled && !options.isTV}, TV=${options.isTV}\n`,
  );
}

module.exports = {verifyProject, verifyBundle, verifyIpa, verifyWatchPackages};
