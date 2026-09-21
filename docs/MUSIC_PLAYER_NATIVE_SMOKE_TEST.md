# Native music-player smoke test

Run this checklist on one physical iOS device and one physical Android device.
Use a development build first, then repeat the happy path with a release build.
TV is explicitly out of scope.

## Preparation

1. Install the native dependencies and build the app:
   - Use JDK 21 for Android; JDK 25 is not compatible with the current native
     Gradle/CMake plugins.
   - iOS development: `npm run ios -- --device`
   - Android development: `npm run android -- --device`
   - iOS release: choose the `Release` configuration in Xcode and run on the device.
   - Android release: `cd android && ./gradlew assembleRelease`
2. Sign in once, then repeat the online test while signed out. Playback must work
   in both states because `/player` resolution is anonymous.
3. Download one title in the app. Keep one online title longer than 15 minutes
   available for the range/network tests.
4. For the one-shot 403 case, configure Charles, Proxyman, or an equivalent
   debugging proxy to return HTTP 403 for the first matching `googlevideo.com`
   media request only. Let subsequent requests pass through.

## Playback and UI

- [ ] Start the long online title. Audio starts and the full player plus bottom
      bar show the same cover, title, artist, play state, position, and duration.
- [ ] Pause and resume from both app surfaces.
- [ ] Seek forward and backward. Position continues from the selected time.
- [ ] Use Next and Previous. Exactly one title transition occurs per action.
- [ ] Enable shuffle. Played/current entries stay in place and only Up-next is
      rearranged.
- [ ] Verify Repeat one restarts the same title at 0 and Repeat all wraps from
      the last playlist entry to the first.
- [ ] Enable Automix and reach the end of the regular queue. The first Automix
      entry starts once.
- [ ] Play the downloaded title with airplane mode enabled. Seek and pause/resume
      still work.

## System controls and lifecycle

- [ ] Lock the screen. Audio continues; lock-screen metadata and Play/Pause/Seek
      operate the active title.
- [ ] Put the app in the background and switch to another app for two minutes.
      Audio and progress continue.
- [ ] Use Bluetooth/headset Play/Pause, then disconnect the device. Playback
      pauses and does not resume unexpectedly.
- [ ] Trigger another app's audio or a phone/audio-focus interruption. ReactTube
      follows platform focus rules and can resume afterward.
- [ ] Return to ReactTube. Full player and bottom bar reflect all background
      actions without a jump or stale metadata.

## Recovery and long playback

- [ ] During the long title, switch Wi-Fi off and mobile data on (and back).
      Buffering is visible, playback recovers, and the title does not advance
      twice.
- [ ] With the one-shot proxy rule active, trigger the first media request. A
      warning is shown, the source is resolved exactly once, position is restored,
      and playback resumes. A persistent failure ends with a readable error.
- [ ] Let an online source remain selected until its URL refresh window (one
      minute before `expires`). Playback continues at the same position and keeps
      its prior Play/Pause state.
- [ ] Let the long title play well beyond the former truncated byte-range point
      and through its natural end. It completes and advances exactly once.

Record device/OS, build configuration, title IDs, date, and failed checkbox logs
with every run. A release is accepted only after all checkboxes pass on both
platforms.
