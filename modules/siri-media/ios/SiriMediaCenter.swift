import Foundation
import Intents
import os
import UIKit

/// Outcome JavaScript reports for a request. Mapped onto the SiriKit response codes.
enum SiriMediaResult: String {
  case success
  case notFound
  case loginRequired
  case failure
}

/// Holds Siri requests until JavaScript has picked them up and answered them.
///
/// Requests arrive in two ways:
///  - `.handleInApp`: through `application(_:handlerFor:)`. Siri waits for the
///    completion, so it is kept here until JavaScript answers or the timeout fires.
///  - `.continueInApp`: as an `NSUserActivity` carrying the interaction. Siri has
///    already finished; there is no completion to call.
final class SiriMediaCenter {
  static let shared = SiriMediaCenter()

  /// Siri gives up after roughly ten seconds; answer before that so it can say
  /// something meaningful instead of a generic error.
  static let completionTimeout: TimeInterval = 8

  private struct PendingRequest {
    let payload: [String: Any]
    let completion: ((INPlayMediaIntentResponse) -> Void)?
    var delivered: Bool
  }

  private let lock = NSLock()
  private var pending: [String: PendingRequest] = [:]
  private var order: [String] = []
  private weak var module: SiriMediaModule?
  private var listenerReady = false

  /// Set once the module was created, i.e. a JavaScript runtime exists.
  private(set) var jsRuntimeCreated = false

  // MARK: - Module lifecycle

  func attach(module: SiriMediaModule) {
    lock.lock()
    self.module = module
    jsRuntimeCreated = true
    lock.unlock()
    SiriMediaLog.write("module attached (JS runtime created)")
  }

  func detach(module: SiriMediaModule) {
    lock.lock()
    if self.module === module {
      self.module = nil
      listenerReady = false
    }
    lock.unlock()
  }

  func setListenerReady(_ ready: Bool) {
    lock.lock()
    listenerReady = ready
    lock.unlock()
    SiriMediaLog.write("JS listener ready=\(ready)")
    if ready {
      flush()
    }
  }

  // MARK: - Requests

  func enqueue(
    _ payload: [String: Any],
    completion: ((INPlayMediaIntentResponse) -> Void)?
  ) {
    guard let requestId = payload["requestId"] as? String else {
      return
    }
    lock.lock()
    pending[requestId] = PendingRequest(payload: payload, completion: completion, delivered: false)
    order.append(requestId)
    lock.unlock()
    SiriMediaLog.write("enqueued \(requestId) \(payload["intent"] ?? "?") via \(payload["delivery"] ?? "?")")

    if completion != nil {
      DispatchQueue.main.asyncAfter(deadline: .now() + Self.completionTimeout) { [weak self] in
        self?.expire(requestId)
      }
    }
    flush()
  }

  /// Returns requests JavaScript has not seen yet and marks them as delivered.
  func takeUndelivered() -> [[String: Any]] {
    lock.lock()
    defer { lock.unlock() }
    var result: [[String: Any]] = []
    for id in order {
      guard var request = pending[id], !request.delivered else {
        continue
      }
      request.delivered = true
      pending[id] = request
      result.append(request.payload)
    }
    return result
  }

  /// - Parameter nowPlayingInfo: lets Siri announce what is playing.
  func complete(_ requestId: String, result: SiriMediaResult, nowPlayingInfo: [String: Any]? = nil) {
    lock.lock()
    let request = pending.removeValue(forKey: requestId)
    order.removeAll { $0 == requestId }
    lock.unlock()

    guard let request else {
      SiriMediaLog.write("complete \(requestId) ignored (unknown or expired)")
      return
    }
    SiriMediaLog.write("complete \(requestId) -> \(result.rawValue) \(nowPlayingInfo ?? [:])")
    let response = INPlayMediaIntentResponse(code: Self.responseCode(for: result), userActivity: nil)
    if result == .success {
      response.nowPlayingInfo = nowPlayingInfo
    }
    request.completion?(response)
  }

