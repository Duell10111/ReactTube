// plugins/ios/withStripVlcBitcode.js
const {withDangerousMod} = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");
const fs = require("node:fs");
const path = require("node:path");

/**
 * The prebuilt TVVLCKit framework (pulled in by react-native-vlc-media-player on
 * tvOS) still contains embedded bitcode. App Store Connect rejects any binary
 * with bitcode (ITMS-90482), so TestFlight uploads of the tvOS build fail even
 * though the archive succeeds. This plugin strips the bitcode from the vendored
 * binaries right after `pod install`, before Xcode copies them into the app.
 * MobileVLCKit (iOS) is included as well in case a release reintroduces it.
 */
const TAG = "reacttube-strip-vlc-bitcode";

const POST_INSTALL_SNIPPET = `    # Strip embedded bitcode from the prebuilt VLCKit frameworks; App Store
    # Connect rejects binaries that still contain bitcode (ITMS-90482).
    bitcode_strip = \`xcrun --find bitcode_strip 2>/dev/null\`.strip
    if bitcode_strip.empty?
      Pod::UI.warn '[ReactTube] bitcode_strip not found; VLCKit bitcode was not removed'
    else
      %w[TVVLCKit MobileVLCKit].each do |kit|
        Dir.glob(File.join(installer.sandbox.root.to_s, kit, '**', "#{kit}.framework", kit)).each do |binary|
          next if File.symlink?(binary)
          Pod::UI.puts "[ReactTube] Stripping bitcode from #{binary}"
          system(bitcode_strip, binary, '-r', '-o', binary) ||
            raise("[ReactTube] bitcode_strip failed for #{binary}")
        end
      end
    end`;

function addStripStep(podfile) {
  return mergeContents({
    tag: TAG,
    src: podfile,
    newSrc: POST_INSTALL_SNIPPET,
    anchor: /post_install do \|installer\|/,
    offset: 1,
    comment: "#",
  }).contents;
}

const withStripVlcBitcode = config =>
  withDangerousMod(config, [
    "ios",
    async modConfig => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "Podfile",
      );
      const podfile = fs.readFileSync(podfilePath, "utf8");
      fs.writeFileSync(podfilePath, addStripStep(podfile));
      return modConfig;
    },
  ]);

module.exports = withStripVlcBitcode;
module.exports.addStripStep = addStripStep;
