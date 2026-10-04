// A headless WKWebView on tvOS, resolved at runtime (plan phase 5, tvOS).
//
// The tvOS SDK ships no WebKit headers, but the OS carries WebKit.framework.
// Like jvanakker/tvOSBrowser (`BrowserWebView.m`), this loads the framework
// with `dlopen` and talks to `WKWebView` through the Objective-C runtime. That
// is private API: fine for locally built apps, not for the App Store.
//
// Measured in the tvOS 18 simulator on 2026-10-04: the view runs without a
// window, offers Promise/TextEncoder/crypto.subtle/canvas, and the BotGuard
// page minted tokens the SABR server accepted in 6 of 6 runs.
//
// Kept free of Expo so `tools/botguard-webview-probe.swift` can compile it
// on its own. Every method must be called on the main thread.

import Foundation
import ObjectiveC
import UIKit

enum RuntimeWebViewError: Error, CustomStringConvertible {
  case webKitUnavailable
  case javaScript(String)
  case timeout(String)

  var description: String {
    switch self {
    case .webKitUnavailable:
      return "WebKit could not be loaded at runtime"
    case .javaScript(let message):
      return "JavaScript error: \(message)"
    case .timeout(let what):
      return "\(what) timed out"
    }
  }
}

/// Receives `window.webkit.messageHandlers.<name>.postMessage` calls.
///
/// A separate object because the user content controller retains its
/// handlers; holding the web view only weakly breaks that cycle.
private final class ScriptMessageProxy: NSObject {
  weak var target: RuntimeWebView?

  @objc(userContentController:didReceiveScriptMessage:)
  func userContentController(_ controller: NSObject, didReceive message: NSObject) {
    guard let body = message.value(forKey: "body") else {
      return
    }
    target?.onMessage?(body as? String ?? String(describing: body))
  }
}

final class RuntimeWebView {
  /// Paths tvOSBrowser tries; the first is where tvOS keeps it today.
  private static let webKitPaths = [
    "/System/Library/Frameworks/WebKit.framework/WebKit",
    "/System/Library/PrivateFrameworks/WebKit.framework/WebKit",
    "/System/Library/StagedFrameworks/Safari/WebKit.framework/WebKit",
  ]

  private static var webKitLoaded = false

  /// Loads WebKit once and makes the proxy a `WKScriptMessageHandler`.
  static func loadWebKit() -> Bool {
    if webKitLoaded {
      return true
    }

    if NSClassFromString("WKWebView") == nil {
      for path in webKitPaths where dlopen(path, RTLD_NOW | RTLD_GLOBAL) != nil {
        if NSClassFromString("WKWebView") != nil {
          break
        }
      }
    }

    guard NSClassFromString("WKWebView") != nil,
          NSClassFromString("WKWebViewConfiguration") != nil else {
      return false
    }

    // WebKit types the handler as id<WKScriptMessageHandler>; declare the
    // conformance at runtime since the protocol only exists after dlopen.
    if let handlerProtocol = objc_getProtocol("WKScriptMessageHandler") {
      class_addProtocol(ScriptMessageProxy.self, handlerProtocol)
    }

    webKitLoaded = true
    return true
  }

  /// Receives every message the page posts to `messageHandlerName`.
  var onMessage: ((String) -> Void)?

  private let view: UIView
  private let proxy = ScriptMessageProxy()
  private let messageHandlerName: String
  private let userContentController: NSObject?

  init(userAgent: String?, messageHandlerName: String) throws {
    guard Self.loadWebKit(),
          let webViewClass = NSClassFromString("WKWebView") as? NSObject.Type,
          let webView = webViewClass.init() as? UIView else {
      throw RuntimeWebViewError.webKitUnavailable
    }

    // `-[WKWebView init]` creates its own configuration; its user content
    // controller is shared with the live view, so handlers added afterwards
    // take effect.
    view = webView
    view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
    self.messageHandlerName = messageHandlerName

    if let userAgent {
      view.setValue(userAgent, forKey: "customUserAgent")
    }

    let configuration = view.value(forKey: "configuration") as? NSObject
    userContentController = configuration?.value(forKey: "userContentController") as? NSObject

    proxy.target = self
    _ = userContentController?.perform(
      NSSelectorFromString("addScriptMessageHandler:name:"),
      with: proxy,
      with: messageHandlerName
    )
  }

  deinit {
    _ = userContentController?.perform(
      NSSelectorFromString("removeScriptMessageHandlerForName:"),
      with: messageHandlerName
    )
  }

  /// Loads `html` as if served from `baseURL` and waits until that document
  /// reports `readyState === "complete"`.
  func load(html: String, baseURL: URL, timeout: TimeInterval = 10, completion: @escaping (Error?) -> Void) {
    _ = view.perform(NSSelectorFromString("loadHTMLString:baseURL:"), with: html, with: baseURL)

    let deadline = Date().addingTimeInterval(timeout)

    func poll() {
      // The initial about:blank document also reports `complete`, so the
      // check includes the URL the HTML was loaded under.
      evaluate("document.readyState + ' ' + location.href") { [weak self] result in
        guard self != nil else {
          return
        }

        if case .success(let state) = result,
           state?.hasPrefix("complete ") == true,
           state?.contains("about:blank") == false {
          completion(nil)
        } else if Date() > deadline {
          completion(RuntimeWebViewError.timeout("Page load"))
        } else {
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { poll() }
        }
      }
    }

    poll()
  }

  /// Runs `script` and returns its result as a string (`nil` for
  /// undefined/null results).
  func evaluate(_ script: String, completion: @escaping (Result<String?, Error>) -> Void) {
    let handler: @convention(block) (AnyObject?, NSError?) -> Void = { value, error in
      if let error {
        let message = (error.userInfo["WKJavaScriptExceptionMessage"] as? String) ?? error.localizedDescription
        completion(.failure(RuntimeWebViewError.javaScript(message)))
        return
      }

      if value == nil || value is NSNull {
        completion(.success(nil))
      } else if let text = value as? String {
        completion(.success(text))
      } else {
        completion(.success(String(describing: value!)))
      }
    }

    _ = view.perform(
      NSSelectorFromString("evaluateJavaScript:completionHandler:"),
      with: script,
      with: unsafeBitCast(handler, to: AnyObject.self)
    )
  }
}
