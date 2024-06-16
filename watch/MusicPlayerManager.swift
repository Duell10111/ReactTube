//
//  MusicPlayerManager.swift
//  watch
//
//  Created by Konstantin Späth on 13.06.24.
//

import Foundation
import AVFoundation
import SwiftUI

class MusicPlayerManager: ObservableObject {
    static let shared = MusicPlayerManager()
    
    @State private var currentTrackIndex = 0

    @Published var isPlaying: Bool = false
    @Published var currentTitle: String = "Unknown Title"
    @Published var currentCover: URL? = nil
    
    private var player: AVQueuePlayer?
    private var playerItems: [AVPlayerItem] = []
    private var playlist: [Video] = []
    
    private init() {
//      self.setupPlayer()
    }
  
  func updatePlaylist(newPlaylist: [Video]) {
    playlist = newPlaylist
    player?.pause()
    currentTrackIndex = 0
    setupPlayer()
  }
    
  private func setupPlayer() {
      // Set up AVAudioSession for background audio playback
      do {
          try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
          try AVAudioSession.sharedInstance().setActive(true)
      } catch {
          print("Failed to set up AVAudioSession: \(error)")
      }
    
      playerItems = playlist.compactMap { p in
        if let sURL = p.streamURL, let uri = URL(string: sURL) {
          let item = AVPlayerItem(url: uri)
          return item
        }
        return nil
      }
      player = AVQueuePlayer(items: playerItems)

      NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: nil, queue: .main) { notification in
          self.nextTrack()
      }
    
      updateTrackInfo()
  }

  func playMusic() {
      player?.play()
      isPlaying = true
  }

  func pauseMusic() {
      player?.pause()
      isPlaying = false
  }

  func nextTrack() {
      currentTrackIndex = (currentTrackIndex + 1) % playerItems.count
      player?.advanceToNextItem()
      if currentTrackIndex < playerItems.count - 1 {
          let nextItem = playerItems[currentTrackIndex]
          player?.insert(nextItem, after: player?.currentItem)
      }
      if isPlaying {
          player?.play()
      }
      updateTrackInfo()
  }

  func previousTrack() {
      currentTrackIndex = (currentTrackIndex - 1 + playerItems.count) % playerItems.count
      let previousItem = playerItems[currentTrackIndex]
      player?.pause()
      player?.removeAllItems()
      player?.insert(previousItem, after: nil)
      if isPlaying {
          player?.play()
      }
      updateTrackInfo()
  }

  func playCurrentTrack() {
      guard currentTrackIndex < playerItems.count else { return }
      let currentItem = playerItems[currentTrackIndex]
      player?.replaceCurrentItem(with: currentItem)
      if isPlaying {
          player?.play()
      }
      updateTrackInfo()
  }
  
  func updateTrackInfo() {
      print("Updating track info for index \(currentTrackIndex)")
      //let currentItem = playerItems[currentTrackIndex]
      let currentPlaylistItem = playlist[currentTrackIndex]
//      let asset = currentItem.asset
    
      self.currentTitle = currentPlaylistItem.title ?? "Unknown title"
      print("Updated title to \(self.currentTitle)")
      
      print("Updating cover with \(currentPlaylistItem.coverURL)")
      if let image = currentPlaylistItem.coverURL, let imageURL = URL(string: image) {
        self.currentCover = imageURL
      } else {
        self.currentCover = nil
      }
      
      
//      asset.loadValuesAsynchronously(forKeys: ["commonMetadata"]) {
//          var title: String = "Unknown Title"
//          var coverImage: UIImage? = nil
//          
//          for metadataItem in asset.commonMetadata {
//              if metadataItem.commonKey?.rawValue == "title" {
//                  title = metadataItem.stringValue ?? "Unknown Title"
//              } else if metadataItem.commonKey?.rawValue == "artwork",
//                        let data = metadataItem.dataValue,
//                        let image = UIImage(data: data) {
//                  coverImage = image
//              }
//          }
//          
//          DispatchQueue.main.async {
//              self.currentTitle = currentPlaylistItem.title
//              self.currentCover = coverImage
//          }
//      }
  }
}
