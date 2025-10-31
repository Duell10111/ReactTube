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
