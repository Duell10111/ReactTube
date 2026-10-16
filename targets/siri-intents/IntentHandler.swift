import Intents
import os

private let osLog = Logger(subsystem: "com.duell10111.reacttube.siri", category: "extension")

/// Phase 0 spike diagnostics: appends to a log file in the shared app group,
/// which the app copies into its Documents folder on launch.
private enum ExtensionLog {
  private static let fileURL = FileManager.default
    .containerURL(forSecurityApplicationGroupIdentifier: "group.com.duell10111.reacttube")?
    .appendingPathComponent("siri-extension.log")
  private static let formatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  static func info(_ message: String) {
    osLog.info("\(message, privacy: .public)")
    guard let fileURL else {
      osLog.error("app group container unavailable")
      return
    }
    guard let data = "\(formatter.string(from: Date())) [EXT] \(message)\n".data(using: .utf8) else {
      return
    }
    if let handle = try? FileHandle(forWritingTo: fileURL) {
      handle.seekToEndOfFile()
      handle.write(data)
      try? handle.close()
    } else {
      do {
        try data.write(to: fileURL)
      } catch {
        osLog.error("log write failed: \(error.localizedDescription, privacy: .public)")
      }
    }
  }
}

/// Entry point of the intents extension. It cannot run youtubei.js, so it only
/// accepts the request, serializes it into the media item identifier and hands
/// the actual search and playback over to the app.
class IntentHandler: INExtension {
  override func handler(for intent: INIntent) -> Any {
    ExtensionLog.info("handler(for: \(type(of: intent))) \(intent)")
    switch intent {
    case is INPlayMediaIntent:
      return PlayMediaIntentHandler()
    case is INSearchForMediaIntent:
      return SearchForMediaIntentHandler()
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
    ExtensionLog.info("resolveMediaItems \(describe(search)) donated=\(donated.compactMap(\.identifier))")
    let items = donated.isEmpty ? [mediaItem(for: search)] : donated
    completion(INPlayMediaMediaItemResolutionResult.successes(with: items))
  }

  func handle(
    intent: INPlayMediaIntent,
    completion: @escaping (INPlayMediaIntentResponse) -> Void
  ) {
    // Phase 0 spike switch: a query containing "test" exercises the
    // `.continueInApp` path, everything else the background `.handleInApp` path.
    let name = intent.mediaSearch?.mediaName?.lowercased() ?? ""
    let code: INPlayMediaIntentResponseCode = name.contains("test") ? .continueInApp : .handleInApp
    ExtensionLog.info("handle play intent -> \(code.rawValue) \(describe(intent.mediaSearch))")
    completion(INPlayMediaIntentResponse(code: code, userActivity: nil))
  }
}

final class SearchForMediaIntentHandler: NSObject, INSearchForMediaIntentHandling {
  func resolveMediaItems(
    for intent: INSearchForMediaIntent,
    with completion: @escaping ([INSearchForMediaMediaItemResolutionResult]) -> Void
  ) {
    let search = intent.mediaSearch
    ExtensionLog.info("resolveMediaItems (search) \(describe(search))")
    completion(INSearchForMediaMediaItemResolutionResult.successes(with: [mediaItem(for: search)]))
  }

  func handle(
    intent: INSearchForMediaIntent,
    completion: @escaping (INSearchForMediaIntentResponse) -> Void
  ) {
    ExtensionLog.info("handle search intent -> continueInApp \(describe(intent.mediaSearch))")
    completion(INSearchForMediaIntentResponse(code: .continueInApp, userActivity: nil))
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
