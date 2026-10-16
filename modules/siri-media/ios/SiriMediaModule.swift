import ExpoModulesCore
import Intents

public class SiriMediaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SiriMedia")

    Events("onSiriMediaRequest")

    OnCreate {
      SiriMediaCenter.shared.attach(module: self)
    }

    OnDestroy {
      SiriMediaCenter.shared.detach(module: self)
    }

    OnStartObserving("onSiriMediaRequest") {
      SiriMediaCenter.shared.setListenerReady(true)
    }

    OnStopObserving("onSiriMediaRequest") {
      SiriMediaCenter.shared.setListenerReady(false)
    }

    Function("getPendingRequests") { () -> [[String: Any]] in
      return SiriMediaCenter.shared.takeUndelivered()
    }

    Function("completeRequest") { (requestId: String, result: String) in
      SiriMediaCenter.shared.complete(requestId, result: SiriMediaResult(rawValue: result) ?? .failure)
    }

    Function("log") { (message: String) in
      SiriMediaLog.write("[JS] \(message)")
    }

    // Tells Siri what was played, so it learns ReactTube as a media app and can
    // suggest or replay these items. Donations stay on the device.
    Function("donatePlayback") { (videoId: String, title: String, artist: String?) in
      let item = INMediaItem(
        identifier: "rt:video:\(videoId)",
        title: title,
        type: .song,
        artwork: nil,
        artist: artist
      )
      let intent = INPlayMediaIntent(
        mediaItems: [item],
        mediaContainer: nil,
        playShuffled: nil,
        playbackRepeatMode: .unknown,
        resumePlayback: nil,
        playbackQueueLocation: .now,
        playbackSpeed: nil,
        mediaSearch: nil
      )
      let response = INPlayMediaIntentResponse(code: .success, userActivity: nil)
      INInteraction(intent: intent, response: response).donate { error in
        SiriMediaLog.write("donated \(videoId) \(title) error=\(error?.localizedDescription ?? "-")")
      }
    }

    Function("getSiriAuthorizationStatus") { () -> String in
      return Self.describe(INPreferences.siriAuthorizationStatus())
    }

    AsyncFunction("requestSiriAuthorization") { (promise: Promise) in
      INPreferences.requestSiriAuthorization { status in
        promise.resolve(Self.describe(status))
      }
    }
  }

  func emitRequest(_ payload: [String: Any]) {
    sendEvent("onSiriMediaRequest", payload)
  }

  private static func describe(_ status: INSiriAuthorizationStatus) -> String {
    switch status {
    case .authorized:
      return "authorized"
    case .denied:
      return "denied"
    case .restricted:
      return "restricted"
    case .notDetermined:
      return "notDetermined"
    @unknown default:
      return "unknown"
    }
  }
}
