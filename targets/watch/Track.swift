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

    // TODO: Refactor to use variables directly for constructor
    init?(dictionary: [String: Any]) {
        guard let url = MediaURL(object: dictionary["url"]) else { return nil }
        self.url = url

        updateMetadata(dictionary: dictionary);
    }


    // MARK: - Public Interface

    func toObject() -> [String: Any] {
        return originalObject
    }

    func updateMetadata(dictionary: [String: Any]) {
        self.title = (dictionary["title"] as? String) ?? self.title
        self.artist = (dictionary["artist"] as? String) ?? self.artist
        self.date = dictionary["date"] as? String
        self.album = dictionary["album"] as? String
        self.genre = dictionary["genre"] as? String
        self.desc = dictionary["description"] as? String
        self.duration = dictionary["duration"] as? Double
        self.artworkURL = MediaURL(object: dictionary["artwork"])
        self.isLiveStream = dictionary["isLiveStream"] as? Bool

        self.originalObject = self.originalObject.merging(dictionary) { (_, new) in new }
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
        if let artworkURL = artworkURL?.value {
            if(self.artworkURL?.isLocal ?? false){
                let image = UIImage.init(contentsOfFile: artworkURL.path);
                handler(image);
            } else {
                URLSession.shared.dataTask(with: artworkURL, completionHandler: { (data, _, error) in
                    if let data = data, let artwork = UIImage(data: data), error == nil {
                        handler(artwork)
                    } else {
                        handler(nil)
                    }
                }).resume()
            }
        } else {
            handler(nil)
        }
    }
}

struct MediaURL {
    let value: URL
    let isLocal: Bool
    private let originalObject: Any
    
    init?(object: Any?) {
        guard let object = object else { return nil }
        originalObject = object
        
        // This is based on logic found in RCTConvert NSURLRequest,
        // and uses RCTConvert NSURL to create a valid URL from various formats
        if let localObject = object as? [String: Any] {
            var url = localObject["uri"] as? String ?? localObject["url"] as! String
            
            isLocal = url.lowercased().hasPrefix("http") ? false : true
            value = URL(string: url)!
        } else {
            let url = object as! String
            isLocal = url.lowercased().hasPrefix("file://")
            value = isLocal ? URL(filePath: url) : URL(string: url)!
        }
    }
}
