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
    var artist: String?
    var downloaded: Bool
    var durationMillis: Int
    var streamURL: String?
    var downloadURL: String? // Workaround for download issues
    var validUntil: Date?
    var fileURL: String?
    var coverURL: String?
    var temp: Bool?

  init(id: String, durationMillis: Int, title: String? = nil, downloaded: Bool = false) {
        self.id = id
        self.durationMillis = durationMillis
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
    var temp: Bool?
    // If set videos should be checked if downloaded
    var download: Bool = false

    init(id: String, title: String? = nil) {
        self.id = id
        self.title = title
    }
}

@Model
final class HomeScreenSection {
    @Attribute(.unique) var uuid: String
    var title: String
    var elements = [HomeScreenElement]()
    var date: Date

    init(uuid: String, title: String) {
        self.uuid = uuid
        self.title = title
        self.date = Date()
    }
}

enum HomeScreenElementType: Codable {
  case video
  case playlist
}

@Model
final class HomeScreenElement {
    @Attribute(.unique) var id: String
    var title: String?
    var type: HomeScreenElementType
    var videoID: String?
    var video: Video?
    var playlistID: String?
    var playlist: Playlist?

    init(id: String, title: String? = nil, type: HomeScreenElementType) {
        self.id = id
        self.title = title
        self.type = type
    }
}
