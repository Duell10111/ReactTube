//
//  PlayerPreferences.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 23.09.26.
//

import Foundation
import Observation

enum PlayerRepeatMode: Int, CaseIterable, Identifiable {
  case off = 0
  case queue = 1
  case track = 2

  var id: Int { rawValue }

  var label: String {
    switch self {
    case .off: return "Repeat Off"
    case .queue: return "Repeat Queue"
    case .track: return "Repeat Track"
    }
  }

  var systemImage: String {
    switch self {
    case .off: return "repeat"
    case .queue: return "repeat"
    case .track: return "repeat.1"
    }
  }

  var next: PlayerRepeatMode {
    switch self {
    case .off: return .queue
    case .queue: return .track
    case .track: return .off
    }
  }
}

/// Where playback stopped the last time. Kept in one place so the value can move
/// into a shared app group container once a complication target exists.
struct ResumeState: Codable, Equatable {
  var videoID: String
  var title: String
  var artist: String?
  var playlistID: String?
  var playlistTitle: String?
  var index: Int
  var position: TimeInterval
  var updatedAt: Date
}

/// Playback preferences that have to survive an app restart.
@Observable
final class PlayerPreferences {
  static let shared = PlayerPreferences()

  private enum Key {
    static let shuffle = "player.shuffleEnabled"
    static let repeatMode = "player.repeatMode"
    static let resumeState = "player.resumeState"
  }

  private let defaults: UserDefaults

  // Property observers are not an option here: `@Observable` does not track
  // properties that define their own accessors, so persisting happens in
  // explicit setters instead.
  private(set) var shuffleEnabled: Bool
  private(set) var repeatMode: PlayerRepeatMode
  private(set) var resumeState: ResumeState?

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
    self.shuffleEnabled = defaults.bool(forKey: Key.shuffle)
    self.repeatMode = PlayerRepeatMode(rawValue: defaults.integer(forKey: Key.repeatMode)) ?? .off
    if let data = defaults.data(forKey: Key.resumeState) {
      self.resumeState = try? JSONDecoder().decode(ResumeState.self, from: data)
    }
  }

  func setShuffleEnabled(_ enabled: Bool) {
    shuffleEnabled = enabled
    defaults.set(enabled, forKey: Key.shuffle)
  }

  func setRepeatMode(_ mode: PlayerRepeatMode) {
    repeatMode = mode
    defaults.set(mode.rawValue, forKey: Key.repeatMode)
  }

  func storeResumeState(_ state: ResumeState) {
    resumeState = state
    persistResumeState()
  }

  /// Cheap update while a title keeps playing — only the position changes.
  func updateResumePosition(_ position: TimeInterval) {
    guard var state = resumeState else { return }
    state.position = position
    state.updatedAt = Date()
    resumeState = state
    persistResumeState()
  }

  func clearResumeState() {
    resumeState = nil
    defaults.removeObject(forKey: Key.resumeState)
  }

  private func persistResumeState() {
    guard let resumeState else { return }
    do {
      defaults.set(try JSONEncoder().encode(resumeState), forKey: Key.resumeState)
    } catch {
      WatchLog.shared.warning("Preferences", "Could not store resume state: \(error.localizedDescription)")
    }
  }
}
