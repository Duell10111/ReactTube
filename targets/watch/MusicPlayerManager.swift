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
import Combine
import SwiftAudioEx

@Observable
class MusicPlayerManager {
    static let shared = MusicPlayerManager()

    var trackIndex = 0
    private var currentTrackIndex = 0

    private(set) var duration: TimeInterval = 0.0
    private(set) var currentTime: TimeInterval = 0.0

    var isPlaying: Bool = false
    var currentTitle: String = "Unknown Title"
    var currentCover: URL? = nil

    var isStalled: Bool = false

    private var player: QueuedAudioPlayer? = nil
    var playerPlaylistItems: [Video] = []
    private var playlist: [Video] = []

    // Utils
    private let queue = DispatchQueue(label: "music.player.queue")
    private let playlistManager = PlaylistManager()

    private init() {
//      configutreRemoteCommand()
//      setupNowPlaying()
    }

  func updatePlaylist(newPlaylist: [Video]) {
    // TODO: Check if playlist already present?
    self.playlistManager.setPlaylist(nil, videos: newPlaylist)

    // TODO: Put into setupPlayer?
    self.setupPlayer()
  }

  func updatePlaylist(playlist: Playlist, index: Int? = nil) {
    queue.async {
      self.playlistManager.setPlaylist(playlist)
      
      self.setupPlayer()
      
      if let index = index {
        self.trackIndex = index
        self.currentTrackIndex = index
        // TODO: Could not work if index changes when elements not available, maybe better map to id
        do {
          try self.player?.jumpToItem(atIndex: index)
        } catch {
          print("Error jumping to init index: \(error)")
        }
      }
    }
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



      if (playlistManager.videos?.isEmpty ?? true) {
        print("Skipping setup of Queue for empty playlist")
        return
      }

      let pItems = playlistManager.getFirstBatchOfAvailable()
    print("Setup Videos: \(pItems)")

      let (videoItems, playerItems) = unzip(pItems)
//      self.playerItems = playerItems
      self.playerPlaylistItems = videoItems

      player = QueuedAudioPlayer()
      do {
        try player?.add(items: playerItems, at: 0)
      } catch {
        print("Error adding items")
      }

      player?.remoteCommands = [
        .play,
        .pause,
        .previous,
        .next
      ]

      player?.event.currentItem.addListener(self, handleAudioPlayerCurrentItemChange)

    player?.event.fail.addListener(self, { data in
      print("Error occured in player \(data)")
    })

    player?.event.stateChange.addListener(self, { state in
      print("State changed \(state)")
    })


    player?.remoteCommandController.handlePlayCommand = { [weak self] _ in
      self?.player?.play()
      return MPRemoteCommandHandlerStatus.success
    }

    player?.remoteCommandController.handlePauseCommand = { [weak self] _ in
      self?.player?.pause()
      return MPRemoteCommandHandlerStatus.success
    }

  }

  private func deinitPlayer() {
    player?.pause()
    isPlaying = false
    isStalled = false
    currentTrackIndex = 0
  }

  // Event Listeners

  func handleAudioPlayerCurrentItemChange(
          item: AudioItem?,
          index: Int?,
          lastItem: AudioItem?,
          lastIndex: Int?,
          lastPosition: Double?
  ) {
    print("Current item change: \(item?.getTitle())")
    currentTitle = item?.getTitle() ?? "Unknown Title"
    if let i = index {
      currentTrackIndex = i
      trackIndex = i
    }
  }

  @objc func playMusic() {
      if player?.items.isEmpty ?? true {
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
              print("Playeritem: \(player?.currentItem?.getSourceUrl())")
              isPlaying = true
              isStalled = false

              if let curItem = player?.currentItem, let title = curItem.getTitle(){
                currentTitle = title
              }
//              updateTrackInfo()
//              updateNowPlaying()
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
              
              if let curItem = player?.currentItem, let title = curItem.getTitle(){
                currentTitle = title
              }
//              updateTrackInfo()
//              updateNowPlaying()
            }
          } else {
            print("Failed to start AVAudioSession: \(error?.localizedDescription ?? "nil")")
          }
        }
      #endif
      print("Player state: \(player?.playerState)")
  }

  @objc func pauseMusic() {
      do {
          try AVAudioSession.sharedInstance().setActive(false)
      } catch {
          print("Failed to start AVAudioSession: \(error)")
      }
      print("Player state: \(player?.playerState)")
      player?.pause()
      isPlaying = false
  }

  func nextTrack() {
      // TODO: Add check if new items are available

      player?.next()
  }

  // TODO: Fix this to make it more stable!!!
  func previousTrack() {
      player?.previous()
  }
  
  func jumpToIndex(_ index: Int) {
    do {
      try player?.jumpToItem(atIndex: index)
    } catch {
      print("Failed to jump to index: \(error)")
    }
  }

  // TODO: Add move playlist option
  func movePlaylist(from source: IndexSet, to destination: Int) {

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
