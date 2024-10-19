/** @type {import('@duell10111/apple-targets').Config} */
module.exports = {
  type: "watch",
  name: "RT-Watch",
  bundleId: "com.duell10111.reacttube.watch",
  icon: "../../assets/icon-512-maskable.png",
  deploymentTarget: "10.0",
  swiftDependencies: [
    {
      name: "SwiftAudioEx",
      repository: "https://github.com/Duell10111/SwiftAudioEx.git",
      branch: "watchos-support-add-crop",
    },
    {
      name: "SDDownloadManager",
      repository: "https://github.com/SagarSDagdu/SDDownloadManager.git",
      branch: "master",
    },
  ],
};
