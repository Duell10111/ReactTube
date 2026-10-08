//
//  VolumeControl.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 15.10.24.
//

import SwiftUI

/// Volume indicator next to the Digital Crown.
///
/// Display only: the crown input is handled by the invisible `NativeVolumeControl`
/// in the player, this view just mirrors the system output volume. It stays subtle
/// while idle and is highlighted briefly whenever the volume changes, so it matches
/// the white progress bar instead of competing with the artwork.
struct VolumeControl: View {
  @Environment(MusicPlayerManager.self) private var musicManager: MusicPlayerManager

  @State private var isHighlighted: Bool = false

  private let trackHeight: CGFloat = 44
  private let highlightDuration: Duration = .seconds(1.5)

  private var level: Double { min(max(musicManager.volume, 0), 1) }

  var body: some View {
    ZStack(alignment: .bottom) {
      Rectangle()
        .fill(Color.white.opacity(0.25))
      Rectangle()
        .fill(Color.white.opacity(isHighlighted ? 1 : 0.85))
        .frame(height: trackHeight * level)
    }
    .frame(width: isHighlighted ? 6 : 4, height: trackHeight)
    // Clipping the whole track keeps the fill rounded at the bottom and flat at
    // its current level, like the system volume indicator.
    .clipShape(Capsule())
    .overlay(alignment: .top) {
      Image(systemName: level > 0 ? "speaker.wave.3.fill" : "speaker.slash.fill", variableValue: level)
        .font(.system(size: 10))
        .foregroundStyle(.white)
        .fixedSize()
        .offset(y: -16)
        .opacity(isHighlighted ? 1 : 0)
    }
    .padding(.trailing, 2)
    .animation(.easeOut(duration: 0.15), value: level)
    .animation(.easeInOut(duration: 0.2), value: isHighlighted)
    .onChange(of: musicManager.volume) {
      isHighlighted = true
    }
    .task(id: musicManager.volume) {
      // Restarts on every change, so the highlight fades only once the crown rests.
      do { try await Task.sleep(for: highlightDuration) } catch { return }
      isHighlighted = false
    }
    .accessibilityElement()
    .accessibilityLabel("Volume")
    .accessibilityValue("\(Int((level * 100).rounded())) percent")
  }
}

#Preview {
  VolumeControl()
    .environment(MusicPlayerManager.shared)
}
