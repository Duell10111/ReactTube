
# ReactTube - Local Build

This guide explains how to build "ReactTube" for your Apple TV.

## Prerequisites

- Node.js (Recommended Version: LTS)
- ~~Yarn or~~ npm
- Expo CLI
- Xcode (for tvOS simulation and building on a real device)
- An Apple Developer Account

## Steps to Build the ReactTube tvOS App

### 1. Install Dependencies

Ensure you have Node.js ~~and Yarn installed~~.

#### Node.js
Download and install the latest LTS version of [Node.js](https://nodejs.org/).

⚠️ Yarn v1 causes issues therefore I would recommend using npm instead.

Use npm:
```bash
npm install -g npm
```

### 2. Clone the ReactTube Repository

Clone the existing ReactTube project from your version control system:
```bash
git clone https://github.com/Duell10111/ReactTube.git
cd ReactTube
```

### 3. Install Project Dependencies

Navigate to the project directory and install dependencies:
```bash
npm install --legacy-peer-deps
```

### 4. Adjust `app.json` for tvOS

Open the `app.json` file in your project and set the isTV settings for tvOS deployment. Here is an example:
```json
{
  "expo": {
    "name": "ReactTube",
    "slug": "reacttube",
    "plugins": [
      [
        "@react-native-tvos/config-tv",
        {
          "isTV": true, // <- change this to true to build for TV
          "showVerboseWarnings": false,
          "tvosDeploymentTarget": "13.4",
          "removeFlipperOnAndroid": true,
          "androidTVBanner": "./assets/images/tv/tv_banner.png",
          "appleTVImages": {
            "icon": "./assets/images/tv/app_store_icon.png",
            "iconSmall": "./assets/images/tv/app_store_icon_400.png",
            "topShelf": "./assets/images/tv/app_store_icon_topshelf.png",
            "topShelf2x": "./assets/images/tv/app_store_icon_topshelf.png",
            "topShelfWide": "./assets/images/tv/app_store_icon_topshelf.png",
            "topShelfWide2x": "./assets/images/tv/app_store_icon_topshelf.png"
          }
        }
      ],
      ...
      [
        "@duell10111/apple-targets",
        {
          "appleTeamId": "XXXXXXXXXX",
          "isTV": true  // <- change this to true to build for TV
        }
      ],
      ...
    ]
  }
}
```

### 5. Run prebuild

```bash
npx expo prebuild --clean
```

### 6. Build and Run on Apple TV

#### Adjust the Xcode Project for Release Variant of XCode
Open the iOS directory in Xcode:
```bash
open ios/ReactTube.xcworkspace
```
- Go to the project settings and configure your reacttube target.
- Change the build configuration to Release in your schema.

#### Build and Run
- Select your reacttube target in Xcode.
- Connect your Apple TV to the Mac.
- Click on "Run".

## Resources

- [Expo Documentation](https://docs.expo.dev/guides/building-for-tv/#build-for-apple-tv)
- [React Native tvOS](https://github.com/react-native-tvos/react-native-tvos)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)

