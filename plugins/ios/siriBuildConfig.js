/* eslint-env node */

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

/** Read the declared options before either plugin runs, regardless of order. */
function siriOptions(config) {
  const siriPlugin = (config.plugins ?? []).find(
    plugin =>
      Array.isArray(plugin) && plugin[0] === "./plugins/ios/withSiri.js",
  );
  return siriPlugin?.[1] ?? {};
}

function isSiriBuildEnabled(config, options = {}) {
  const enabled = options.enabled ?? siriOptions(config).enabled ?? true;
  if (typeof enabled !== "boolean") {
    throw new Error("[withSiri] enabled must be a boolean");
  }
  return enabled && !isTVBuild(config);
}

function getSiriAppGroup(config, options = {}) {
  const appGroup =
    options.appGroup ??
    siriOptions(config).appGroup ??
    `group.${config.ios?.bundleIdentifier ?? "com.duell10111.reacttube"}`;
  if (
    typeof appGroup !== "string" ||
    !/^group\.[A-Za-z0-9.-]+$/.test(appGroup)
  ) {
    throw new Error(
      "[withSiri] appGroup must be an App Group identifier starting with group.",
    );
  }
  return appGroup;
}

module.exports = {getSiriAppGroup, isSiriBuildEnabled, isTVBuild};
