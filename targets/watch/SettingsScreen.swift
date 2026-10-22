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
    @AppStorage(DownloadNotifications.settingKey) private var downloadNotifications = true

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
          Picker("Normalize Volume", selection: Binding(
            get: { musicManager.preferences.loudnessNormalization },
            set: {
              musicManager.preferences.setLoudnessNormalization($0)
              musicManager.applyLoudnessNormalization()
            }
          )) {
            ForEach(LoudnessNormalizationMode.allCases) { mode in
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
          Toggle(WatchStabilityCopy.text(.downloadNotificationsSetting), isOn: $downloadNotifications)
            .onChange(of: downloadNotifications) { _, enabled in
              if enabled { DownloadNotifications.shared.requestAuthorizationIfNeeded() }
            }
        }
        MetadataRefreshSection()
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

/// Requests missing metadata for every title in the library: downloads and the
/// titles of non-temporary playlists.
struct MetadataRefreshSection: View {
    @Query var playlists: [Playlist]
    @Query(filter: #Predicate<Video> { $0.downloaded }) var downloadedVideos: [Video]
    private let refresher = MetadataRefresher.shared

    private var incompleteVideos: [Video] {
      var seen = Set<String>()
      let libraryVideos = downloadedVideos
        + playlists.filter { $0.temp != true }.flatMap(\.videos)
      return libraryVideos.filter { seen.insert($0.id).inserted && MetadataRefresher.isIncomplete($0) }
    }

    var body: some View {
      Section {
        if refresher.isRunning {
          HStack {
            ProgressView()
              .frame(width: 24)
            Text(WatchStabilityCopy.format(.metadataRemaining, refresher.remaining))
          }
          Button(WatchStabilityCopy.text(.metadataStop), role: .cancel) {
            refresher.cancel()
          }
        } else {
          let incomplete = incompleteVideos
          Button(WatchStabilityCopy.format(.metadataRefresh, incomplete.count)) {
            refresher.refreshIncomplete(incomplete)
          }
          .disabled(incomplete.isEmpty)
        }
      } header: {
        Text(WatchStabilityCopy.text(.metadataSection))
      } footer: {
        Text(WatchStabilityCopy.text(.metadataFooter))
      }
    }
}

#Preview {
    SettingsScreen()
      .environment(MusicPlayerManager.shared)
}
