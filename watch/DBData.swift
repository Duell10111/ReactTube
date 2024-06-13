//
//  DBData.swift
//  watch
//
//  Created by Konstantin Späth on 13.01.24.
//

import Foundation
import SwiftData

@Model
final class Video {
    @Attribute(.unique) var id: String
    var date: Date
    var title: String?
    var downloaded: Bool
    var fileURL: String?
    var coverURL: String?

  init(id: String? = nil, date: Date? = nil, title: String? = nil, downloaded: Bool = false) {
        self.id = id ?? UUID().uuidString
        self.date = date ?? Date()
        self.title = title
        self.downloaded = downloaded
  }
}
