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
      Button("Delete Downloads") {
        clearDownloads(modelContext: modelContext)
      }
      Spacer()
      Button("Check Videos") {
        checkVideosForExpiration(videos)
      }
    }
}

#Preview {
    SettingsScreen()
}
