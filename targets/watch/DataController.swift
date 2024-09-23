//
//  DataController.swift
//  watch
//
//  Created by Konstantin Späth on 11.06.24.
//

import SwiftData

@MainActor
class DataController {

    static let shared = DataController()

    let container: ModelContainer

    static let previewContainer: ModelContainer = {
        do {
            let config = ModelConfiguration(isStoredInMemoryOnly: true)
            let container = try ModelContainer(for: Video.self, Playlist.self, HomeScreenElement.self, configurations: config)

          let video = Video(id: "5pZ2IbO9VB4", durationMillis: 180000, title: "Sarà Perché Ti Amo (Long Version)", downloaded: false)
            container.mainContext.insert(video)

            return container
        } catch {
            fatalError("Failed to create model container for previewing: \(error.localizedDescription)")
        }
    }()

  init(inMemory: Bool = false) {
    do {
        let config = ModelConfiguration(isStoredInMemoryOnly: false)
      let container = try ModelContainer(for: Video.self, Playlist.self, HomeScreenSection.self, HomeScreenElement.self, configurations: config)

        self.container = container
    } catch {
        fatalError("Failed to create model container: \(error.localizedDescription)")
    }
  }
}
