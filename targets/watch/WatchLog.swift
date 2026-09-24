//
//  WatchLog.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 23.09.26.
//

import Foundation
import Observation

enum WatchLogLevel: String {
  case info
  case warning
  case error

  var symbolName: String {
    switch self {
    case .info: return "info.circle"
    case .warning: return "exclamationmark.triangle"
    case .error: return "xmark.octagon"
    }
  }
}

struct WatchLogEntry: Identifiable {
  let id = UUID()
  let date: Date
  let level: WatchLogLevel
  let category: String
  let message: String
}

/// Ring buffer of the most recent events. The watch has no console attached in a
/// release build, so anything that used to end in `print` needs a place the
/// diagnostics screen can read it from.
@Observable
final class WatchLog {
  static let shared = WatchLog()

  /// Keep the buffer small — this lives in memory for the lifetime of the app.
  static let limit = 100

  private(set) var entries: [WatchLogEntry] = []

  private init() {}

  func log(_ level: WatchLogLevel, _ category: String, _ message: String) {
    print("[\(category)] \(message)")
    let entry = WatchLogEntry(date: Date(), level: level, category: category, message: message)
    // Views observe `entries`, so the mutation has to happen on the main actor.
    if Thread.isMainThread {
      insert(entry)
    } else {
      DispatchQueue.main.async { self.insert(entry) }
    }
  }

  func info(_ category: String, _ message: String) {
    log(.info, category, message)
  }

  func warning(_ category: String, _ message: String) {
    log(.warning, category, message)
  }

  func error(_ category: String, _ message: String) {
    log(.error, category, message)
  }

  func clear() {
    if Thread.isMainThread {
      entries = []
    } else {
      DispatchQueue.main.async { self.entries = [] }
    }
  }

  private func insert(_ entry: WatchLogEntry) {
    entries.insert(entry, at: 0)
    if entries.count > Self.limit {
      entries.removeLast(entries.count - Self.limit)
    }
  }
}
