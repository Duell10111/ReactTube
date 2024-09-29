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
        HomeSectionList()
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
                Label("Music", systemImage: "playpause.circle")
              }
          }
      }
    }
}

#Preview {
    HomeList().modelContext(DataController.previewContainer.mainContext)
}
