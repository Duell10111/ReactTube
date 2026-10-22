//
//  DevTests.swift
//  Reacttube
//
//  Created by Konstantin Späth on 30.09.24.
//

import SwiftUI

struct DevTests: View {
    @State private var confirmTerminate = false

    var body: some View {
      List{
        Button("Fetch video") {
          requestVideo(id: "0nsawcTwebQ")
        }
        Button("Fetch playlist") {
          requestPlaylist(id: "PL9k0aZnruOJgXFKr9QXOLAlo2ZE8IvUAw")
        }
        #if DEBUG
        // Unlike swiping the app away, exit() ends the process the way the
        // system does, so background transfers keep running and relaunch it.
        Button("Terminate process", role: .destructive) {
          confirmTerminate = true
        }
        .confirmationDialog("Terminate the app process?", isPresented: $confirmTerminate) {
          Button("Terminate", role: .destructive) { exit(0) }
        }
        #endif
      }
    }
}

#Preview {
    DevTests()
}
