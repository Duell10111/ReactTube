// JavaScript binding for `RuntimeWebView` (plan phase 5, tvOS).
//
// One web view at a time: `create` replaces any previous one. The page posts
// to the `reacttube` message handler; those messages arrive as `onMessage`.
// All WebKit calls run on the main queue, as WebKit requires.

import ExpoModulesCore

public class BotGuardWebViewModule: Module {
  private static let messageHandlerName = "reacttube"

  private var webView: RuntimeWebView?

  public func definition() -> ModuleDefinition {
    Name("BotGuardWebView")

    Events("onMessage")

    OnDestroy {
      DispatchQueue.main.async {
        self.webView = nil
      }
    }

    /// Whether WebKit can be loaded on this device at all.
    AsyncFunction("isAvailable") { () -> Bool in
      RuntimeWebView.loadWebKit()
    }.runOnQueue(.main)

    AsyncFunction("create") { (userAgent: String?, promise: Promise) in
      do {
        let webView = try RuntimeWebView(
          userAgent: userAgent,
          messageHandlerName: Self.messageHandlerName
        )
        webView.onMessage = { [weak self] data in
          self?.sendEvent("onMessage", ["data": data])
        }
        self.webView = webView
        promise.resolve(nil)
      } catch {
        promise.reject("ERR_WEBKIT_UNAVAILABLE", "\(error)")
      }
    }.runOnQueue(.main)

    AsyncFunction("loadHtml") { (html: String, baseUrl: String, promise: Promise) in
      guard let webView = self.webView, let url = URL(string: baseUrl) else {
        promise.reject("ERR_NO_WEBVIEW", "Call create() first and pass a valid base URL")
        return
      }

      webView.load(html: html, baseURL: url) { error in
        if let error {
          promise.reject("ERR_LOAD", "\(error)")
        } else {
          promise.resolve(nil)
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("evaluate") { (script: String, promise: Promise) in
      guard let webView = self.webView else {
        promise.reject("ERR_NO_WEBVIEW", "Call create() first")
        return
      }

      webView.evaluate(script) { result in
        switch result {
        case .success(let value):
          promise.resolve(value)
        case .failure(let error):
          promise.reject("ERR_JAVASCRIPT", "\(error)")
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("destroy") { () in
      self.webView = nil
    }.runOnQueue(.main)
  }
}
