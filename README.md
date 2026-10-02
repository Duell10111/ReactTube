# ReactTube

An ad-free YouTube client built with Expo and React Native for Apple TV, Android TV, phones, and tablets. An experimental native Apple Watch companion is also included.

Main goals:

- A YouTube experience without ads
- General YouTube client features

**Still in development; contributions are welcome!**

This project uses the [Youtube.js](https://github.com/LuanRT/YouTube.js) library to access the Youtube API.

## Features

| Feature                                          | Status                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Basic UI (including channel and playlist views)  | ✅                                                                                                               |
| Video playback                                   | ✅ Progressive, YouTube HLS, and generated HLS modes are available                                               |
| High-resolution playback                         | ⚠️ Generated HLS can offer up to 4K with AV1 enabled, depending on source and hardware                           |
| YouTube login via QR code                        | ⚠️ Available; account features require a successful sign-in                                                      |
| History and subscriptions                        | ✅                                                                                                               |
| Social interactions (likes, subscriptions, etc.) | ⏳ Partial support                                                                                               |
| Chapter information                              | ✅ When chapters are provided for a video                                                                        |
| YouTube Music support                            | ✅                                                                                                               |
| Phone and tablet support                         | ✅                                                                                                               |
| Apple Watch companion (alpha)                    | ⚠️ Native watch app with music playback and downloads                                                            |
| Local database storage without login             | ✅                                                                                                               |
| Offline downloads                                | ⚠️ Audio downloads on phones; iPhone can transfer them to Apple Watch. Offline video files are not yet supported |
| Android TV support                               | ⚠️ Experimental; device testing is still needed                                                                  |

The app UI can be switched between English and German in Settings. This is separate from the YouTube content language setting.

### Building

Install dependencies with npm and `npm install --legacy-peer-deps` before running Expo.

For physical iOS or Apple TV devices, configure Apple development signing in Xcode.

For a local Apple TV build, see the [tvOS build guide](LOCALBUILD.md). It covers the TV-specific `app.json` settings and iOS prebuild step.

For more information look into:

- [Running on device - Expo](https://docs.expo.dev/build/internal-distribution/)

- [Running on TV - Expo](https://docs.expo.dev/guides/building-for-tv/#build-for-apple-tv)

- [GitHub - react-native-tvos/react-native-tvos: React Native repo with additions for Apple TV and Android TV support.](https://github.com/react-native-tvos/react-native-tvos)

## Troubleshooting

- #### App stuck in splash screen (Logo screen).

  Yarn v1 can cause issues with the node dependencies causing the app to never start, using npm instead can solve this issue.
  If you previously used yarn v1 you should delete the _node_modules_ and trigger a fresh npm installation.

  Related issue: https://github.com/Duell10111/ReactTube/issues/49

## ⚠️ Disclaimer

The ReactTube project and its contents are not affiliated with, funded, authorized, endorsed by, or in any way associated with YouTube, Google LLC or any of its affiliates and subsidiaries. The official YouTube website can be found at [www.youtube.com](https://www.youtube.com/).

Any trademark, service mark, trade name, or other intellectual property rights used in the ReactTube project are owned by the respective owners.
