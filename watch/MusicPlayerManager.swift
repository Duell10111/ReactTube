//
//  MusicPlayerManager.swift
//  watch
//
//  Created by Konstantin Späth on 13.06.24.
//

import Foundation
import AVFoundation
import SwiftUI
import MediaPlayer

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
      configutreRemoteCommand()
      setupNowPlaying()
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
          // .longFormAudio needed to play audio when screnn is off?
          try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, policy: .longFormAudio)
//          try AVAudioSession.sharedInstance().setActive(true)
      } catch {
          print("Failed to set up AVAudioSession: \(error)")
      }
    
      playerItems = playlist.compactMap { p in
        print("FileURL: \(p.fileURL)")
        if let localFile = p.fileURL {
          let uri = getDownloadDirectory().appending(path: localFile)
          print("Local uri: \(uri)")
          let item = AVPlayerItem(url: uri)
          print("Local version")
          // Set end for local files?
//          item.forwardPlaybackEndTime =
          return item
        } else if let sURL = p.streamURL, let uri = URL(string: sURL) {
          print("Remote uri: \(sURL)")
          let item = AVPlayerItem(url: uri)
          
          return item
        }
        return nil
      }
      if playerItems.isEmpty {
        print("Skipping setup of Queue for empty playlist")
        return
      }
    
      player = AVQueuePlayer(items: playerItems)

      NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: nil, queue: .main) { notification in
          self.nextTrack()
      }
    
      updateTrackInfo()
  }

  @objc func playMusic() {
      if player?.items().isEmpty ?? true {
        print("Skip play for empty playlist")
        return
      }
      do {
          try AVAudioSession.sharedInstance().setActive(true)
      } catch {
          print("Failed to start AVAudioSession: \(error)")
      }
      player?.play()
      isPlaying = true
      updateTrackInfo()
      updateNowPlaying()
  }

  @objc func pauseMusic() {
      if player?.items().isEmpty ?? true {
        print("Skip pause for empty playlist")
        return
      }
      
      do {
          try AVAudioSession.sharedInstance().setActive(false)
      } catch {
          print("Failed to start AVAudioSession: \(error)")
      }
      player?.pause()
      isPlaying = false
      updateTrackInfo()
      updateNowPlaying()
  }

  func nextTrack() {
      if player?.items().isEmpty ?? true {
        print("Skip next Track for empty playlist")
        return
      }
      
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
      if player?.items().isEmpty ?? true {
        print("Skip prev Track for empty playlist")
        return
      }
    
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
    
    var nowPlayingInfo = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [String : Any]()
    nowPlayingInfo[MPMediaItemPropertyTitle] = self.currentTitle
    
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
    print("Updated now playing info")
  }
  
  func setupNowPlaying() {
    var nowPlayingInfo = [String : Any]()
    nowPlayingInfo[MPMediaItemPropertyTitle] = "Test"

    if let image = UIImage(named: "Default_albumart") {
        nowPlayingInfo[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { size in
            return image
        }
    }
//    nowPlayingInfo[MPNowPlayingInfoPropertyIsLiveStream] = true
    
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
  }
  
  func updateNowPlaying() {
    var nowPlayingInfo = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [String : Any]()
    nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1 : 0
    
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
  }
  
  func configutreRemoteCommand() {
    let commandCenter = MPRemoteCommandCenter.shared()

    commandCenter.previousTrackCommand.isEnabled = false;
    commandCenter.nextTrackCommand.isEnabled = false
    
    commandCenter.skipBackwardCommand.isEnabled = false
    commandCenter.skipForwardCommand.isEnabled = false
    
    commandCenter.playCommand.isEnabled = true
    commandCenter.playCommand.addTarget {event in
      self.playMusic()
      return .success
    }
//    commandCenter.playCommand.addTarget(self, action: #selector(self.playMusic))
//    
    commandCenter.pauseCommand.isEnabled = true
//    commandCenter.pauseCommand.addTarget(self, action: #selector(self.pauseMusic))
    commandCenter.pauseCommand.addTarget {event in
      self.pauseMusic()
      return .success
    }
  }
}
