//
//  MusicPlayerManager.swift
//  watch
//
//  Created by Konstantin Späth on 13.06.24.
//

import Foundation
import AVFoundation
import SwiftUI
import SwiftData
import MediaPlayer
import Combine
import SwiftAudioEx

@Observable
class MusicPlayerManager {
    static let shared = MusicPlayerManager()

  var type: PlayerType = .local

    var volume: Double = 0.0
    var volumeObserver: NSKeyValueObservation?

    var trackIndex = 0
    private var currentTrackIndex = 0

    private(set) var duration: TimeInterval = 0.0
    private(set) var currentTime: TimeInterval = 0.0

    var isPlaying: Bool = false
    var currentTitle: String = "Unknown Title"
    var currentArtist: String? = nil
    var currentCover: UIImage? = nil

    var isStalled: Bool = false

    private var player: QueuedAudioPlayer? = nil
    var playerPlaylistItems: [Video] = []
    private var playlist: [Video] = []

    let preferences = PlayerPreferences.shared

    /// Playlist the current queue was built from, used for now playing info and
    /// for the resume state.
    private var currentPlaylistID: String? = nil
    private var currentPlaylistTitle: String? = nil

    /// Position that still has to be restored once the player is ready.
    private var pendingSeek: TimeInterval? = nil
    private var lastPersistedPosition: TimeInterval = 0

    // Utils
    private let queue = DispatchQueue(label: "music.player.queue")
    private let playlistManager = PlaylistManager()

    private init() {
//      configutreRemoteCommand()
//      setupNowPlaying()
    }

  /// The title the player is currently on, as far as the database knows it.
  var currentVideo: Video? {
    guard playerPlaylistItems.indices.contains(currentTrackIndex) else { return nil }
    return playerPlaylistItems[currentTrackIndex]
  }

  /// Seeking needs a local player with a known duration. Titles played on the
  /// iPhone are controlled remotely and have no position on the watch.
  var isSeekable: Bool {
    type == .local && player != nil && duration > 0
  }

  func updatePlaylist(newPlaylist: [Video]) {
    self.type = .local
    // TODO: Check if playlist already present?
    self.playlistManager.setPlaylist(nil, videos: newPlaylist)
    self.currentPlaylistID = nil
    self.currentPlaylistTitle = nil

    // TODO: Put into setupPlayer?
    self.setupPlayer()

    // Play music after setup
    self.playMusic()
  }

  /// - Parameter shuffle: `nil` uses the persisted preference. Starting at a
  ///   specific index always plays in order from there, because jumping into a
  ///   shuffled queue would land somewhere else than the title that was tapped.
  func updatePlaylist(playlist: Playlist, index: Int? = nil, shuffle: Bool? = nil) {
    self.type = .local
    let shouldShuffle = shuffle ?? (index == nil && preferences.shuffleEnabled)
    let playlistID = playlist.id
    let playlistTitle = playlist.title
    queue.async {
      self.playlistManager.setPlaylist(playlist, shuffle: shouldShuffle)
      self.currentPlaylistID = playlistID
      self.currentPlaylistTitle = playlistTitle

      self.setupPlayer()

      // Disable jump on shuffle play
      if let index = index, shouldShuffle == false {
        self.trackIndex = index
        self.currentTrackIndex = index
        // TODO: Could not work if index changes when elements not available, maybe better map to id
        do {
          try self.player?.jumpToItem(atIndex: index)
        } catch {
          WatchLog.shared.warning("Player", "Could not jump to start index \(index): \(error.localizedDescription)")
        }
      }

      // Start playing after setup
      self.playMusic()
    }
  }

