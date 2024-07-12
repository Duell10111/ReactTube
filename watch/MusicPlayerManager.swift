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
    
    @Published var trackIndex = 0
    private var currentTrackIndex = 0
  
    @Published private(set) var duration: TimeInterval = 0.0
    @Published private(set) var currentTime: TimeInterval = 0.0

    @Published var isPlaying: Bool = false
    @Published var currentTitle: String = "Unknown Title"
    @Published var currentCover: URL? = nil
  
    @Published var isStalled: Bool = false
    
    private var player: AVQueuePlayer?
    private var timeObserver: Any?
    private var playerItems: [AVPlayerItem] = []
    @Published var playerPlaylistItems: [Video] = []
    private var playlist: [Video] = []
    
    private init() {
      configutreRemoteCommand()
      setupNowPlaying()
    }
  
  func updatePlaylist(newPlaylist: [Video]) {
    // TODO: Check if playlist already present?
    playlist = newPlaylist
    
    // TODO: Put into setupPlayer?
    setupPlayer()
  }
    
  private func setupPlayer() {
      if player != nil {
        deinitPlayer()
      }
      // Set up AVAudioSession for background audio playback
      do {
          // .longFormAudio needed to play audio when screnn is off?
          try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, policy: .longFormAudio, options: [])
      } catch {
          print("Failed to set up AVAudioSession: \(error)")
      }
    
      let pItems = playlist.compactMap { p in
        print("FileURL: \(p.fileURL)")
        if let localFile = p.fileURL {
          let uri = getDownloadDirectory().appending(path: localFile)
          print("Local uri: \(uri)")
          let item = AVPlayerItem(url: uri)
          print("Local version")
          // Set end for local files?
//          item.forwardPlaybackEndTime =
          return (p, item)
        } else if let sURL = p.streamURL, let uri = URL(string: sURL) {
          print("Remote uri: \(sURL)")
          let item = AVPlayerItem(url: uri)
          
          return (p, item)
        }
        return nil
      }
      
    
      if pItems.isEmpty {
        print("Skipping setup of Queue for empty playlist")
        return
      }
    
      let (videoItems, playerItems) = unzip(pItems)
      self.playerItems = playerItems
      self.playerPlaylistItems = videoItems
    
      player = AVQueuePlayer(items: playerItems)
    
      // Add time observer
      addPeriodicTimeObserver()
    
      // Setup Notifications

      NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: nil, queue: .main) { notification in
        // Not needed with queue player?
//          self.nextTrack()
          DispatchQueue.main.async {
            self.currentTrackIndex += 1
            self.updateTrackInfo()
          }
      }
    
      NotificationCenter.default.addObserver(forName: AVPlayerItem.failedToPlayToEndTimeNotification, object: nil, queue: .main) { notification in
        print("Failed to play to End Time: \(notification.debugDescription)")
      }
    
      NotificationCenter.default.addObserver(forName: AVPlayerItem.playbackStalledNotification, object: nil, queue: .main) { notification in
        print("Playback stalled: \(notification.debugDescription)")
        if let playerItem = notification.object as? AVPlayerItem {
          DispatchQueue.main.async {
            self.isStalled = true
          }
        }
      }
    
      updateTrackInfo()
  }
  
  private func deinitPlayer() {
    player?.pause()
    isPlaying = false
    isStalled = false
    currentTrackIndex = 0
    removePeriodicTimeObserver()
  }

  @objc func playMusic() {
      if playerItems.isEmpty {
        print("Skip play for empty playlist")
        return
      }
      // Set up AVAudioSession for background audio playback
      do {
          // .longFormAudio needed to play audio when screnn is off?
          try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, policy: .longFormAudio, options: [])
      } catch {
          print("Failed to set up AVAudioSession: \(error)")
      }
      #if targetEnvironment(simulator)
          do {
              try AVAudioSession.sharedInstance().setActive(true)
              player?.play()
              isPlaying = true
              isStalled = false
              updateTrackInfo()
              updateNowPlaying()
          } catch {
              print("Failed to set up AVAudioSession: \(error)")
          }
      #else
        AVAudioSession.sharedInstance().activate { [self] success, error in
          if success {
            DispatchQueue.main.async { [self] in
              player?.play()
              isPlaying = true
              isStalled = false
              updateTrackInfo()
              updateNowPlaying()
            }
          } else {
            print("Failed to start AVAudioSession: \(error?.localizedDescription ?? "nil")")
          }
        }
      #endif
  }

  @objc func pauseMusic() {
//      if player?.items().isEmpty ?? true {
//        print("Skip pause for empty playlist")
//        return
//      }
      
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
      
      print("Prev CurrentTrackIndex: \(currentTrackIndex)")
      self.currentTrackIndex = ((currentTrackIndex + 1) % playerItems.count)
      print("Track: \(((currentTrackIndex + 1) % playerItems.count))")
      player?.advanceToNextItem()
    
      if player?.items().isEmpty ?? false {
        print("PlayerItems: \(playerItems.count)")
        print("CurrentTrackIndex: \(currentTrackIndex)")
        pauseMusic()
        for index in playerItems.indices {
          let prev = index == 0 ? nil : playerItems[index - 1]
          let current = playerItems[index]
          current.seek(to: CMTime(value: 0, timescale: 1))
          player?.insert(current, after: prev)
        }
      }
//      if currentTrackIndex < playerItems.count - 1 {
//          let nextItem = playerItems[currentTrackIndex]
//          player?.insert(nextItem, after: player?.currentItem)
//      }
//      if isPlaying {
//          player?.play()
//      }
      updateTrackInfo()
  }

  // TODO: Fix this to make it more stable!!!
  func previousTrack() {
      if player?.items().isEmpty ?? true {
        print("Skip prev Track for empty playlist")
        return
      }
    
      print("Current Track: \(currentTrackIndex)")
      currentTrackIndex = (currentTrackIndex - 1 + playerItems.count) % playerItems.count
      print("Prev Track: \(currentTrackIndex)")
      let previousItem = playerItems[currentTrackIndex]
      previousItem.seek(to: CMTime(value: 0, timescale: 1))
      player?.pause()
      player?.removeAllItems()
      player?.insert(previousItem, after: nil)
      for i in (currentTrackIndex+1) ..< playerItems.count {
        player?.insert(playerItems[i], after: nil)
      }
      if isPlaying {
          player?.play()
      }
      updateTrackInfo()
  }

  // TODO: Not used at all?
  func playCurrentTrack() {
      guard currentTrackIndex < playerItems.count else { return }
      let currentItem = playerItems[currentTrackIndex]
      player?.replaceCurrentItem(with: currentItem)
      if isPlaying {
          player?.play()
      }
      updateTrackInfo()
  }
  
  // TODO: Add move playlist option
  func movePlaylist(from source: IndexSet, to destination: Int) {
    
  }
  
  func updateTrackInfo() {
      print("Updating track info for index \(currentTrackIndex)")
      //let currentItem = playerItems[currentTrackIndex]
      let currentPlaylistItem = playerPlaylistItems[currentTrackIndex]
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
    
    // TODO: Update audio progress?
    
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
  }
  
  func configutreRemoteCommand() {
    let commandCenter = MPRemoteCommandCenter.shared()

    commandCenter.previousTrackCommand.isEnabled = true
    commandCenter.previousTrackCommand.addTarget { event in
      self.nextTrack()
      return .success
    }
    commandCenter.nextTrackCommand.isEnabled = true
    commandCenter.nextTrackCommand.addTarget { event in
      self.previousTrack()
      return .success
    }
    
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
  
  /// Adds an observer of the player timing.
  private func addPeriodicTimeObserver() {
      // Create a 0.5 second interval time.
      let interval = CMTime(value: 1, timescale: 2)
      if let player = player {
        timeObserver = player.addPeriodicTimeObserver(forInterval: interval,
                                                      queue: .main) { [weak self] time in
            guard let self else { return }
            // Update the published currentTime and duration values.
            currentTime = time.seconds
            duration = player.currentItem?.duration.seconds ?? 0.0
          
            if isStalled {
              isStalled = false
            }
        }
      }
  }
  
  private func removePeriodicTimeObserver() {
      guard let timeObserver else { return }
    if let player = player {
      player.removeTimeObserver(timeObserver)
      self.timeObserver = nil
    }
  }
}


func unzip<K, V>(_ array: [(key: K, value: V)]) -> ([K], [V]) {
    var keys = [K]()
    var values = [V]()

    keys.reserveCapacity(array.count)
    values.reserveCapacity(array.count)

    array.forEach { key, value in
        keys.append(key)
        values.append(value)
    }

    return (keys, values)
}
