//
//  HomeSection.swift
//  watch
//
//  Created by Konstantin Späth on 25.09.24.
//

import SwiftUI

struct HomeSection: View {
  var section: HomeScreenSection
  
    var body: some View {
      Text(section.title)
      List {
        ForEach(section.elements) { e in
          HStack {
            Image(systemName: "music.note")
            Text(e.title ?? e.id.description)
          }
        }
      }
    }
}

#Preview {
  HomeSection(section: HomeScreenSection(uuid: UUID().uuidString, title: "Title"))
}
