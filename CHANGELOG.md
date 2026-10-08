## [0.2.0](https://github.com/Duell10111/ReactTube/compare/v0.1.3...v0.2.0) (2025-05-02)

### :sparkles: Features

* add an option to add a music item as next item ([3c8ebb6](https://github.com/Duell10111/ReactTube/commit/3c8ebb64d98a1f8d3448a0f25893319560e68c07))
* add tv endpoints ytjs to allow oauth2 login again and refactor tv app styling ([#42](https://github.com/Duell10111/ReactTube/issues/42)) ([62b7fc1](https://github.com/Duell10111/ReactTube/commit/62b7fc1198a2f85b6079788514d652ed6f99e5c2))

### :bug: Fixes

* adapt watch player ui and fix issues on watch variant starting downloads ([b6f73ed](https://github.com/Duell10111/ReactTube/commit/b6f73eddbadce8e8b5d91e2c86cf80377b89ba7a))

### Minor changes

* add installed check for watch playdata updates ([6e85f57](https://github.com/Duell10111/ReactTube/commit/6e85f57b77a12850433e35dceececf249516332b))
* add opacity touch style for music player buttons ([07b2ad7](https://github.com/Duell10111/ReactTube/commit/07b2ad79476e156fba63981f1ece8d1b27946f3e))
* add shuffle and repeat mode support for music ([c7eb8d9](https://github.com/Duell10111/ReactTube/commit/c7eb8d99bd698517d7dbbc6d8c2efb2d03009431))
* create LICENSE ([329576f](https://github.com/Duell10111/ReactTube/commit/329576fd7f60aca592a588d4558488bf7fa58f97))
* update release upload step to run on tag refs ([c1be27d](https://github.com/Duell10111/ReactTube/commit/c1be27d6129a51d9e2c5384e3894ba3dba7a65a3))

## [0.5.0](https://github.com/Duell10111/ReactTube/compare/v0.4.1...v0.5.0) (2026-10-08)


### ✨ Features

* add channel selection for signed-in users and support for age-restricted videos ([761bfcc](https://github.com/Duell10111/ReactTube/commit/761bfcce6355543c720ac99d113cf28747286eb8))
* add playback size tracking and resolution formatting for video components ([bafd570](https://github.com/Duell10111/ReactTube/commit/bafd570235df50569eeaa3f7e56027b6977901e9))
* add resolution badges for videos and tiles ([e067671](https://github.com/Duell10111/ReactTube/commit/e067671bf2889de1abc194ca82cc7534006901f9))
* add shorts preloading for TV shorts player ([af23f51](https://github.com/Duell10111/ReactTube/commit/af23f51a8d4e8f3b026573491a46822a8a1053a2))
* add subtitle support with selection and overlay for video player ([95e6789](https://github.com/Duell10111/ReactTube/commit/95e6789b4ba48152f11753e8f13f4f8a2409b4c0))
* implement BotGuard runtime for tvOS with headless WKWebView support ([42bc6b1](https://github.com/Duell10111/ReactTube/commit/42bc6b1b4ae1b9047a2af2e3b53436bc2438d13f))
* implement playback support for signed-in users' private videos via TV_DOWNGRADED client ([3e0170d](https://github.com/Duell10111/ReactTube/commit/3e0170dd41f0d4cd40b569f7aa1fff219dc6317f))
* implement PoToken minting with BotGuard integration for streaming clients ([6d40717](https://github.com/Duell10111/ReactTube/commit/6d40717954a419ec22dadf1075fad92904edcd04))
* implement rating override functionality for video interactions on error cases ([e615bdb](https://github.com/Duell10111/ReactTube/commit/e615bdb7cbae9e121e18946867e8db1eb8b23303))
* implement TV shorts player with navigation and subscription features ([e8ef4e6](https://github.com/Duell10111/ReactTube/commit/e8ef4e6a575e32fa319ae54e6e72a2b6086c74b6))


### 🐛 Bugfixes

* enhance chapter navigation with asynchronous artwork loading for tvOS ([6dfc9be](https://github.com/Duell10111/ReactTube/commit/6dfc9be5f9a242310d853c499d3c2910d2e3cbba))
* fix playlist management with unique handling and membership checks ([2b43f8f](https://github.com/Duell10111/ReactTube/commit/2b43f8fc510ecf2240cc660d5a065a97c7bf8d56))


### 🔧 Chore

* enhance video current playlist component with current index tracking and localization support ([1fc0bce](https://github.com/Duell10111/ReactTube/commit/1fc0bce728afbd108cef421a7961643e2967427d))
* implement video chapter navigation with progress tracking and accessibility support ([668625e](https://github.com/Duell10111/ReactTube/commit/668625ef0bf977f28f4f77148c18d8b70e125da6))

## [0.4.1](https://github.com/Duell10111/ReactTube/compare/v0.4.0...v0.4.1) (2026-10-04)


### 🐛 Bugfixes

* blur search bar after submission to improve suggestion handling ([254f280](https://github.com/Duell10111/ReactTube/commit/254f280923dc6c8d9d9884e01c01cb4f294c1c61))
* refactor navigation structure to ensure proper context handling and safe area integration ([859a31a](https://github.com/Duell10111/ReactTube/commit/859a31a067bb25c8ac9c81c947f54fc326e5adb2))
* repair video and optimize for android tv ([cdeb70b](https://github.com/Duell10111/ReactTube/commit/cdeb70bdae0ce23945a999e7a613d827384e248b))


### 🔧 Chore

* add experimental sabr player resultion support ([#84](https://github.com/Duell10111/ReactTube/issues/84)) ([0f16a60](https://github.com/Duell10111/ReactTube/commit/0f16a60e5f682009064ed487a43bb1e704ef87aa))


### 🚀 Continuous Integration

* add test execution step in CI configuration ([1bb3960](https://github.com/Duell10111/ReactTube/commit/1bb39604ce80862831ba151d2a65da58bcd6a0c3))

## [0.4.0](https://github.com/Duell10111/ReactTube/compare/v0.3.2...v0.4.0) (2026-10-02)


### ✨ Features

* add leading action to AppHeader for quick access to music library ([0e509ea](https://github.com/Duell10111/ReactTube/commit/0e509ea44e2b37465efae415d8577fbcfe11454b))
* add search route support in navigation for music and other destinations ([771de30](https://github.com/Duell10111/ReactTube/commit/771de30650b52bf26cd71f86726e0dc3da3bb7ba))
* enable remote control for next/previous track in MusicPlayerContext ([3c3de9b](https://github.com/Duell10111/ReactTube/commit/3c3de9ba8e9c4e37b165a023625994875be9bc85))
* redesign UI to be more user friendly and more beautiful ([#80](https://github.com/Duell10111/ReactTube/issues/80)) ([56df121](https://github.com/Duell10111/ReactTube/commit/56df12186148da21c49d2410666fe591e31f4378))
* reimplement end screen functionality with creator recommendations and autoplay countdown ([561e52f](https://github.com/Duell10111/ReactTube/commit/561e52fca79e60a0fb4e5d98e8fb6c22cce98567))


### 🐛 Bugfixes

* enhance content ID extraction for LockupView to handle missing IDs ([7462f70](https://github.com/Duell10111/ReactTube/commit/7462f705d654204656491b1201cfea1a7bc441f3))
* enhance music search functionality with top result card and improved layout ([fb261a5](https://github.com/Duell10111/ReactTube/commit/fb261a5a180264f8883b8523b3af2d6896b88a2a))
* ensure unique row keys in feed layout to maintain focus during pagination ([1e89a93](https://github.com/Duell10111/ReactTube/commit/1e89a93a892fac9f83b3f42961f845ca9a97ecc5))
* fix and improve video playback ([cd9db6c](https://github.com/Duell10111/ReactTube/commit/cd9db6ca941969bb7e3d5383225838560cbad106))
* fix possible key prop issue in VideoMenu.tsx ([6b69559](https://github.com/Duell10111/ReactTube/commit/6b6955974e6ef4fb474753ec75b722684eaf42d4))
* improve layout and interaction of music player components with consistent button sizing and scrollable action buttons ([faf565e](https://github.com/Duell10111/ReactTube/commit/faf565e1051af8245d41d857c26cfa16594f0da6))
* improve TV remote seeking and focus handling in native overlay ([5e9f2b8](https://github.com/Duell10111/ReactTube/commit/5e9f2b8330f9ff8987032e18d472fb0b2eed591a))
* refine TV focus handling in BottomControls for improved seek bar interaction ([4a0bcaa](https://github.com/Duell10111/ReactTube/commit/4a0bcaa2992982bd67cc11c8f1c3215d913ce18a))
* update dependencies and fix outdated patch ([dde31bd](https://github.com/Duell10111/ReactTube/commit/dde31bd396402599e154bf925811d526313ee89b))
* update VideoScreen to use styled player root with black background for letterboxing ([650bda2](https://github.com/Duell10111/ReactTube/commit/650bda2a999beae609431896d1b9a4372200b52e))
* update youtubei.js dependency to published version and add local development instructions ([2cbd558](https://github.com/Duell10111/ReactTube/commit/2cbd5582946a72fd4112edf0474ba87151ca9a4f))


### 📄 Documentation

* update local build documentation for Apple TV with streamlined instructions and improved clarity ([63b159d](https://github.com/Duell10111/ReactTube/commit/63b159d3bc886e9f827290d4f35644c887e52ef5))


### ⬆️ Upgrade

* upgrade to expo sdk 54 with old architecture ([#76](https://github.com/Duell10111/ReactTube/issues/76)) ([d75c7be](https://github.com/Duell10111/ReactTube/commit/d75c7be1299d24c75bf21e5403c4f4fe0adb6967))
* upgrade to expo sdk 57 and disable track-player for the moment ([466a756](https://github.com/Duell10111/ReactTube/commit/466a75618d5a7119674dee15d02ddb23e925a620))

## [0.3.2](https://github.com/Duell10111/ReactTube/compare/v0.3.1...v0.3.2) (2025-10-31)


### 🔧 Chore

* small adaptions to watch app ([#71](https://github.com/Duell10111/ReactTube/issues/71)) ([da4a89f](https://github.com/Duell10111/ReactTube/commit/da4a89fcb3ff67b35f543aa5ea1f2f64b999b5a6))
* update release-please-config.json to include upgrade type ([2905cfc](https://github.com/Duell10111/ReactTube/commit/2905cfcb37dda6f31760c2b235e21f63518a59dc))


### ⬆️ Upgrade

* upgrade to expo sdk 53 ([#60](https://github.com/Duell10111/ReactTube/issues/60)) ([3520f70](https://github.com/Duell10111/ReactTube/commit/3520f70153d7a4484c4d00cf9198e14361039a1b))

## [0.3.1](https://github.com/Duell10111/ReactTube/compare/v0.3.0...v0.3.1) (2025-10-25)


### 🐛 Bugfixes

* adapt downloader logic to be less battery intense ([#62](https://github.com/Duell10111/ReactTube/issues/62)) ([d752846](https://github.com/Duell10111/ReactTube/commit/d7528464a7744107a02bb75b98e6f95862dd0126))
* fix issue with subscription page and upgrade yti.js version ([#68](https://github.com/Duell10111/ReactTube/issues/68)) ([81cf8fc](https://github.com/Duell10111/ReactTube/commit/81cf8fcbcf1375c314640fc6106c70dbbd045c3d))


### 🔧 Chore

* add native player history support ([#56](https://github.com/Duell10111/ReactTube/issues/56)) ([33c8884](https://github.com/Duell10111/ReactTube/commit/33c8884689bd4de0a69c13fbfcc9fbf060ab8074))
* add speed and language player settings to overlay player ([#64](https://github.com/Duell10111/ReactTube/issues/64)) ([5d84b6c](https://github.com/Duell10111/ReactTube/commit/5d84b6c34250416e9fbcb932c9889fad2d86e7ae))


### 🚀 Continuous Integration

* add missing github permission to build workflow ([6b8c815](https://github.com/Duell10111/ReactTube/commit/6b8c8150c1c94557e7e6a48751ff988bbec95ac7))


### 📄 Documentation

* update readmes for npm preference over yarn atm ([63f37d8](https://github.com/Duell10111/ReactTube/commit/63f37d8d2570fc1c6b79503d88a2a2d88c7bd6c8))

## [0.3.0](https://github.com/Duell10111/ReactTube/compare/v0.2.0...v0.3.0) (2025-06-25)


### ✨ Features

* add playlist sync functionality and artist metadata support with multiple minor functionality adaptions for apple watch app ([#46](https://github.com/Duell10111/ReactTube/issues/46)) ([3fff181](https://github.com/Duell10111/ReactTube/commit/3fff181081ee43cee72f817258d68546d0dd1f3f))


### 🐛 Bugfixes

* small ui adaptions and bug fixes ([#45](https://github.com/Duell10111/ReactTube/issues/45)) ([333cabf](https://github.com/Duell10111/ReactTube/commit/333cabf8c9a377f8f6be3ab3f0e6806d0d53c5cc))
* upgrade youtubei.js to patched version to fix subscription issue ([#50](https://github.com/Duell10111/ReactTube/issues/50)) ([53ce183](https://github.com/Duell10111/ReactTube/commit/53ce183221b39de088361b17857ee3a33192915c))


### 🔧 Chore

* delete semantic release file ([728f3e6](https://github.com/Duell10111/ReactTube/commit/728f3e60dd63df5d7a18e65e085b60836861cc41))
* migrate to release-please for a better experience ([#54](https://github.com/Duell10111/ReactTube/issues/54)) ([ed249d0](https://github.com/Duell10111/ReactTube/commit/ed249d03bcfda79d2073ec1681c5fa75f800c5eb))

## [0.1.3](https://github.com/Duell10111/ReactTube/compare/v0.1.2...v0.1.3) (2025-01-25)

### :repeat: CI

* do not skip ci on release ([52cbf12](https://github.com/Duell10111/ReactTube/commit/52cbf1262139eb33aa142244e5382c8fa7007714))

### Minor changes

* adapt styles and fix some small issues with small improvements, further update some libraries ([#34](https://github.com/Duell10111/ReactTube/issues/34)) ([2cbf046](https://github.com/Duell10111/ReactTube/commit/2cbf0464f8fc426bbc0687adf50546e127043cac))
* switch to released yti.js v13 version and some minor fixes including new watch playing info for phone plays ([#37](https://github.com/Duell10111/ReactTube/issues/37)) ([25990a3](https://github.com/Duell10111/ReactTube/commit/25990a351244c417f49faa6ff026effc581fca35))

## [0.1.2](https://github.com/Duell10111/ReactTube/compare/v0.1.1...v0.1.2) (2024-10-19)

### Minor changes

* add github build for unsigned ipa (tvOS) and apk phone variant ([#26](https://github.com/Duell10111/ReactTube/issues/26)) ([5798f84](https://github.com/Duell10111/ReactTube/commit/5798f842fdf3be051b5a945d62c8dda2c5f85e09))
* update dependencies, multiple design adaptions for tv and phones, added some minor features like adding playlists to library and new youtube music features ([#33](https://github.com/Duell10111/ReactTube/issues/33)) ([f096a04](https://github.com/Duell10111/ReactTube/commit/f096a0494d10542a04cf60f1e831b5d7906fc074))

## [0.1.1](https://github.com/Duell10111/ReactTube/compare/v0.1.0...v0.1.1) (2024-09-21)

### Minor changes

* migrate to expo dependencies to prepare for new architecture and fix various small issues ([#31](https://github.com/Duell10111/ReactTube/issues/31)) ([94ee573](https://github.com/Duell10111/ReactTube/commit/94ee573283badc1fcc51620d7ecb483c608c0290))

## [0.1.0](https://github.com/Duell10111/ReactTube/compare/v0.0.1...v0.1.0) (2024-08-30)

### :sparkles: Features

* add alpha version of watchos variant of ReactTube and add YT Music sections to phone variant(alpha) ([#29](https://github.com/Duell10111/ReactTube/issues/29)) ([cff8418](https://github.com/Duell10111/ReactTube/commit/cff8418dae517b0d9169a5b1b3813a0d4dfabf92))

### :bug: Fixes

* fix endcard clicks and add progress ui ([e9007c0](https://github.com/Duell10111/ReactTube/commit/e9007c08eaae9ee5e31cf8a9a069c9f66dc2f6ba))
* fix release CI issue ([#18](https://github.com/Duell10111/ReactTube/issues/18)) ([1e86988](https://github.com/Duell10111/ReactTube/commit/1e86988ef33a9a2909346aa97b736380fc6ca264))
* fix various bugs from the latest commits including login bugs ([#30](https://github.com/Duell10111/ReactTube/issues/30)) ([396d5fd](https://github.com/Duell10111/ReactTube/commit/396d5fdb0439f78e2635f60c07c603f971ce5d94))

### :memo: Documentation

* add LOCALBUILD.md readme ([#24](https://github.com/Duell10111/ReactTube/issues/24)) ([4c79d56](https://github.com/Duell10111/ReactTube/commit/4c79d5693f1dcb70d19b2d75ef3de22de318ad1e))

### :repeat: CI

* add semantic release ([#17](https://github.com/Duell10111/ReactTube/issues/17)) ([ba0fea3](https://github.com/Duell10111/ReactTube/commit/ba0fea390c844952782d2ddea62a509a42f94446))

### Minor changes

* add new alpha video player overlay and some minor fixes ([#20](https://github.com/Duell10111/ReactTube/issues/20)) ([e685953](https://github.com/Duell10111/ReactTube/commit/e6859530fee95052248f6b4fe4b05c189f65c7fd))
* fix lint and tv remote issues and add a white selection border  ([#16](https://github.com/Duell10111/ReactTube/issues/16)) ([afc319e](https://github.com/Duell10111/ReactTube/commit/afc319e9351fe0f35ed2e0113aebd8043e28e7b6))
* migrate settings to new style and add language selection for youtube ([#19](https://github.com/Duell10111/ReactTube/issues/19)) ([9ef3ff6](https://github.com/Duell10111/ReactTube/commit/9ef3ff6e2890d540400b92b3e73d10cbf86dd895))
* upgrade and migrate to RN 0.73 with expo native tvos searchbar and small improvements ([#14](https://github.com/Duell10111/ReactTube/issues/14)) ([b8b3ffc](https://github.com/Duell10111/ReactTube/commit/b8b3ffc05302e0a74d5f6848231bc320c695ecb8))
* upgrade react-native-video and react native minor update ([#21](https://github.com/Duell10111/ReactTube/issues/21)) ([26062c8](https://github.com/Duell10111/ReactTube/commit/26062c8fd9bd7447d30f372b60c10479e53336a1))
