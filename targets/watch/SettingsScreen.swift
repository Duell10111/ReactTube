//
//  SettingsScreen.swift
//  watch
//
//  Created by Konstantin Späth on 23.06.24.
//

import SwiftUI
import SwiftData

struct SettingsScreen: View {
    @Environment(\.modelContext) var modelContext
    @Query(sort: \Video.title) var videos: [Video]
    
    var body: some View {
      List {
        Section("Dev Tools") {
          NavigationLink("Dev Tests") {
            DevTests()
          }
          Button("Check Videos") {
            checkVideosForExpiration(videos)
          }
          NavigationLink("Debug Screen") {
            DebugScreen()
          }
        }
        Section("DESTRUCTIVE") {
          Button("Delete Downloads") {
            clearDownloads(modelContext: modelContext)
          }
          Button("DELETE Database!") {
            clearDatabase(modelContext: modelContext)
          }
        }
      }
    }
}

#Preview {
    SettingsScreen()
}
