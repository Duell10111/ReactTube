//
//  Types.swift
//  watch
//
//  Created by Konstantin Späth on 13.06.24.
//

import Foundation


class VideoElement {
  var title: String
  var duration: Int
  var coverURL: URL?
  var streamURL: URL?
  var localURL: URL?
  
  init(title: String, duration: Int, coverURL: URL? = nil, streamURL: URL? = nil, localURL: URL? = nil) {
    self.title = title
    self.duration = duration
    self.coverURL = coverURL
    self.streamURL = streamURL
    self.localURL = localURL
  }
}
