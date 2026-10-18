// Copied into the app target by plugins/ios/withSiri.js. App Intent metadata
// is only extracted from the app target, not from the SiriMedia pod.
//
// Siri never recognized "ReactTube" in SiriKit media requests and only picked
// the app by prediction (see SIRI_SEARCH_AND_PLAY_PLAN.md, phase 1). App
// Shortcut phrases register the app name explicitly.

import AppIntents
internal import Expo
import React
// internal: ExpoModulesProvider imports the module with that access level.
internal import SiriMedia
import UIKit

extension AppDelegate {
  /// Creates the React root view without a window, for Siri requests that
  /// launch the app in the background.
  @MainActor
  func makeHeadlessReactRootView() -> UIView? {
    guard let factory = reactNativeFactory else {
      return nil
    }
    return factory.rootViewFactory.view(
      withModuleName: reactNativeFactoryModuleName,
      initialProperties: nil,
      launchOptions: nil
    )
  }
}

@MainActor
func startReactHeadless() -> UIView? {
  return (UIApplication.shared.delegate as? AppDelegate)?.makeHeadlessReactRootView()
}

/// Spoken when a play intent fails; Siri reads the error description.
enum ReactTubeIntentError: Error, CustomLocalizedStringResourceConvertible {
  case disabled
  case notFound
  case loginRequired
  case failed

  var localizedStringResource: LocalizedStringResource {
    switch self {
    case .disabled:
      return "Siri playback is turned off. You can turn it on in the ReactTube settings."
    case .notFound:
      return "I couldn't find anything matching that in ReactTube."
    case .loginRequired:
      return "Please sign in to ReactTube first."
    case .failed:
      return "ReactTube couldn't start playback."
    }
  }
}

/// Returns the started track, or throws the error Siri should read.
func track(from outcome: SiriMediaAppIntentOutcome) throws -> (title: String?, artist: String?) {
  switch outcome {
  case let .playing(title, artist):
    return (title, artist)
  case .notFound:
    throw ReactTubeIntentError.notFound
  case .loginRequired:
    throw ReactTubeIntentError.loginRequired
  case .disabled:
    throw ReactTubeIntentError.disabled
  case .failed:
    throw ReactTubeIntentError.failed
  }
}

@MainActor
private func play(query: String?) async throws -> (title: String?, artist: String?) {
  return try track(
    from: await SiriMediaAppIntentBridge.play(query: query, startReactHeadless: startReactHeadless)
  )
}

/// What Siri says once playback started.
func playingDialog(title: String?, artist: String?) -> IntentDialog {
  switch (title, artist) {
  case let (title?, artist?):
    return "Playing \(title) by \(artist)."
  case let (title?, nil):
    return "Playing \(title)."
  default:
    return "Playing music."
  }
}

struct SearchMusicIntent: AppIntent {
  static let title: LocalizedStringResource = "Search Music"
  static let description = IntentDescription("Opens the music search in ReactTube.")
  static let openAppWhenRun = true

  @Parameter(title: "Search Term", requestValueDialog: "What do you want to search for?")
  var query: String

  @MainActor
  func perform() async throws -> some IntentResult {
    SiriMediaAppIntentBridge.search(query: query)
    return .result()
  }
}

struct PlayMusicIntent: AppIntent {
  static let title: LocalizedStringResource = "Play Music"
  static let description = IntentDescription("Searches ReactTube and plays the best match.")

  @Parameter(title: "Search Term", requestValueDialog: "What do you want to listen to?")
  var query: String

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let track = try await play(query: query)
    return .result(dialog: playingDialog(title: track.title, artist: track.artist))
  }
}

struct ResumeMusicIntent: AppIntent {
  static let title: LocalizedStringResource = "Resume Music"
  static let description = IntentDescription(
    "Resumes playback in ReactTube, or starts music from the home feed."
  )

  @MainActor
  func perform() async throws -> some IntentResult {
    _ = try await play(query: nil)
    return .result()
  }
}

// AudioPlaybackIntent lets the intents start audio while the app stays in the
// background. A conditional conformance instead of iOS 17-only intents, because
// `if #available` in an AppShortcutsBuilder needs iOS 17.4.
@available(iOS 17.0, *)
extension PlayMusicIntent: AudioPlaybackIntent {}

@available(iOS 17.0, *)
extension ResumeMusicIntent: AudioPlaybackIntent {}

/// Phrases must contain the app name; translations live in AppShortcuts.xcstrings.
struct ReactTubeShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: SearchMusicIntent(),
      phrases: [
        "Search in \(.applicationName)",
        "Search music in \(.applicationName)",
        "Search \(.applicationName)",
      ],
      shortTitle: "Search Music",
      systemImageName: "magnifyingglass"
    )
    AppShortcut(
      intent: PlayMusicIntent(),
      phrases: [
        "Play music in \(.applicationName)",
        "Play a song in \(.applicationName)",
        "Play something in \(.applicationName)",
      ],
      shortTitle: "Play Music",
      systemImageName: "play.circle"
    )
    AppShortcut(
      intent: ResumeMusicIntent(),
      phrases: [
        "Resume \(.applicationName)",
        "Continue \(.applicationName)",
        "Resume music in \(.applicationName)",
      ],
      shortTitle: "Resume Music",
      systemImageName: "playpause"
    )
  }
}
