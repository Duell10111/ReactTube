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
        Button("Fetch video") {
          requestVideo(id: "0nsawcTwebQ")
        }
        Button("Fetch playlist") {
          requestPlaylist(id: "PL9k0aZnruOJgXFKr9QXOLAlo2ZE8IvUAw")
        }
        Button("Get Home") {
          requestHome()
        }
        NavigationLink("Library") {
          LibraryView()
        }
        NavigationLink("Settings") {
          SettingsScreen()
        }
      }.toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            NavigationLink(destination: MusikPlayer()) {
                Label("Music", systemImage: "music.note.list")
              }
          }
      }
    }
}

#Preview {
    HomeList().modelContext(DataController.previewContainer.mainContext)
}
