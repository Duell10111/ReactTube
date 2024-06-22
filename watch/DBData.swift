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
    var title: String?
    var downloaded: Bool
    var streamURL: String?
    var validUntil: Date?
    var fileURL: String?
    var coverURL: String?

  init(id: String, date: Date? = nil, title: String? = nil, downloaded: Bool = false) {
        self.id = id
        self.title = title
        self.downloaded = downloaded
        
  }
}

@Model
final class Playlist {
    @Attribute(.unique) var id: String
    var title: String?
    var coverURL: String?
    var videoIDs: [String] = []
    var videos = [Video]()

  init(id: String, date: Date? = nil, title: String? = nil) {
        self.id = id
        self.title = title
  }
}
