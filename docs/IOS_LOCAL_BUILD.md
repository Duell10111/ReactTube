# Local iPhone and iPad builds

ReactTube has two iOS build variants. The `enabled` option of
`./plugins/ios/withSiri.js` in `app.json` selects the variant before Expo generates
the native project. This is independent of the Siri switches inside the app.

| Variant      | Siri option      | Signing account                                 | Siri settings and extension |
| ------------ | ---------------- | ----------------------------------------------- | --------------------------- |
| Without Siri | `enabled: false` | Personal Team or paid developer team            | Omitted                     |
| With Siri    | `enabled: true`  | Paid team with Siri and App Groups provisioning | Included                    |

Omitting `enabled` preserves the existing behavior: Siri is enabled on iPhone and
iPad. The repository currently sets it explicitly to `true`. TV builds always
exclude Siri and the Watch target. See [LOCALBUILD.md](../LOCALBUILD.md) for Apple TV.

## Prerequisites

- macOS, Xcode and the iOS platform tools; the Siri sources currently require
  Xcode 27 or later with the iOS 27 SDK. Their availability annotations still allow
  older deployment targets.
- The Node.js version in `.nvmrc`, npm and CocoaPods available to Expo prebuild.
- An Apple Account signed into Xcode for installation on a physical device.
- A connected iPhone or iPad selected as the run destination in Xcode.

Install the project dependencies:

```sh
git clone https://github.com/Duell10111/ReactTube.git
cd ReactTube
npm install --legacy-peer-deps
```

Keep the published `youtubei.js` dependency. Generated `ios/` files, downloaded
profiles, certificates and personal signing configuration must not be committed.

## Build without Siri using a free Personal Team

1. Edit `app.json`. Set `isTV: false` for both
   `@react-native-tvos/config-tv` and `./plugins/ios/withAppleTargets.js`. Set:

   ```json
   ["./plugins/ios/withSiri.js", {"enabled": false}]
   ```

2. Choose an available `expo.ios.bundleIdentifier` for your own build, for example
   `com.yourname.reacttube`. The Apple Targets wrapper derives embedded target
   bundle IDs from this value: `<app ID>.watch` for Watch and, when enabled,
   `<app ID>.siriIntents` for Siri. Its current version does not use a target's
   `bundleId` field as an override. If Xcode reports an unavailable identifier,
   change the base app ID and generate again, or adjust the relevant generated
   targets locally in Xcode while keeping their parent identifiers consistent.

3. Run a clean prebuild, which also installs the iOS pods:

   ```sh
   npx expo prebuild --clean --platform ios
   node scripts/verify-apple-build.js --project . --siri false --tv false
   open ios/reacttube.xcworkspace
   ```

   **A clean prebuild replaces the generated iOS project.** Save any local signing
   choices you need to reapply. Native source changes belong in plugins, modules
   or `targets/`. Always use `--clean` after switching Siri, TV mode, bundle ID or
   App Group; an incremental prebuild does not remove an old Siri target.

4. In Xcode, choose the `reacttube` scheme. Under **Signing & Capabilities**,
   enable automatic signing and choose your **Personal Team** for `reacttube`
   and the embedded `RT-Watch` target. Override the generated `XXXXXXXXXX` team
   placeholder for every target being built. The Watch target remains part of
   phone builds, so its signing and available App ID also need to be configured.
   For a reproducible local prebuild you can set `appleTeamId` in the wrapper's
   options in your local `app.json`; keep that account-specific change local.

5. Verify that the generated app has no Siri capability, no Siri App Group and no
   `SiriIntents` target. Select your connected device, then **Product > Run**.
   Complete any trust or Developer Mode prompts shown by Xcode or the device.
   Siri settings should not appear in ReactTube, even if an older installation
   had Siri playback or donations enabled.

A Personal Team is for local device testing. Apple currently documents up to
10 App IDs, 3 registered devices and 3 installed apps per device; provisioning
profiles expire after 7 days. Rebuild and reinstall through Xcode after expiration.
Embedded targets require their own identifiers, so account limits can also affect
this build. See Apple's [developer account overview](https://developer.apple.com/help/account/basics/about-your-developer-account).

Disabling Siri removes this feature's restricted capabilities. Other native
compile failures, unavailable identifiers and signing requirements still have to
be resolved. A Personal-Team device build has not yet been verified for this
change.

## Build with Siri using a paid team

1. Use the same phone configuration and choose your own base bundle identifier.
   Set `enabled: true` in `app.json`. The App Group defaults to
   `group.<expo.ios.bundleIdentifier>`. To use a group already registered to your
   team, add `appGroup` to the same plugin options:

   ```json
   [
     "./plugins/ios/withSiri.js",
     {"enabled": true, "appGroup": "group.com.yourname.reacttube"}
   ]
   ```

   The app's entitlements and Info.plist, the extension's entitlements and its
   inherited `REACTTUBE_SIRI_APP_GROUP` build setting use this single value. Both
   native processes read it from their built Info.plist. No Swift literal needs
   editing. Target configuration intentionally reads the same static `app.json`.

