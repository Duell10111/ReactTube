/** @type {import('../../plugins/ios/withAppleTargetSwiftPackages').TargetConfig} */
module.exports = {
  type: "watch",
  name: "RT-Watch",
  bundleIdentifier: ".watch",
  icon: "../../assets/icon-512-maskable.png",
  deploymentTarget: "10.0",
  swiftDependencies: [
    {
      name: "SwiftAudioEx",
      repository: "https://github.com/Duell10111/SwiftAudioEx.git",
      branch: "watchos-support-add-crop",
    },
  ],
};
