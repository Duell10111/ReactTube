/* eslint-env node */
const {
  withXcodeProjectBeta,
} = require("@bacons/apple-targets/build/with-bacons-xcode");
const {createRequire} = require("module");

// Use the same Xcode model classes as the pinned upstream plugin, even when npm
// installs another version elsewhere in the dependency tree.
const upstreamRequire = createRequire(
  require.resolve("@bacons/apple-targets/app.plugin"),
);
const {
  PBXBuildFile,
  PBXNativeTarget,
  XCRemoteSwiftPackageReference,
  XCSwiftPackageProductDependency,
} = upstreamRequire("@bacons/xcode");
const {globSync} = upstreamRequire("glob");

/**
 * @typedef {{name: string, repository: string, branch: string}} SwiftDependency
 * @typedef {import('@bacons/apple-targets/app.plugin').Config & {
 *   swiftDependencies?: SwiftDependency[]
 * }} TargetConfig
 */

function readSwiftPackageTargets(config, {root = "./targets", match = "*"}) {
  return globSync(`${root}/${match}/expo-target.config.@(json|js)`, {
    cwd: config._internal.projectRoot,
    absolute: true,
  }).flatMap(configPath => {
    const exported = require(configPath);
    const target = typeof exported === "function" ? exported(config) : exported;
    if (!target.swiftDependencies?.length) return [];
    if (!target.bundleIdentifier) {
      throw new Error(
        `[apple-targets] Swift packages require an explicit bundleIdentifier: ${configPath}`,
      );
    }
    const bundleIdentifier = target.bundleIdentifier.startsWith(".")
      ? config.ios.bundleIdentifier + target.bundleIdentifier
      : target.bundleIdentifier;
    for (const dependency of target.swiftDependencies) {
      if (
        ![dependency.name, dependency.repository, dependency.branch].every(
          value => typeof value === "string" && value.trim().length > 0,
        )
      ) {
        throw new Error(
          `[apple-targets] Swift packages require name, repository and branch: ${configPath}`,
        );
      }
    }
    return [
      {
        bundleIdentifier,
        type: target.type,
        dependencies: target.swiftDependencies,
      },
    ];
  });
}

function configureSwiftPackages(project, targets) {
  for (const {bundleIdentifier, type, dependencies} of targets) {
    const matches = project.rootObject.props.targets.filter(
      target =>
        PBXNativeTarget.is(target) &&
        target.getDefaultBuildSetting("PRODUCT_BUNDLE_IDENTIFIER") ===
          bundleIdentifier &&
        target.isWatchOSTarget() === (type === "watch"),
    );
    if (matches.length !== 1) {
      throw new Error(
        `[apple-targets] Expected one Swift package target for ${bundleIdentifier}, found ${matches.length}`,
      );
    }
    const target = matches[0];
    project.rootObject.props.packageReferences ??= [];
    target.props.packageProductDependencies ??= [];
    const references = project.rootObject.props.packageReferences;
    const products = target.props.packageProductDependencies;
    const frameworks = target.getFrameworksBuildPhase();
    for (const dependency of dependencies) {
      let reference = references.find(
        ref =>
          XCRemoteSwiftPackageReference.is(ref) &&
          ref.props.repositoryURL === dependency.repository,
      );
      const requirement = {kind: "branch", branch: dependency.branch};
      if (!reference) {
        reference = XCRemoteSwiftPackageReference.create(project, {
          repositoryURL: dependency.repository,
          requirement,
        });
        references.push(reference);
      } else {
        reference.props.requirement = requirement;
      }
      let product = products.find(
        candidate =>
          candidate.props.productName === dependency.name &&
          candidate.props.package?.uuid === reference.uuid,
      );
      if (!product) {
        product = XCSwiftPackageProductDependency.create(project, {
          productName: dependency.name,
          package: reference,
        });
        products.push(product);
      }
      if (
        !frameworks.props.files.some(
          file => file.props.productRef?.uuid === product.uuid,
        )
      ) {
        frameworks.props.files.push(
          PBXBuildFile.create(project, {productRef: product}),
        );
      }
    }
  }
}

function withAppleTargetSwiftPackages(config, options = {}) {
  const targets = readSwiftPackageTargets(config, options);
  if (!targets.length) return config;
  return withXcodeProjectBeta(config, modConfig => {
    configureSwiftPackages(modConfig.modResults, targets);
    return modConfig;
  });
}

module.exports = {withAppleTargetSwiftPackages, configureSwiftPackages};
