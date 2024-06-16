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
            let container = try ModelContainer(for: Video.self, Playlist.self, configurations: config)
          
            let video = Video(id: "5pZ2IbO9VB4", title: "Sarà Perché Ti Amo (Long Version)", downloaded: false)
            container.mainContext.insert(video)

//            let diaryEntry = DiaryEntry(id: nil, date: nil, title: "TestTitle")
//            container.mainContext.insert(diaryEntry)
//
//            for i in 1...9 {
//                let content = Content(content: "Example Content \(i)", type: ContentType.allCases.randomElement()!.rawValue, order_index: i)
//                content.entry = diaryEntry
//                container.mainContext.insert(content)
//            }

            return container
        } catch {
            fatalError("Failed to create model container for previewing: \(error.localizedDescription)")
        }
    }()

  init(inMemory: Bool = false) {
    do {
        let config = ModelConfiguration(isStoredInMemoryOnly: false)
        let container = try ModelContainer(for: Video.self, Playlist.self, configurations: config)

        self.container = container
    } catch {
        fatalError("Failed to create model container: \(error.localizedDescription)")
    }
  }
}
