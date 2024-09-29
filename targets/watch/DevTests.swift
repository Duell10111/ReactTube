//
//  DevTests.swift
//  Reacttube
//
//  Created by Konstantin Späth on 30.09.24.
//

import SwiftUI

struct DevTests: View {
    var body: some View {
      List{
        Button("Fetch video") {
          requestVideo(id: "0nsawcTwebQ")
        }
        Button("Fetch playlist") {
          requestPlaylist(id: "PL9k0aZnruOJgXFKr9QXOLAlo2ZE8IvUAw")
        }
      }
    }
}

#Preview {
    DevTests()
}
