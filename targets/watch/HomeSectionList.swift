//
//  HomeSectionList.swift
//  watch
//
//  Created by Konstantin Späth on 25.09.24.
//

import SwiftUI
import SwiftData

struct HomeSectionList: View {
    @Query var homeSections: [HomeScreenSection]
  
    var body: some View {
      Section(header: Text("Home")) {
        Button("Print") {
          print("Homesection: ", homeSections)
        }
        ForEach(homeSections) { section in
          NavigationLink(section.title) {
            HomeSection(section: section)
          }
        }
      }
    }
}

#Preview {
    HomeSectionList()
}