  /// Continues the last title where it stopped.
  @MainActor
  func resumePlayback(_ state: ResumeState) {
    let context = DataController.shared.container.mainContext

    if let playlistID = state.playlistID {
      let descriptor = FetchDescriptor<Playlist>(predicate: #Predicate { $0.id == playlistID })
      if let playlist = try? context.fetch(descriptor).first {
        pendingSeek = state.position
        updatePlaylist(playlist: playlist, index: state.index, shuffle: false)
        return
      }
    }

    let videoID = state.videoID
    let descriptor = FetchDescriptor<Video>(predicate: #Predicate { $0.id == videoID })
    guard let video = try? context.fetch(descriptor).first else {
      WatchLog.shared.warning("Player", "Cannot continue \(state.title): title is no longer in the database")
      preferences.clearResumeState()
      return
    }

    pendingSeek = state.position
    updatePlaylist(newPlaylist: [video])
  }

  func updateVolume(volume: Double) {
    player?.volume = Float(volume)
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
        WatchLog.shared.warning("Player", "Queue setup skipped: playlist is empty")
        return
      }

      let pItems = playlistManager.getFirstBatchOfAvailable()
      print("Setup Videos: \(pItems)")

      let (videoItems, playerItems) = unzip(pItems)
//      self.playerItems = playerItems
      self.playerPlaylistItems = videoItems

      player = QueuedAudioPlayer()
      player?.repeatMode = preferences.repeatMode.audioPlayerMode
      do {
        try player?.add(items: playerItems, at: 0)
      } catch {
        WatchLog.shared.error("Player", "Could not add titles to the queue: \(error.localizedDescription)")
      }

      player?.remoteCommands = [
        .play,
        .pause,
        .previous,
        .next
      ]

      player?.event.currentItem.addListener(self, handleAudioPlayerCurrentItemChange)

    player?.event.fail.addListener(self, { data in
      WatchLog.shared.error("Player", "Playback failed: \(data?.localizedDescription ?? "unknown error")")
    })

    player?.event.stateChange.addListener(self, { state in
      print("State changed \(state)")
      self.onMain {
        if state == .playing {
          self.isPlaying = true
        } else if state == .paused || state == .ended {
          self.isPlaying = false
        }

        if state == .ready || state == .playing {
          self.applyPendingSeek()
        }

        NowPlayingCenter.applyPlaybackValues(player: self.player, currentTime: self.currentTime, isPlaying: self.isPlaying)
      }
    })

    // Position and duration are the basis for the progress display and for the
    // resume state, so they have to be written along instead of staying at 0.
    player?.event.secondElapse.addListener(self, { seconds in
      self.onMain {
        self.currentTime = seconds
        if self.duration <= 0 { self.refreshDuration() }
        self.persistResumePositionIfNeeded(seconds)
      }
    })

    player?.event.updateDuration.addListener(self, { duration in
      self.onMain {
        // The database duration wins: a cropped stream reports the length of the
        // full asset here.
        if let millis = self.currentVideo?.durationMillis, millis > 0 {
          self.duration = TimeInterval(millis) / 1000.0
        } else if duration > 0 {
          self.duration = duration
        }
      }
    })

    player?.event.seek.addListener(self, { data in
      self.onMain {
        self.currentTime = data.seconds
      }
    })


    player?.remoteCommandController.handlePlayCommand = { [weak self] _ in
      self?.player?.play()
      return MPRemoteCommandHandlerStatus.success
    }

    player?.remoteCommandController.handlePauseCommand = { [weak self] _ in
      self?.player?.pause()
      return MPRemoteCommandHandlerStatus.success
    }

    self.volume = Double(AVAudioSession.sharedInstance().outputVolume)

    volumeObserver = AVAudioSession.sharedInstance().observe(\.outputVolume) { session, _ in
          print("Output volume: \(session.outputVolume)")
          self.onMain {
            self.volume = Double(session.outputVolume)
          }
    }

  }

  private func deinitPlayer() {
    player?.pause()
    storeResumeState()
    isPlaying = false
    isStalled = false
    currentTrackIndex = 0
    currentTime = 0
    duration = 0
    lastPersistedPosition = 0
    volumeObserver?.invalidate()
  }

  // MARK: - Position

  func seek(to time: TimeInterval) {
    guard type == .local, let player else { return }
    let upperBound = duration > 0 ? duration : time
    let clamped = min(max(time, 0), upperBound)
    player.seek(to: clamped)
    onMain {
      self.currentTime = clamped
      self.persistResumePosition(clamped)
    }
  }

  func skip(by offset: TimeInterval) {
    seek(to: currentTime + offset)
  }

  /// Applies the position of a resumed title once the item is loaded — seeking
  /// before that is dropped by the player.
  private func applyPendingSeek() {
    guard let pendingSeek, let player else { return }
    self.pendingSeek = nil
    guard pendingSeek > 1 else { return }
    player.seek(to: pendingSeek)
    currentTime = pendingSeek
  }

  private func refreshDuration() {
    if let millis = currentVideo?.durationMillis, millis > 0 {
      duration = TimeInterval(millis) / 1000.0
    } else if let playerDuration = player?.duration, playerDuration > 0 {
      duration = playerDuration
    }
  }

  // MARK: - Repeat

  /// Applies the persisted repeat mode to the running player.
  func applyRepeatMode() {
    player?.repeatMode = preferences.repeatMode.audioPlayerMode
  }

  func cycleRepeatMode() {
    preferences.setRepeatMode(preferences.repeatMode.next)
    applyRepeatMode()
  }

  // MARK: - Resume state

  private func storeResumeState() {
    guard type == .local, let video = currentVideo else { return }
    preferences.storeResumeState(
      ResumeState(
        videoID: video.id,
        title: video.title ?? "Unknown Title",
        artist: video.artist,
        playlistID: currentPlaylistID,
        playlistTitle: currentPlaylistTitle,
        index: currentTrackIndex,
        position: currentTime,
        updatedAt: Date()
      )
    )
    lastPersistedPosition = currentTime
  }

  private func persistResumePosition(_ seconds: TimeInterval) {
    lastPersistedPosition = seconds
    if preferences.resumeState?.videoID == currentVideo?.id {
      preferences.updateResumePosition(seconds)
    } else {
      storeResumeState()
    }
  }

  /// Storing the position on every elapsed second would write to disk once per
  /// second; a coarse checkpoint is enough to continue where playback stopped.
  private func persistResumePositionIfNeeded(_ seconds: TimeInterval) {
    guard abs(seconds - lastPersistedPosition) >= 5 else { return }
    persistResumePosition(seconds)
  }

  private func onMain(_ block: @escaping () -> Void) {
    if Thread.isMainThread {
      block()
    } else {
      DispatchQueue.main.async(execute: block)
    }
  }

  // Event Listeners

  func handleAudioPlayerCurrentItemChange(
          item: AudioItem?,
          index: Int?,
          lastItem: AudioItem?,
          lastIndex: Int?,
          lastPosition: Double?
  ) {
    print("Current item change: \(item?.getTitle() ?? "nil")")
    onMain {
      self.currentTitle = item?.getTitle() ?? "Unknown Title"
      self.currentArtist = item?.getArtist()
      if let i = index {
        self.currentTrackIndex = i
        self.trackIndex = i
      }
      // A resumed title starts at its stored position, so the position must not
      // be reported as 0 before the seek has been applied.
      self.currentTime = self.pendingSeek ?? 0
      self.duration = 0
      self.lastPersistedPosition = self.currentTime
      self.refreshDuration()
      self.updateNowPlayingMetadata()
      self.storeResumeState()
    }
    item?.getArtwork({ audioImage in
      self.onMain {
        self.currentCover = audioImage
      }
    })
  }

  private func updateNowPlayingMetadata() {
    NowPlayingCenter.applyMetadata(
      player: player,
      video: currentVideo,
      albumTitle: currentPlaylistTitle,
      queueIndex: currentTrackIndex,
      queueCount: player?.items.count
    )
  }

  /// Mirrors the playback state the iPhone reports. The watch does not play the
  /// audio in that case, so it also must not claim the now playing slot.
  func applyPhonePlaybackState(title: String?, isPlaying: Bool?) {
    onMain {
      let wasLocal = self.type == .local
      self.type = .phone
      if wasLocal {
        NowPlayingCenter.clear(player: self.player)
        self.currentTime = 0
        self.duration = 0
      }
      if let title {
        self.currentTitle = title
        // Reset artist as not set by api
        self.currentArtist = nil
      } else {
        WatchLog.shared.warning("Phone", "Playback state without a title received")
      }
      if let isPlaying {
        self.isPlaying = isPlaying
      } else {
        WatchLog.shared.warning("Phone", "Playback state without a play flag received")
      }
    }
  }

  @objc func playMusic() {
      if type == .phone {
        pausePlayOnPhone()
        return
      }

      if player?.items.isEmpty ?? true {
        WatchLog.shared.warning("Player", "Play skipped: the queue is empty")
        return
      }
      // Set up AVAudioSession for background audio playback
      do {
          // .longFormAudio needed to play audio when screnn is off
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
                currentArtist = curItem.getArtist()
                curItem.getArtwork({ audioImage in
                  self.currentCover = audioImage
                })
              }
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
                currentArtist = curItem.getArtist()
              }
            }
          } else {
            print("Failed to start AVAudioSession: \(error?.localizedDescription ?? "nil")")
          }
        }
      #endif
      print("Player state: \(player?.playerState)")
  }

  @objc func pauseMusic() {
      if type == .phone {
        pausePlayOnPhone()
        return
      }

      do {
          try AVAudioSession.sharedInstance().setActive(false)
      } catch {
          print("Failed to start AVAudioSession: \(error)")
      }
      print("Player state: \(player?.playerState)")
      player?.pause()
      isPlaying = false
      storeResumeState()
      NowPlayingCenter.applyPlaybackValues(player: player, currentTime: currentTime, isPlaying: false)
  }

  func nextTrack() {
      // TODO: Add check if new items are available
      if type == .phone {
        nextTitleOnPhone()
      } else {
        player?.next()
      }
  }

  // TODO: Fix this to make it more stable!!!
  func previousTrack() {
      if type == .phone {
        previousTitleOnPhone()
      } else {
        player?.previous()
      }
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


enum PlayerType {
  case local
  case phone
}

extension PlayerRepeatMode {
  var audioPlayerMode: RepeatMode {
    switch self {
    case .off: return .off
    case .queue: return .queue
    case .track: return .track
    }
  }
}
