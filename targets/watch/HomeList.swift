//
//  HomeList.swift
//  watch
//
//  Created by Konstantin Späth on 13.06.24.
//

import SwiftUI
import SwiftData

struct HomeList: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager

    var body: some View {
      List {
        if let resume = musicPlayerManager.preferences.resumeState {
          Section {
            ContinueListeningRow(state: resume)
          }
        }
        HomeSectionList()
        NavigationLink("Library") {
          LibraryView()
        }
        NavigationLink("Settings") {
          SettingsScreen()
        }
      }.toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            NavigationLink(destination: MusikPlayer()) {
                Label("Music", systemImage: "playpause.circle")
              }
          }
      }
    }
}

/// Continues the last title where it stopped. The state behind it is persisted,
/// so it also survives a restart of the app.
struct ContinueListeningRow: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  var state: ResumeState

  var body: some View {
    Button {
      musicPlayerManager.resumePlayback(state)
    } label: {
      HStack {
        Image(systemName: "play.circle")
        VStack(alignment: .leading, spacing: 1) {
          Text("Continue")
            .font(.system(size: 12))
            .foregroundStyle(.secondary)
          Text(state.title)
          Text(formatPlaybackTime(state.position))
            .font(.system(size: 11))
            .monospacedDigit()
            .foregroundStyle(.secondary)
        }
      }
    }
  }
}

#Preview {
    HomeList()
      .modelContext(DataController.previewContainer.mainContext)
      .environment(MusicPlayerManager.shared)
}
