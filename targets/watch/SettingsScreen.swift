//
//  SettingsScreen.swift
//  watch
//
//  Created by Konstantin Späth on 23.06.24.
//

import SwiftUI
import SwiftData

struct SettingsScreen: View {
    @Environment(MusicPlayerManager.self) private var musicManager: MusicPlayerManager

    var body: some View {
      List {
        Section("Playback") {
          Toggle("Shuffle", isOn: Binding(
            get: { musicManager.preferences.shuffleEnabled },
            set: { musicManager.preferences.setShuffleEnabled($0) }
          ))
          Picker("Repeat", selection: Binding(
            get: { musicManager.preferences.repeatMode },
            set: {
              musicManager.preferences.setRepeatMode($0)
              musicManager.applyRepeatMode()
            }
          )) {
            ForEach(PlayerRepeatMode.allCases) { mode in
              Text(mode.label).tag(mode)
            }
          }
        }
        Section("Library") {
          Button("Refresh Home") {
            requestHome()
          }
          Button("Refresh Playlists") {
            requestLibraryPlaylists()
          }
        }
        Section {
          // Diagnostics and developer tools stay available in a release build —
          // they are the only way to see what happens on a physical watch — but
          // they live two levels down so they cannot be hit by accident.
          NavigationLink("Advanced") {
            AdvancedScreen()
          }
        }
      }
      .navigationTitle("Settings")
    }
}

#Preview {
    SettingsScreen()
      .environment(MusicPlayerManager.shared)
}