  private func expire(_ requestId: String) {
    lock.lock()
    let request = pending.removeValue(forKey: requestId)
    order.removeAll { $0 == requestId }
    lock.unlock()

    guard let request else {
      return
    }
    // Drop the request entirely so it cannot start playing minutes later.
    SiriMediaLog.write("timeout \(requestId) (delivered=\(request.delivered))")
    request.completion?(INPlayMediaIntentResponse(code: .failure, userActivity: nil))
  }

  private func flush() {
    lock.lock()
    let module = listenerReady ? self.module : nil
    lock.unlock()
    guard let module else {
      return
    }
    for payload in takeUndelivered() {
      SiriMediaLog.write("emit \(payload["requestId"] ?? "?")")
      module.emitRequest(payload)
    }
  }

  private static func responseCode(for result: SiriMediaResult) -> INPlayMediaIntentResponseCode {
    switch result {
    case .success:
      return .success
    case .notFound:
      return .failureNoUnplayedContent
    case .loginRequired:
      return .failureRequiringAppLaunch
    case .failure:
      return .failure
    }
  }
}

// MARK: - Payload

enum SiriMediaPayload {
  static func make(
    intent: INIntent,
    delivery: String,
    headlessStart: Bool = false
  ) -> [String: Any]? {
    var payload: [String: Any] = [
      "requestId": UUID().uuidString,
      "delivery": delivery,
      "receivedAt": Date().timeIntervalSince1970 * 1000,
      "headlessStart": headlessStart,
      "applicationState": describe(UIApplication.shared.applicationState),
      "connectedScenes": UIApplication.shared.connectedScenes.count,
    ]

    let search: INMediaSearch?
    let items: [INMediaItem]?
    switch intent {
    case let play as INPlayMediaIntent:
      payload["intent"] = "play"
      search = play.mediaSearch
      items = play.mediaItems
      if let shuffled = play.playShuffled {
        payload["playShuffled"] = shuffled
      }
      payload["queueLocation"] = play.playbackQueueLocation.rawValue
      payload["repeatMode"] = play.playbackRepeatMode.rawValue
    case let searchIntent as INSearchForMediaIntent:
      payload["intent"] = "search"
      search = searchIntent.mediaSearch
      items = searchIntent.mediaItems
    default:
      return nil
    }

    if let search {
      payload["mediaType"] = search.mediaType.rawValue
      payload["reference"] = search.reference.rawValue
      payload["mediaName"] = search.mediaName
      payload["artistName"] = search.artistName
      payload["albumName"] = search.albumName
      payload["genreNames"] = search.genreNames ?? []
      payload["moodNames"] = search.moodNames ?? []
    }
    payload["itemIdentifier"] = items?.first?.identifier
    return payload
  }

  private static func describe(_ state: UIApplication.State) -> String {
    switch state {
    case .active:
      return "active"
    case .inactive:
      return "inactive"
    case .background:
      return "background"
    @unknown default:
      return "unknown"
    }
  }
}

// MARK: - Settings

/// Settings the intents extension needs before the app runs. Kept in the app
/// group; the keys are mirrored in `targets/siri-intents/IntentHandler.swift`.
enum SiriMediaSettings {
  static let appGroup = "group.com.duell10111.reacttube"
  static let playbackEnabledKey = "siriPlaybackEnabled"

  static func setPlaybackEnabled(_ enabled: Bool) {
    UserDefaults(suiteName: appGroup)?.set(enabled, forKey: playbackEnabledKey)
  }
}

// MARK: - Logging

enum SiriMediaLog {
  private static let logger = Logger(subsystem: "com.duell10111.reacttube.siri", category: "app")

  static func write(_ message: String) {
    // notice, not info: only persisted levels show up in `log collect`.
    logger.notice("\(message, privacy: .public)")
  }
}
