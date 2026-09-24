//
//  Track.swift
//  RNTrackPlayer
//
//  Created by David Chavez on 12.08.17.
//  Copyright © 2017 David Chavez. All rights reserved.
//

import Foundation
import MediaPlayer
import AVFoundation
import SwiftAudioEx
import UIKit

class Track: AudioItem {
    let url: MediaURL

    @objc var title: String?
    @objc var artist: String?

    var date: String?
    var desc: String?
    var genre: String?
    var duration: Double?
    var artworkURL: MediaURL?
    var isLiveStream: Bool?

    var album: String?
    var artwork: MPMediaItemArtwork?

    private var originalObject: [String: Any] = [:]
  
    init?(url: String, artworkUrl: String? = nil) {
      guard let url = MediaURL(url: url) else { return nil }
      self.url = url
      if let artworkUrl = artworkUrl {
        self.artworkURL = MediaURL(url: artworkUrl)
      }
    }

    // MARK: - AudioItem Protocol

    func getSourceUrl() -> String {
        return url.isLocal ? url.value.path : url.value.absoluteString
    }

    func getArtist() -> String? {
        return artist
    }

    func getTitle() -> String? {
        return title
    }

    func getAlbumTitle() -> String? {
        return album
    }

    func getSourceType() -> SourceType {
        return url.isLocal ? .file : .stream
    }

    func getArtwork(_ handler: @escaping (UIImage?) -> Void) {
        guard let artworkURL = artworkURL else {
            handler(nil)
            return
        }

        // Goes through the cache: the artwork of a title is requested by the
        // player UI and by the now playing info controller, and a remote cover
        // would otherwise be downloaded again on every track change.
        ArtworkCache.shared.image(for: artworkURL.value, isLocal: artworkURL.isLocal, completion: handler)
    }
}

class TrackEndtime: Track, EndTiming {
  public var endTiming: CMTime

  init?(url: String, artworkUrl: String? = nil, endTiming: CMTime) {
      self.endTiming = endTiming
      super.init(url: url, artworkUrl: artworkUrl)
  }

  public func getEndTime() -> CMTime {
      endTiming
  }
}

struct MediaURL {
    let value: URL
    let isLocal: Bool
  
    init?(url: String) {
      isLocal = url.lowercased().hasPrefix("file://")
      if isLocal {
        // FilewithPath does not work correctly
        value = URL(string: url)!
      } else if let urlValue = URL(string: url) {
        value = urlValue
      } else {
        return nil
      }
    }
}
