//
//  AdvancedScreen.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 23.09.26.
//

import SwiftUI
import SwiftData

/// Entry point for everything that is not part of the normal usage: diagnostics,
/// developer tools and destructive maintenance. Everything here is compiled into
/// the release build as well, because a physical watch has no Xcode console.
struct AdvancedScreen: View {
    var body: some View {
      List {
        Section {
          NavigationLink("Diagnostics") {
            DiagnosticsScreen()
          }
          NavigationLink("Event Log") {
            EventLogScreen()
          }
        }
        Section {
          NavigationLink("Developer Tools") {
            DeveloperToolsScreen()
          }
          NavigationLink("Maintenance") {
            MaintenanceScreen()
          }
        }
      }
      .navigationTitle("Advanced")
    }
}

/// Manual requests that used to sit as debug buttons in the home and section
/// lists.
struct DeveloperToolsScreen: View {
    @Environment(\.modelContext) var modelContext
    @Query(sort: \Video.title) var videos: [Video]
    @Query var homeSections: [HomeScreenSection]

    var body: some View {
      List {
        Section("Requests") {
          Button("Request Home") {
            requestHome()
          }
          Button("Request Playlists") {
            requestLibraryPlaylists()
          }
          Button("Check Videos") {
            checkVideosForExpiration(videos)
          }
        }
        Section("Contents") {
          ForEach(homeSections) { section in
            NavigationLink("\(section.title) (\(section.elements.count))") {
              HomeSection(section: section)
            }
          }
        }
        Section("Test Requests") {
          NavigationLink("Dev Tests") {
            DevTests()
          }
        }
      }
      .navigationTitle("Developer Tools")
    }
}

/// Destructive actions, each behind a confirmation so a mistap cannot wipe the
/// database.
struct MaintenanceScreen: View {
    @Environment(\.modelContext) var modelContext
    @State private var confirmDeleteDownloads = false
    @State private var confirmDeleteDatabase = false

    var body: some View {
      List {
        Section("Downloads") {
          Button("Delete Downloads", role: .destructive) {
            confirmDeleteDownloads = true
          }
          Button("Clear Artwork Cache") {
            ArtworkCache.shared.clear()
            WatchLog.shared.info("Maintenance", "Artwork cache cleared")
          }
        }
        Section("Database") {
          Button("Delete Database", role: .destructive) {
            confirmDeleteDatabase = true
          }
        }
      }
      .navigationTitle("Maintenance")
      .confirmationDialog("Delete all downloaded files?", isPresented: $confirmDeleteDownloads) {
        Button("Delete Downloads", role: .destructive) {
          clearDownloads(modelContext: modelContext)
          WatchLog.shared.warning("Maintenance", "All downloads deleted")
        }
        Button("Cancel", role: .cancel) {}
      }
      .confirmationDialog("Delete the whole database?", isPresented: $confirmDeleteDatabase) {
        Button("Delete Database", role: .destructive) {
          clearDatabase(modelContext: modelContext)
          MusicPlayerManager.shared.preferences.clearResumeState()
          WatchLog.shared.warning("Maintenance", "Database deleted")
        }
        Button("Cancel", role: .cancel) {}
      }
    }
}

#Preview {
  NavigationStack {
    AdvancedScreen()
  }
  .modelContext(DataController.previewContainer.mainContext)
}
