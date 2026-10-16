import ExpoModulesCore
import Intents

/// Picks up `.continueInApp` requests. Siri hands them over as an
/// `NSUserActivity` whose type is the intent class name; the scene delegate
/// forwards both warm (`scene(_:continue:)`) and cold starts (connection
/// options) to the app delegate subscribers.
public class SiriMediaAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let type = userActivity.activityType
    guard type == String(describing: INPlayMediaIntent.self)
      || type == String(describing: INSearchForMediaIntent.self) else {
      return false
    }
    guard let intent = userActivity.interaction?.intent,
      let payload = SiriMediaPayload.make(intent: intent, delivery: "continueInApp") else {
      SiriMediaLog.write("continue userActivity \(type) without interaction")
      return false
    }
    SiriMediaCenter.shared.enqueue(payload, completion: nil)
    return true
  }
}
