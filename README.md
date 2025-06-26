# ReactTube

An ad free Youtube alternative developed in React-Native mainly for Apply TV, but should also work on other Android and iOS Platforms.

Main goals:

- Youtube-experience without **ADs**
- General Youtube client features

**Currently, still in development**, contributions welcome!

This project uses the [Youtube.js](https://github.com/LuanRT/YouTube.js) library to access the Youtube API.

## Features

| Feature                                         | Available                                                      |
|-------------------------------------------------|----------------------------------------------------------------|
| Basic UI (including Channel and Playlist Views) | ✅                                                              |
| Video Playback up until 720p                    | ✅                                                              |
| 1080p playback up to 4K                         | ✅ (using HLS toggle)                                           |
| Youtube Login via QR Code                       | ⚠️ (Working again for non YT music features)                   |
| History Page                                    | ✅                                                              |
| Subscription Page                               | ✅                                                              |
| Social Interactions (Like, Subscribe etc.)      | ⏳ (Partial support)                                            |
| Chapter-Information                             | ✅ (works with non VLC Player)                                  |
| Youtube Music Support                           | ✅                                                              |
| Basic Mobile Support                            | ✅                                                              |
| Apple Watch Variant (Alpha)                     | ✅                                                              |
| Local Database Storage without login            | ✅                                                              |
| Download videos for offline usage               | ⏳ (Music variant can be downloaded on phone and watch variant) |
| Android TV Support                              | ❌ (UI mostly broken)                                           |

### Building

The app can be build like any other react-native app.

You maybe have to create a **free Apple account** for building on real iOS/tvOS Devices.

**Hint:** I am currently experiencing issues after using yarn as package manager, therefore you should use npm instead.
As react native tvOS causes some peer dependency issues, you should trigger the install command with the legacy-peer-deps:
`npm i --legacy-peer-deps`

For more information look into:

- [Running on device - Expo](https://docs.expo.dev/build/internal-distribution/)

- [Running on TV - Expo](https://docs.expo.dev/guides/building-for-tv/#build-for-apple-tv)

- [GitHub - react-native-tvos/react-native-tvos: React Native repo with additions for Apple TV and Android TV support.](https://github.com/react-native-tvos/react-native-tvos)

- [Local build README](LOCALBUILD.md)

## Troubleshooting

- #### App stuck in splash screen (Logo screen).

  Yarn v1 can cause issues with the node dependencies causing the app to never start, using npm instead can solve this issue.
  If you previously used yarn v1 you should delete the _node_modules_ and trigger a fresh npm installation.
  
  Related issue: https://github.com/Duell10111/ReactTube/issues/49


## ⚠️ Disclaimer

The ReactTube project and its contents are not affiliated with, funded, authorized, endorsed by, or in any way associated with YouTube, Google LLC or any of its affiliates and subsidiaries. The official YouTube website can be found at [www.youtube.com](https://www.youtube.com/).

Any trademark, service mark, trade name, or other intellectual property rights used in the ReactTube project are owned by the respective owners.
