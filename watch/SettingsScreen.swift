//
//  SettingsScreen.swift
//  watch
//
//  Created by Konstantin Späth on 23.06.24.
//

import SwiftUI

struct SettingsScreen: View {
    @Environment(\.modelContext) var modelContext
    
    var body: some View {
      Button("Delete Downloads") {
        clearDownloads(modelContext: modelContext)
      }
    }
}

#Preview {
    SettingsScreen()
}
