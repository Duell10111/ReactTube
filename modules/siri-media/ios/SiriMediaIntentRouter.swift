import Foundation
import Intents
import MediaPlayer
import UIKit

/// Called from the app delegate (injected by `plugins/ios/withSiri.js`), because
/// `ExpoAppDelegate` does not forward SiriKit in-app intent handling to subscribers.
@objc(RTSiriMediaIntentRouter)
public final class SiriMediaIntentRouter: NSObject {
  /// Returns an in-app handler for intents the extension answered with `.handleInApp`.
  ///
  /// - Parameter startReactHeadless: creates the React root view without a
  ///   window. Only called when neither a scene nor a JavaScript runtime exists,
  ///   i.e. Siri launched the app in the background.
  @MainActor
  public static func handler(
    for intent: INIntent,
    startReactHeadless: @escaping @MainActor () -> UIView?
  ) -> Any? {
    SiriMediaLog.write("handlerFor \(type(of: intent))")
    switch intent {
    case is INPlayMediaIntent:
      return SiriPlayMediaInAppHandler(startReactHeadless: startReactHeadless)
    // Like/dislike has no .handleInApp, so the app declares it itself
    // (INIntentsSupported); "add to playlist" arrives via the extension.
    case is INUpdateMediaAffinityIntent:
      return SiriAffinityInAppHandler(startReactHeadless: startReactHeadless)
    case is INAddMediaIntent:
      return SiriAddMediaInAppHandler(startReactHeadless: startReactHeadless)
    default:
      return nil
    }
  }

  /// Starts React if needed and hands the intent to JavaScript.
  @MainActor
  static func enqueue(
    _ intent: INIntent,
    startReactHeadless: @MainActor () -> UIView?,
    completion: @escaping SiriMediaCenter.Completion
  ) {
    let headless = SiriHeadlessHost.startIfNeeded(startReactHeadless)
    guard let payload = SiriMediaPayload.make(
      intent: intent,
      delivery: "handleInApp",
      headlessStart: headless
    ) else {
      completion(.failure, nil)
      return
    }
    SiriMediaCenter.shared.enqueue(payload, completion: completion)
  }
}

final class SiriAffinityInAppHandler: NSObject, INUpdateMediaAffinityIntentHandling {
  private let startReactHeadless: @MainActor () -> UIView?

  init(startReactHeadless: @escaping @MainActor () -> UIView?) {
    self.startReactHeadless = startReactHeadless
  }

  func handle(
    intent: INUpdateMediaAffinityIntent,
    completion: @escaping (INUpdateMediaAffinityIntentResponse) -> Void
  ) {
    DispatchQueue.main.async {
      SiriMediaIntentRouter.enqueue(intent, startReactHeadless: self.startReactHeadless) { result, _ in
        completion(INUpdateMediaAffinityIntentResponse(
          code: result == .success ? .success : .failure,
          userActivity: nil
        ))
      }
    }
  }
}

final class SiriAddMediaInAppHandler: NSObject, INAddMediaIntentHandling {
  private let startReactHeadless: @MainActor () -> UIView?

  init(startReactHeadless: @escaping @MainActor () -> UIView?) {
    self.startReactHeadless = startReactHeadless
  }

  func handle(
    intent: INAddMediaIntent,
    completion: @escaping (INAddMediaIntentResponse) -> Void
  ) {
    DispatchQueue.main.async {
      SiriMediaIntentRouter.enqueue(intent, startReactHeadless: self.startReactHeadless) { result, _ in
        completion(INAddMediaIntentResponse(
          code: result == .success ? .success : .failure,
          userActivity: nil
        ))
      }
    }
  }
}

final class SiriPlayMediaInAppHandler: NSObject, INPlayMediaIntentHandling {
  private let startReactHeadless: @MainActor () -> UIView?

  init(startReactHeadless: @escaping @MainActor () -> UIView?) {
    self.startReactHeadless = startReactHeadless
  }

  func handle(
    intent: INPlayMediaIntent,
    completion: @escaping (INPlayMediaIntentResponse) -> Void
  ) {
    DispatchQueue.main.async {
      let headless = SiriHeadlessHost.startIfNeeded(self.startReactHeadless)
      guard let payload = SiriMediaPayload.make(
        intent: intent,
        delivery: "handleInApp",
        headlessStart: headless
      ) else {
        completion(INPlayMediaIntentResponse(code: .failure, userActivity: nil))
        return
      }
      SiriMediaCenter.shared.enqueue(payload) { result, nowPlaying in
        completion(Self.response(for: result, nowPlaying: nowPlaying))
      }
    }
  }

  private static func response(
    for result: SiriMediaResult,
    nowPlaying: SiriMediaNowPlaying?
  ) -> INPlayMediaIntentResponse {
    let code: INPlayMediaIntentResponseCode
    switch result {
    case .success:
      code = .success
    case .notFound:
      code = .failureNoUnplayedContent
    case .loginRequired:
      code = .failureRequiringAppLaunch
    case .failure:
      code = .failure
    }
    let response = INPlayMediaIntentResponse(code: code, userActivity: nil)
    if let nowPlaying {
      var info: [String: Any] = [:]
      info[MPMediaItemPropertyTitle] = nowPlaying.title
      info[MPMediaItemPropertyArtist] = nowPlaying.artist
      response.nowPlayingInfo = info.isEmpty ? nil : info
    }
    return response
  }
}

/// Keeps a React root view that was started without a window, so the scene that
/// connects later reuses it instead of starting a second React tree.
@MainActor
enum SiriHeadlessHost {
  private(set) static var isCreating = false
  private static var rootView: UIView?

  /// Returns true when this call started React headless.
  static func startIfNeeded(_ start: @MainActor () -> UIView?) -> Bool {
    let scenes = UIApplication.shared.connectedScenes.count
    let jsRunning = SiriMediaCenter.shared.jsRuntimeCreated
    SiriMediaLog.write(
      "startIfNeeded scenes=\(scenes) jsRuntime=\(jsRunning) "
        + "state=\(UIApplication.shared.applicationState.rawValue) cached=\(rootView != nil)"
    )
    guard scenes == 0, !jsRunning, rootView == nil else {
      return false
    }

    isCreating = true
    defer { isCreating = false }
    guard let view = start() else {
      SiriMediaLog.write("headless start failed: no React Native factory")
      return false
    }
    rootView = view
    SiriMediaLog.write("headless React root view created")
    return true
  }

  /// Hands the headless root view over to the scene, once.
  static func takeRootView() -> UIView? {
    defer { rootView = nil }
    return rootView
  }
}
