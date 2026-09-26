//
//  PlaybackProgressView.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 23.09.26.
//

import SwiftUI
import WatchKit

/// Playback position of the current title.
///
/// By default this is a display only: the Digital Crown belongs to the volume
/// control. Tapping the bar opens a clearly marked seek mode — only while that
/// mode is visible may the crown change the position, and it falls back to volume
/// as soon as the mode ends (on Done, on a track change, or after a few seconds
/// without crown input).
struct PlaybackProgressView: View {
  @Environment(MusicPlayerManager.self) private var musicManager: MusicPlayerManager

  /// Owned by the player view: while seeking, the volume control must give up the crown.
  @Binding var isSeeking: Bool

  @State private var seekTarget: TimeInterval = 0
  @State private var crownPosition: Double = 0
  /// Bumped on every crown movement to restart the commit/auto-exit timer.
  @State private var interaction: Int = 0
  @FocusState private var crownFocused: Bool

  private let commitDelay: Duration = .milliseconds(350)
  private let idleTimeout: Duration = .seconds(4)

  private var duration: TimeInterval { musicManager.duration }
  private var displayedTime: TimeInterval { isSeeking ? seekTarget : musicManager.currentTime }

  private var progress: Double {
    guard duration > 0 else { return 0 }
    return min(max(displayedTime / duration, 0), 1)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      bar
        .frame(height: isSeeking ? 6 : 3)
        .animation(.easeInOut(duration: 0.15), value: isSeeking)

      HStack(spacing: 4) {
        Text(formatPlaybackTime(displayedTime))
        Spacer(minLength: 2)
        if isSeeking {
          Button("Done") {
            exitSeekMode()
          }
          .buttonStyle(.plain)
          .foregroundStyle(.yellow)
        } else {
          Text("-\(formatPlaybackTime(max(duration - displayedTime, 0)))")
        }
      }
      .font(.system(size: 11))
      .monospacedDigit()
      .foregroundStyle(.secondary)

      if isSeeking {
        Text("Seek with Crown")
          .font(.system(size: 10))
          .foregroundStyle(.yellow)
      }
    }
    .accessibilityElement(children: .combine)
    .accessibilityLabel(isSeeking ? "Playback position, seek with crown" : "Playback position")
    .accessibilityValue("\(Int(progress * 100)) percent")
    .accessibilityHint(isSeeking ? "Double tap to leave seek mode" : "Double tap to seek with the crown")
    .accessibilityAdjustableAction { direction in
      // VoiceOver cannot turn the crown, so offer fixed steps instead.
      switch direction {
      case .increment: musicManager.skip(by: 15)
      case .decrement: musicManager.skip(by: -15)
      default: break
      }
    }
    .onChange(of: musicManager.trackIndex) {
      // A new title invalidates the position that is being scrubbed.
      if isSeeking { exitSeekMode(commit: false) }
    }
    .onChange(of: musicManager.isSeekable) {
      if isSeeking && !musicManager.isSeekable { exitSeekMode(commit: false) }
    }
    .task(id: interaction) {
      guard isSeeking else { return }
      // Commit shortly after the crown comes to a rest instead of seeking on
      // every single tick …
      do { try await Task.sleep(for: commitDelay) } catch { return }
      musicManager.seek(to: seekTarget)
      // … and hand the crown back to the volume control after a moment of idleness.
      do { try await Task.sleep(for: idleTimeout) } catch { return }
      exitSeekMode()
    }
  }

  @ViewBuilder
  private var bar: some View {
    if isSeeking {
      barTrack
        .focusable(true)
        .focused($crownFocused)
        .digitalCrownRotation(
          $crownPosition,
          from: 0.0,
          through: max(duration, 1.0),
          by: 1.0,
          sensitivity: .medium,
          isContinuous: false,
          isHapticFeedbackEnabled: true
        )
        .onChange(of: crownPosition) { _, newValue in
          seekTarget = min(max(newValue, 0), duration)
          interaction += 1
        }
    } else {
      Button {
        enterSeekMode()
      } label: {
        barTrack
      }
      .buttonStyle(.plain)
      .disabled(!musicManager.isSeekable)
    }
  }

  private var barTrack: some View {
    GeometryReader { geometry in
      ZStack(alignment: .leading) {
        Capsule()
          .fill(Color.white.opacity(0.25))
        Capsule()
          .fill(isSeeking ? Color.yellow : Color.white.opacity(0.85))
          .frame(width: geometry.size.width * progress)
      }
    }
  }

  private func enterSeekMode() {
    guard musicManager.isSeekable else { return }
    seekTarget = musicManager.currentTime
    crownPosition = musicManager.currentTime
    isSeeking = true
    crownFocused = true
    interaction += 1
    WKInterfaceDevice.current().play(.start)
  }

  private func exitSeekMode(commit: Bool = true) {
    guard isSeeking else { return }
    if commit { musicManager.seek(to: seekTarget) }
    isSeeking = false
    crownFocused = false
    WKInterfaceDevice.current().play(.stop)
  }
}

func formatPlaybackTime(_ time: TimeInterval) -> String {
  guard time.isFinite, time >= 0 else { return "0:00" }
  let totalSeconds = Int(time.rounded(.down))
  let seconds = totalSeconds % 60
  let minutes = (totalSeconds / 60) % 60
  let hours = totalSeconds / 3600

  if hours > 0 {
    return String(format: "%d:%02d:%02d", hours, minutes, seconds)
  }
  return String(format: "%d:%02d", minutes, seconds)
}

#Preview {
  PlaybackProgressView(isSeeking: .constant(false))
    .environment(MusicPlayerManager.shared)
}
