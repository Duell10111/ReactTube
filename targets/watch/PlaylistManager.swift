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
      return getVideos(indexSet: IndexSet(0...videos.count-1)).compactMap { v, a in
        if let audio = a {
          return (v, audio)
        }
        return nil
      }
    }
    return []
  }

  func getFirstBatchOfAvailable() -> [(Video, AudioItem)] {
    if let videos = videos {
      var arr = Array<(Video, AudioItem)>()
      let videos = getVideos(indexSet: IndexSet(0...videos.count-1))

      for v in videos {
        if let audio = v.1 {
          arr.append((v.0, audio))
        } else {
          // TODO: Send request for missing video Streaming Data
          videos.forEach { video, audio in
            if audio == nil {
              requestVideo(id: video.id)
            }
          }
          break;
        }
      }
      return arr
    }
    return []
  }

  func getVideos(indexSet: IndexSet) -> [(Video, AudioItem?)] {
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
      if let video = videos?[index] {
        return (video, playerItem)
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
      let item = DefaultAudioItem(audioUrl: uri.path(), sourceType: .file)

      // TODO: Outsource to skip duplicate code
      item.title = video.title
      print("Local version")
      // Set end for local files?
//          item.forwardPlaybackEndTime =
      return item
    } else if let sURL = video.streamURL, let uri = URL(string: sURL) {
      print("Remote uri: \(sURL)")
      let item = DefaultAudioItem(audioUrl: sURL, sourceType: .stream)

      // TODO: Outsource to skip duplicate code
      item.title = video.title
      // TODO: strip player item to the video duration

      return item
    }
    return nil
  }



}

protocol PlaylistManagerDelegate {
  func fetchedNewVideos(playlistItems: [AVPlayerItem])
}
