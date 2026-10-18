import Intents
import os

private let log = Logger(subsystem: "com.duell10111.reacttube.siri", category: "extension")

/// Mirrors `SiriMediaSettings` in modules/siri-media; the app writes the value
/// whenever the opt-in setting changes.
private enum SharedSettings {
  static var appGroup: String? {
    Bundle.main.object(forInfoDictionaryKey: "ReactTubeSiriAppGroup") as? String
  }
  static let playbackEnabledKey = "siriPlaybackEnabled"

  /// Siri playback is opt-in, so a missing value means disabled.
  static var playbackEnabled: Bool {
    guard let appGroup, appGroup.hasPrefix("group.") else { return false }
    return UserDefaults(suiteName: appGroup)?.bool(forKey: playbackEnabledKey) ?? false
  }
}

/// Entry point of the intents extension. It cannot run youtubei.js, so it only
/// accepts the request, serializes it into the media item identifier and hands
/// the actual search and playback over to the app.
class IntentHandler: INExtension {
  override func handler(for intent: INIntent) -> Any {
    switch intent {
    case is INPlayMediaIntent:
      return PlayMediaIntentHandler()
    case is INSearchForMediaIntent:
      return SearchForMediaIntentHandler()
    case is INAddMediaIntent:
      return AddMediaIntentHandler()
    default:
      return self
    }
  }
}

final class PlayMediaIntentHandler: NSObject, INPlayMediaIntentHandling {
  func resolveMediaItems(
    for intent: INPlayMediaIntent,
    with completion: @escaping ([INPlayMediaMediaItemResolutionResult]) -> Void
  ) {
    let search = intent.mediaSearch
    // Siri passes items back that the app donated earlier (suggestions,
    // "play that again"); they already carry an `rt:video:` identifier.
    let donated = (intent.mediaItems ?? []).filter { $0.identifier?.hasPrefix("rt:video:") == true }
    log.notice("resolveMediaItems \(describe(search), privacy: .public) donated=\(donated.count)")
    let items = donated.isEmpty ? [mediaItem(for: search)] : donated
    completion(INPlayMediaMediaItemResolutionResult.successes(with: items))
  }

  func handle(
    intent: INPlayMediaIntent,
    completion: @escaping (INPlayMediaIntentResponse) -> Void
  ) {
    guard SharedSettings.playbackEnabled else {
      // Siri offers to open the app, where Siri playback can be enabled.
      log.notice("play intent while Siri playback is disabled")
      completion(INPlayMediaIntentResponse(code: .failureRequiringAppLaunch, userActivity: nil))
      return
    }
    // The app searches and starts playback in the background, even when Siri
    // has to launch it first (verified in phase 0 on iOS 27).
    completion(INPlayMediaIntentResponse(code: .handleInApp, userActivity: nil))
  }
}

final class SearchForMediaIntentHandler: NSObject, INSearchForMediaIntentHandling {
  func resolveMediaItems(
    for intent: INSearchForMediaIntent,
    with completion: @escaping ([INSearchForMediaMediaItemResolutionResult]) -> Void
  ) {
    let search = intent.mediaSearch
    log.notice("resolveMediaItems (search) \(describe(search), privacy: .public)")
    completion(INSearchForMediaMediaItemResolutionResult.successes(with: [mediaItem(for: search)]))
  }

  func handle(
    intent: INSearchForMediaIntent,
    completion: @escaping (INSearchForMediaIntentResponse) -> Void
  ) {
    let code: INSearchForMediaIntentResponseCode =
      SharedSettings.playbackEnabled ? .continueInApp : .failureRequiringAppLaunch
    completion(INSearchForMediaIntentResponse(code: code, userActivity: nil))
  }
}

/// Siri's media flow only offers apps whose extension declares the intent, so
/// "add this to my playlist X" is declared here and handed to the app, which
/// knows the playlists and talks to YouTube.
final class AddMediaIntentHandler: NSObject, INAddMediaIntentHandling {
  func resolveMediaDestination(
    for intent: INAddMediaIntent,
    with completion: @escaping (INAddMediaMediaDestinationResolutionResult) -> Void
  ) {
    log.notice("resolveMediaDestination \(String(describing: intent.mediaDestination), privacy: .public)")
    guard let destination = intent.mediaDestination else {
      // Without a playlist the song goes to the library ("Liked music").
      completion(INAddMediaMediaDestinationResolutionResult(
        mediaDestinationResolutionResult: .success(with: .library)
      ))
      return
    }
    completion(INAddMediaMediaDestinationResolutionResult(
      mediaDestinationResolutionResult: .success(with: destination)
    ))
  }

  func handle(
    intent: INAddMediaIntent,
    completion: @escaping (INAddMediaIntentResponse) -> Void
  ) {
    guard SharedSettings.playbackEnabled else {
      completion(INAddMediaIntentResponse(code: .failureRequiringAppLaunch, userActivity: nil))
      return
    }
    completion(INAddMediaIntentResponse(code: .handleInApp, userActivity: nil))
  }
}

/// Encodes the spoken request as `rt:search:<type>?q=…&artist=…&album=…` so the
/// app can rebuild it without the extension having to understand YouTube.
private func mediaItem(for search: INMediaSearch?) -> INMediaItem {
  var components = URLComponents()
  components.scheme = "rt"
  components.path = "search:\(search?.mediaType.rawValue ?? INMediaItemType.unknown.rawValue)"
  components.queryItems = [
    URLQueryItem(name: "q", value: search?.mediaName),
    URLQueryItem(name: "artist", value: search?.artistName),
    URLQueryItem(name: "album", value: search?.albumName),
  ].filter { $0.value != nil }

  return INMediaItem(
    identifier: components.string,
    title: search?.mediaName ?? search?.albumName ?? search?.artistName,
    type: search?.mediaType ?? .unknown,
    artwork: nil,
    artist: search?.artistName
  )
}

private func describe(_ search: INMediaSearch?) -> String {
  guard let search else {
    return "<no search>"
  }
  return "type=\(search.mediaType.rawValue) name=\(search.mediaName ?? "-") "
    + "artist=\(search.artistName ?? "-") album=\(search.albumName ?? "-") "
    + "genres=\(search.genreNames ?? []) moods=\(search.moodNames ?? []) "
    + "reference=\(search.reference.rawValue)"
}
