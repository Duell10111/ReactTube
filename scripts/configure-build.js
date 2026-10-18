/* eslint-env node */
const fs = require("fs");

function parseBoolean(value, name) {
  if (value !== "true" && value !== "false") {
    throw new Error(`${name} must be true or false`);
  }
  return value === "true";
}

function pluginOptions(config, name) {
  const entries = config.expo.plugins.filter(
    entry => (Array.isArray(entry) ? entry[0] : entry) === name,
  );
  if (entries.length !== 1) {
    throw new Error(`Expected exactly one ${name} plugin`);
  }
  const entry = entries[0];
  if (Array.isArray(entry)) {
    entry[1] ??= {};
    return entry[1];
  }
  const replacement = [entry, {}];
  config.expo.plugins[config.expo.plugins.indexOf(entry)] = replacement;
  return replacement[1];
}

function configureBuild(config, {platform, isTV, siriEnabled}) {
  if (!["ios", "android"].includes(platform)) {
    throw new Error("platform must be ios or android");
  }
  if (typeof isTV !== "boolean" || typeof siriEnabled !== "boolean") {
    throw new Error("Build flags must be booleans");
  }
  const result = structuredClone(config);
  pluginOptions(result, "@react-native-tvos/config-tv").isTV = isTV;
  pluginOptions(result, "./plugins/ios/withAppleTargets.js").isTV = isTV;
  if (platform === "ios") {
    pluginOptions(result, "./plugins/ios/withSiri.js").enabled =
      siriEnabled && !isTV;
  }
  return result;
}

if (require.main === module) {
  const [platform, tv, siri = "false"] = process.argv.slice(2);
  const config = configureBuild(
    JSON.parse(fs.readFileSync("app.json", "utf8")),
    {
      platform,
      isTV: parseBoolean(tv, "is-tv"),
      siriEnabled: parseBoolean(siri, "siri-enabled"),
    },
  );
  fs.writeFileSync("app.json", JSON.stringify(config, null, 2) + "\n");
}

module.exports = {configureBuild, parseBoolean};
