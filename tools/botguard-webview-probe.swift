// Checks modules/botguard-webview/ios/RuntimeWebView.swift in the tvOS
// simulator, without an app build: WebKit via dlopen, page load, evaluate and
// the message handler, then a real BotGuard run.
//
//   node tools/botguard-webview-probe-page.mjs bUHZ2k9DYHY /tmp/bg.html
//   xcrun --sdk appletvsimulator swiftc -parse-as-library \
//     -target arm64-apple-tvos16.4-simulator -o /tmp/bg-probe \
//     tools/botguard-webview-probe.swift modules/botguard-webview/ios/RuntimeWebView.swift
//   xcrun simctl boot "Apple TV 4K (3rd generation)"
//   xcrun simctl spawn booted /tmp/bg-probe /tmp/bg.html
//
// Prints `TOKEN <pot> TTL <seconds>`; check the token in the youtubei.js fork
// with `POT_VALUE=<pot> node dev-scripts/phase6-verify.mjs <videoId> WEB`.

import Foundation

@main
struct BotGuardWebViewProbe {
  static func main() {
    guard CommandLine.arguments.count > 1,
          let html = try? String(contentsOfFile: CommandLine.arguments[1], encoding: .utf8) else {
      print("usage: bg-probe <page.html>")
      exit(2)
    }

    var finished = false
    var webView: RuntimeWebView?

    func check(_ label: String, _ ok: Bool, _ detail: String = "") {
      print("\(ok ? "✔" : "✘") \(label)\(detail.isEmpty ? "" : " — \(detail)")")
      if !ok {
        exit(1)
      }
    }

    check("WebKit loaded at runtime", RuntimeWebView.loadWebKit())

    do {
      webView = try RuntimeWebView(
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
        messageHandlerName: "reacttube"
      )
    } catch {
      check("WKWebView created", false, "\(error)")
    }
    check("WKWebView created", webView != nil)

    let started = Date()
    webView?.onMessage = { message in
      print("  \(message)")
      check("BotGuard run finished", message.hasPrefix("TOKEN "),
            String(format: "%.1f s", Date().timeIntervalSince(started)))
      finished = true
    }

    webView?.load(html: html, baseURL: URL(string: "https://www.youtube.com")!) { error in
      check("page loaded", error == nil, error.map { "\($0)" } ?? "")

      webView?.evaluate("[navigator.userAgent.indexOf('Macintosh') >= 0, typeof window.__potoken].join(' ')") { result in
        if case .success(let value) = result {
          check("evaluate returns values", value == "true object", value ?? "nil")
        } else {
          check("evaluate returns values", false, "\(result)")
        }
      }

      webView?.evaluate("throw new Error('boom')") { result in
        if case .failure(let error) = result {
          check("evaluate reports exceptions", "\(error)".contains("boom"), "\(error)")
        } else {
          check("evaluate reports exceptions", false)
        }
      }
    }

    let deadline = Date().addingTimeInterval(60)
    while !finished && Date() < deadline {
      RunLoop.main.run(until: Date().addingTimeInterval(0.1))
    }

    check("message arrived before the deadline", finished)
  }
}