2. Register the app and extension identifiers with your paid developer team.
   Enable Siri for the main app and assign the same registered App Group to the
   main app and `SiriIntents`. The extension needs the shared group; its current
   implementation does not request a separate Siri entitlement. Configure the
   Watch target's ID and signing too. Follow Apple's instructions for
   [registering an App Group](https://developer.apple.com/help/account/identifiers/register-an-app-group)
   and [enabling app capabilities](https://developer.apple.com/help/account/identifiers/enable-app-capabilities).
   Regenerate affected provisioning profiles after changing capabilities.

3. Generate and verify the native project:

   ```sh
   npx expo prebuild --clean --platform ios
   node scripts/verify-apple-build.js --project . --siri true --tv false
   open ios/reacttube.xcworkspace
   ```

4. Choose your paid team for `reacttube`, `SiriIntents` and `RT-Watch`, and enable
   automatic signing or select matching profiles manually. Check that App Groups
   agrees between the app and extension. Build and run the `reacttube` scheme.
   Enable Siri playback inside ReactTube and test a request on the device.

For an exported, signed development/ad-hoc IPA, the verifier can additionally
check each bundle's signature, profile expiration, team, application identifier
and required Siri/App Group entitlements:

```sh
node scripts/verify-apple-build.js --ipa /path/to/reacttube-ios-siri.ipa --siri true --signed
```

If you configured a non-default App Group, append
`--app-group group.com.yourname.reacttube`, or use `--config app.json` to check
both the expected bundle ID and App Group from your build configuration. CI uses
`--config app.json` automatically. This check requires macOS `codesign`
and `security`, plus embedded provisioning profiles. Installation still requires
a distribution method and profile appropriate for the destination device.

## GitHub Actions artifacts

The [Build workflow](../.github/workflows/build.yml) archives Apple apps **without
signing**. No signing certificates, provisioning profiles or paid account secrets
are configured by this change. The prebuild action sets options by plugin name,
so CI always overrides the checked-in Siri flag for each Apple job. Each job has
its own checkout and runs a clean prebuild.

| Artifact / IPA filename      | How it is built                      | Siri | Signing before installation                                                 |
| ---------------------------- | ------------------------------------ | ---- | --------------------------------------------------------------------------- |
| `reacttube-tvos-no-siri.ipa` | Default manual/release Apple job     | No   | Required                                                                    |
| `reacttube-ios-no-siri.ipa`  | Manual input `build-ios-phone: true` | No   | Required; free-account route currently supported through local Xcode builds |
| `reacttube-ios-siri.ipa`     | Manual input `build-ios-siri: true`  | Yes  | Paid team with matching app/extension profiles required                     |

The two iOS inputs default to `false`. The phone job was previously commented out
because of native compilation failures. It is now available as an explicitly
experimental opt-in; a Siri flag alone does not resolve the old build failures.
Select both inputs if you want both phone variants. Enabling Siri does not replace
the standard TV or Android jobs. Release events and default manual runs build
only the existing tvOS and Android variants, without Siri.

Artifacts use distinct names, and release uploads use the same distinct IPA
filenames. The optional phone jobs run only on manual dispatch and therefore do
not currently attach phone IPAs to releases. Archive failures upload diagnostic
logs/results when available.

Each Apple job checks the generated targets, entitlements and Siri source files
before archiving. It then unpacks its finished IPA and checks the native build
marker, Siri extension, matching App Group values and Watch payload. **Unsigned
IPAs have no usable signed entitlement/profile guarantee:** these checks cannot
replace verification after signing. Run the verifier again with `--signed` on a
signed development/ad-hoc export.

An unsigned IPA cannot be installed on an iPhone or iPad by itself. The Siri IPA
must be signed by a paid team, including its extension and embedded Watch app.
If an IPA contains identifiers belonging to another team, signing it for your
team also requires consistent app/extension/Watch identifiers, the Watch
companion identifier, entitlements and both built App Group values. That rewrite
is not automated or verified here; building from source with your own
`app.json` is the supported way to choose those values.

Installation of a re-signed CI IPA with a free account has not been verified;
use the local Xcode route above. The additional artifact does not grant Siri
capabilities to a Personal Team. Apple's [capability overview](https://developer.apple.com/help/account/capabilities/capabilities-overview)
explains how capabilities, targets and provisioning relate.

## Native build validation status

Both unsigned iOS variants have been archived locally with Xcode 27.1 and their
finished IPAs verified, including Watch payloads and companion identifiers. The
Siri variant was built with a custom base bundle ID and App Group, and the
extension's built group matched the app's. The previous phone compiler errors
were not reproduced in that environment. Configuration/artifact regression
tests, isolated prebuilds and workflow linting also pass.

Successful hosted phone archives, real signed IPA validation and Personal-Team
installation must still be checked on their actual runners/devices. If prebuild
or archive fails, inspect the failing native command and its logs; an unsigned
file alone does not prove that it can be provisioned or installed.
