//
//  PlaylistManager.swift
//  watch
//
//  Created by Konstantin Späth on 13.07.24.
//

import Foundation
import AVFoundation
import SwiftAudioEx

class PlaylistManager {
  
  private var playlist: Playlist?
  var videos: [Video]?
  private var playlistItems: [AudioItem?] = []
  
  init() {
    
  }
  
  func setPlaylist(_ playlist: Playlist?, videos: [Video]? = nil) {
    if let p = playlist {
      self.playlist = p
      self.videos = p.videos
      self.playlistItems = Array(repeating: nil, count: p.videos.count)
    } else if let v = videos {
      self.playlist = nil
      self.videos = v
      self.playlistItems = Array(repeating: nil, count: v.count)
    } else {
      print("Setting playlist invalid")
    }
  }
  
  func getAll() -> [(Video, AudioItem)] {
    if let videos = videos {
      return getVideos(indexSet: IndexSet(0...videos.count-1))
    }
    return []
  }
  
  func getVideos(indexSet: IndexSet) -> [(Video, AudioItem)] {
    let items : [(Int, AudioItem?)] = indexSet.map { index in
      let playerItem = playlistItems[index]
      if let pItem = playerItem {
        return (index, pItem)
      } else {
        if let videos = videos {
          let pItem = getPlayerItem(videos[index])
          self.playlistItems[index] = pItem
          return (index, pItem)
        }
      }
      return (index, nil)
    }
    
    return items.compactMap { index, playerItem in
      if let pItem = playerItem, let video = videos?[index] {
        return (video, pItem)
      }
      return nil
    }
    
  }
  
  func checkForNewVideos() {
    // TODO: Check if playlist contains new videos
  }
  
  private func getPlayerItem(_ video: Video) -> AudioItem? {
    if let localFile = video.fileURL {
      let uri = getDownloadDirectory().appending(path: localFile)
      print("Local uri: \(uri)")
      let item = DefaultAudioItem(audioUrl: uri.absoluteString, sourceType: .file)
      print("Local version")
      // Set end for local files?
//          item.forwardPlaybackEndTime =
      return item
    } else if let sURL = video.streamURL, let uri = URL(string: sURL) {
      print("Remote uri: \(sURL)")
      let item = DefaultAudioItem(audioUrl: sURL, sourceType: .stream)
      
      return item
    }
    return nil
  }
  
  
  
}

protocol PlaylistManagerDelegate {
  func fetchedNewVideos(playlistItems: [AVPlayerItem])
}