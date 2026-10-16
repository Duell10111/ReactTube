import ExpoModulesCore

/// When Siri started React headless, the scene that connects afterwards must
/// adopt that root view; creating a new one would mount the app a second time
/// on the same React host.
public class SiriMediaReactDelegateHandler: ExpoReactDelegateHandler {
  public override func createReactRootView(
    reactDelegate: ExpoReactDelegate,
    moduleName: String,
    initialProperties: [AnyHashable: Any]?,
    launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> UIView? {
    return MainActor.assumeIsolated {
      guard !SiriHeadlessHost.isCreating, let view = SiriHeadlessHost.takeRootView() else {
        return nil
      }
      SiriMediaLog.write("scene adopts headless React root view")
      return view
    }
  }
}
