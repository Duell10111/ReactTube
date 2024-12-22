# ReactTube

An ad free Youtube alternative developed in React-Native mainly for Apply TV, but should also work on other Android and iOS Platforms.

Main goals:

- Youtube-experience without **ADs**
- General Youtube client features

**Currently, still in development**, contributions welcome!

This project uses the [Youtube.js](https://github.com/LuanRT/YouTube.js) library to access the Youtube API.

## Features

| Feature                                         | Available                                                |
|-------------------------------------------------|----------------------------------------------------------|
| Basic UI (including Channel and Playlist Views) | ✅                                                        |
| Video Playback up until 720p                    | ✅                                                        |
| 1080p playback up to 4K                         | ✅ (using HLS toggle)                                     |
| Youtube Login via QR Code                       | ❌ (Login broken because of backend changed from Youtube) |
| History Page                                    | ✅                                                        |
| Subscription Page                               | ✅                                                        |
| Social Interactions (Like, Subscribe etc.)      | ⏳(Partial support)                                       |
| Chapter-Information                             | ✅ (works with non VLC Player)                            |
| Youtube Music Support                           | ✅                                                        |
| Basic Mobile Support                            | ✅                                                        |
| Apple Watch Variant (Alpha)                     | ⏳(Working on it)                                         |
| Local Database Storage without login            | ✅                                                        |
| Download videos for offline usage               | ⏳(Working on it)                                         |
| Android TV Support                              | ❌ (UI mostly broken)                                     |

### Building

The app can be build like any other react-native app.

You maybe have to create a **free Apple account** for building on real iOS/tvOS Devices

For more information look into:

- [Running on device - Expo](https://docs.expo.dev/build/internal-distribution/)

- [Running on TV - Expo](https://docs.expo.dev/guides/building-for-tv/#build-for-apple-tv)

- [GitHub - react-native-tvos/react-native-tvos: React Native repo with additions for Apple TV and Android TV support.](https://github.com/react-native-tvos/react-native-tvos)

## ⚠️ Disclaimer

The ReactTube project and its contents are not affiliated with, funded, authorized, endorsed by, or in any way associated with YouTube, Google LLC or any of its affiliates and subsidiaries. The official YouTube website can be found at [www.youtube.com](https://www.youtube.com/).

Any trademark, service mark, trade name, or other intellectual property rights used in the ReactTube project are owned by the respective owners.
