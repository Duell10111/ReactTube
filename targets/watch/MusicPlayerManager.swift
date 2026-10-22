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

@MainActor
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
    private struct PendingSeek {
      let videoID: String
      let position: TimeInterval
    }
    private var pendingSeek: PendingSeek? = nil
    private var lastPersistedPosition: TimeInterval = 0

    // Utils
    private var sessionGeneration = 0
    private var playbackRevision = 0
    private var wantsPlayback = false
    private var requestedStartVideoID: String?
    private var waitingForVideoID: String?
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

  func updatePlaylist(newPlaylist: [Video], resume: ResumeState? = nil) {
    deinitPlayer()
    pendingSeek = resume.map { PendingSeek(videoID: $0.videoID, position: $0.position) }
    self.type = .local
    requestedStartVideoID = nil
    waitingForVideoID = nil
    // TODO: Check if playlist already present?
    self.playlistManager.setPlaylist(nil, videos: newPlaylist)
    self.currentPlaylistID = nil
    self.currentPlaylistTitle = nil

    // TODO: Put into setupPlayer?
    let didSetup = self.setupPlayer()
    wantsPlayback = playlistManager.hasTitles
    if didSetup { self.playMusic() }
  }

  /// - Parameter startVideoID: Title to start with. Starting at a specific
  ///   title always plays in order from there, because jumping into a shuffled
  ///   queue would land somewhere else than the title that was tapped.
  /// - Parameter shuffle: `nil` uses the persisted preference.
  func updatePlaylist(playlist: Playlist, startVideoID: String? = nil, shuffle: Bool? = nil, resume: ResumeState? = nil) {
    deinitPlayer()
    pendingSeek = resume.map { PendingSeek(videoID: $0.videoID, position: $0.position) }
    self.type = .local
    requestedStartVideoID = startVideoID
    waitingForVideoID = nil
    let shouldShuffle = shuffle ?? (startVideoID == nil && preferences.shuffleEnabled)
    let playlistID = playlist.id
    let playlistTitle = playlist.title
    self.playlistManager.setPlaylist(playlist, shuffle: shouldShuffle)
    let orderedVideoIDs = self.playlistManager.orderedVideoIDs
    self.currentPlaylistID = playlistID
    self.currentPlaylistTitle = playlistTitle

    let didSetup = self.setupPlayer()

    // Disable jump on shuffle play
    if let startVideoID, shouldShuffle == false,
       let index = self.queueIndex(startingAt: startVideoID, orderedVideoIDs: orderedVideoIDs) {
      self.trackIndex = index
      self.currentTrackIndex = index
      do {
        try self.player?.jumpToItem(atIndex: index)
      } catch {
        WatchLog.shared.warning("Player", "Could not jump to start index \(index): \(error.localizedDescription)")
      }
    }

    wantsPlayback = playlistManager.hasTitles
    if didSetup { self.playMusic() }
  }

  /// Extends only the current queue, in the order selected for this session.
  func videoMetadataUpdated(id: String) {
    guard type == .local, playlistManager.contains(id: id) else { return }
    let available = playlistManager.checkForNewVideos()
    let orderedIDs = playlistManager.orderedVideoIDs
    if player == nil { setupPlayer() }
    guard let player else { return }
    for (video, item) in available where !playerPlaylistItems.contains(where: { $0.id == video.id }) {
      let position = orderedIDs.firstIndex(of: video.id) ?? orderedIDs.count
      let index = playerPlaylistItems.firstIndex { existing in
        (orderedIDs.firstIndex(of: existing.id) ?? orderedIDs.count) > position
      } ?? playerPlaylistItems.count
      do {
        try player.add(items: [item], at: index)
        playerPlaylistItems.insert(video, at: index)
      } catch {
        WatchLog.shared.error("Player", "Could not extend queue: \(error.localizedDescription)")
      }
    }
    currentTrackIndex = max(0, player.currentIndex)
    trackIndex = currentTrackIndex
    if waitingForVideoID == id, let replacement = available.first(where: { $0.0.id == id }) {
      waitingForVideoID = nil
      player.load(item: replacement.1, playWhenReady: false)
    }
    if let requestedStartVideoID, let index = playerPlaylistItems.firstIndex(where: { $0.id == requestedStartVideoID }), !isPlaying {
      self.requestedStartVideoID = nil
      jumpToIndex(index)
    }
    updateNowPlayingMetadata()
    if wantsPlayback && !isPlaying { playMusic() }
  }

  /// Drops model references before library objects are deleted. Deleting the
  /// current playlist, or every remaining title, stops playback; otherwise only
  /// the affected titles leave the queue and playback continues.
  func prepareForLibraryDeletion(ids: Set<String>, playlistID: String? = nil) {
    if let playlistID, currentPlaylistID == playlistID {
      stopForLibraryDeletion(ids: ids)
      return
    }
    let queuedIDs = Set(playlistManager.orderedVideoIDs).union(playerPlaylistItems.map(\.id))
    guard !queuedIDs.isDisjoint(with: ids) || playlistManager.videos?.contains(where: { ids.contains($0.id) }) == true else { return }
    guard !queuedIDs.isSubset(of: ids) else {
      stopForLibraryDeletion(ids: ids)
      return
    }
    playlistManager.remove(ids: ids)
    if let requestedStartVideoID, ids.contains(requestedStartVideoID) { self.requestedStartVideoID = nil }
    if let pendingSeek, ids.contains(pendingSeek.videoID) { self.pendingSeek = nil }
    guard removeFromQueue(ids: ids) else {
      stopForLibraryDeletion(ids: ids)
      return
    }
    if let resume = preferences.resumeState, ids.contains(resume.videoID) { preferences.clearResumeState() }
  }

  /// A freed download keeps its model, but its queued item still points to the
  /// local file. Removes the item before the file is deleted.
  func prepareForDownloadRemoval(ids: Set<String>) {
    guard player != nil, playerPlaylistItems.contains(where: { ids.contains($0.id) }) else { return }
    if !removeFromQueue(ids: ids) { stopForLibraryDeletion(ids: []) }
  }

  /// Re-adds freed titles once their download state is reset, streaming them
  /// when the stored link is still valid and requesting a new one otherwise.
  func downloadRemoved(ids: Set<String>) {
    for id in ids where playlistManager.contains(id: id) {
      if let video = playlistManager.videos?.first(where: { $0.id == id }), playlistManager.isPlayable(video) {
        videoMetadataUpdated(id: id)
      } else {
        requestVideo(id: id)
      }
    }
  }

  /// Removes titles from the running queue while playback continues with the
  /// next remaining title. Returns false when no queued title would remain.
  private func removeFromQueue(ids: Set<String>) -> Bool {
    guard let player else { return true }
    guard playerPlaylistItems.contains(where: { !ids.contains($0.id) }) else { return false }
    let current = player.currentIndex
    let removesCurrent = currentVideo.map { ids.contains($0.id) } ?? false
    let hasLaterTitle = playerPlaylistItems.indices.contains { $0 > current && !ids.contains(playerPlaylistItems[$0].id) }
    if let waitingForVideoID, ids.contains(waitingForVideoID) {
      self.waitingForVideoID = nil
      isStalled = false
    }
    for index in playerPlaylistItems.indices.reversed() where ids.contains(playerPlaylistItems[index].id) {
      do {
        try player.removeItem(at: index)
        playerPlaylistItems.remove(at: index)
      } catch {
        WatchLog.shared.error("Player", "Could not remove a title from the queue: \(error.localizedDescription)")
        return false
      }
    }
    currentTrackIndex = max(0, player.currentIndex)
    trackIndex = currentTrackIndex
    // The next title starts from the beginning; the removed title's position must not carry over.
    if removesCurrent { currentTime = 0 }
    // Removing the last title wraps the queue around to its start; stop there
    // as if the queue had finished instead of playing it again.
    if removesCurrent && !hasLaterTitle { pauseMusic() }
    updateNowPlayingMetadata()
    return true
  }

  private func stopForLibraryDeletion(ids: Set<String>) {
    wantsPlayback = false
    deinitPlayer()
    player?.clear()
    player = nil
    playerPlaylistItems.removeAll()
    playlistManager.setPlaylist(nil, videos: [])
    pendingSeek = nil
    requestedStartVideoID = nil
    waitingForVideoID = nil
    currentPlaylistID = nil
    currentPlaylistTitle = nil
    if let resume = preferences.resumeState, ids.contains(resume.videoID) { preferences.clearResumeState() }
  }

  func videoMetadataFailed(id: String) {
    guard waitingForVideoID == id || (playerPlaylistItems.isEmpty && playlistManager.contains(id: id)) else { return }
    isPlaying = false
    isStalled = true
    WatchLog.shared.warning("Player", "Stream metadata unavailable for \(id); retry playback after reconnecting")
  }

  private func validateCurrentStream() -> Bool {
    guard let video = currentVideo, !playlistManager.isPlayable(video) else { return true }
    waitingForVideoID = video.id
    playbackRevision += 1
    player?.pause()
    isPlaying = false
    isStalled = true
    requestVideo(id: video.id)
    return false
  }

  /// Continues the last title where it stopped.
  @MainActor
  func resumePlayback(_ state: ResumeState) {
    guard let context = DataController.shared.container?.mainContext else { return }

    if let playlistID = state.playlistID {
      let descriptor = FetchDescriptor<Playlist>(predicate: #Predicate { $0.id == playlistID })
      if let playlist = try? context.fetch(descriptor).first {
        updatePlaylist(playlist: playlist, startVideoID: state.videoID, shuffle: false, resume: state)
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

    updatePlaylist(newPlaylist: [video], resume: state)
  }

  /// Queue position of a title. The queue only holds playable titles, so its
  /// indices differ from the playlist order whenever a title is not downloaded
  /// and its stream expired. Such a title is refetched in the background; until
  /// then playback starts at the next playable title in playlist order.
  private func queueIndex(startingAt videoID: String, orderedVideoIDs: [String]) -> Int? {
    let queuedIDs = playerPlaylistItems.map(\.id)
    if let index = queuedIDs.firstIndex(of: videoID) {
      return index
    }
    guard let position = orderedVideoIDs.firstIndex(of: videoID) else {
      WatchLog.shared.warning("Player", "Start title \(videoID) is not part of the playlist")
      return nil
    }
    let followingIDs = orderedVideoIDs[(position + 1)...] + orderedVideoIDs[..<position]
    for id in followingIDs {
      if let index = queuedIDs.firstIndex(of: id) {
        WatchLog.shared.warning("Player", "Start title \(videoID) is not playable yet, starting at the next available title")
        return index
      }
    }
    WatchLog.shared.warning("Player", "Start title \(videoID) is not playable and no other title is available")
    return nil
  }

  @discardableResult
  private func setupPlayer() -> Bool {
      sessionGeneration += 1
      playbackRevision += 1
      let generation = sessionGeneration
      // Set up AVAudioSession for background audio playback
      do {
          // .longFormAudio needed to play audio when screnn is off?
          try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, policy: .longFormAudio, options: [])
      } catch {
          print("Failed to set up AVAudioSession: \(error)")
      }



      if !playlistManager.hasTitles {
        WatchLog.shared.warning("Player", "Queue setup skipped: playlist is empty")
        return false
      }

      let pItems = playlistManager.getFirstBatchOfAvailable()
      print("Setup Videos: \(pItems)")

      guard !pItems.isEmpty else { return false }
      let (videoItems, playerItems) = unzip(pItems)
//      self.playerItems = playerItems
      self.playerPlaylistItems = videoItems

      player = QueuedAudioPlayer()
      player?.repeatMode = preferences.repeatMode.audioPlayerMode

      player?.remoteCommands = [
        .play,
        .pause,
        .previous,
        .next
      ]

      player?.event.currentItem.addListener(self) { [weak self] data in
        self?.onMain(generation: generation) {
          self?.handleAudioPlayerCurrentItemChange(item: data.item, index: data.index, lastItem: data.lastItem, lastIndex: data.lastIndex, lastPosition: data.lastPosition)
        }
      }

    player?.event.fail.addListener(self, { data in
      WatchLog.shared.error("Player", "Playback failed: \(data?.localizedDescription ?? "unknown error")")
    })

    player?.event.stateChange.addListener(self, { state in
      print("State changed \(state)")
      self.onMain(generation: generation) {
        if state == .playing {
          guard self.wantsPlayback, self.waitingForVideoID == nil else { self.player?.pause(); return }
          self.isPlaying = true
        } else if state == .paused || state == .ended {
          self.isPlaying = false
        }
        // A finished queue no longer counts as local playback, so the iPhone
        // state is mirrored again and late metadata does not restart it.
        if state == .ended { self.wantsPlayback = false }

        if state == .ready || state == .playing {
          self.applyPendingSeek()
        }

        NowPlayingCenter.applyPlaybackValues(player: self.player, currentTime: self.currentTime, isPlaying: self.isPlaying)
      }
    })

    // Position and duration are the basis for the progress display and for the
    // resume state, so they have to be written along instead of staying at 0.
    player?.event.secondElapse.addListener(self, { seconds in
      self.onMain(generation: generation) {
        self.currentTime = seconds
        if self.duration <= 0 { self.refreshDuration() }
        self.persistResumePositionIfNeeded(seconds)
      }
    })

    player?.event.updateDuration.addListener(self, { duration in
      self.onMain(generation: generation) {
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
      self.onMain(generation: generation) {
        self.currentTime = data.seconds
      }
    })


    player?.remoteCommandController.handlePlayCommand = { [weak self] _ in
      self?.onMain(generation: generation) { self?.playMusic() }
      return MPRemoteCommandHandlerStatus.success
    }

    player?.remoteCommandController.handlePauseCommand = { [weak self] _ in
      self?.onMain(generation: generation) { self?.pauseMusic() }
      return MPRemoteCommandHandlerStatus.success
    }

    // All player state and model access stay on the main actor.
    let initialVolume = Double(AVAudioSession.sharedInstance().outputVolume)
    self.volume = initialVolume

    volumeObserver = AVAudioSession.sharedInstance().observe(\.outputVolume) { [weak self] session, _ in
      let outputVolume = Double(session.outputVolume)
      self?.onMain(generation: generation) {
        self?.volume = outputVolume
      }
    }

    // Added last: the queue emits the change to the first title while adding,
    // and an event emitted before its listener exists is lost.
    do {
      try player?.add(items: playerItems, at: 0)
    } catch {
      WatchLog.shared.error("Player", "Could not add titles to the queue: \(error.localizedDescription)")
      deinitPlayer()
      return false
    }
    return true
  }

  private func deinitPlayer() {
    sessionGeneration += 1
    playbackRevision += 1
    storeResumeState()
    player?.event.currentItem.removeListener(self)
    player?.event.fail.removeListener(self)
    player?.event.stateChange.removeListener(self)
    player?.event.secondElapse.removeListener(self)
    player?.event.updateDuration.removeListener(self)
    player?.event.seek.removeListener(self)
    player?.remoteCommands = []
    player?.pause()
    player?.clear()
    NowPlayingCenter.clear(player: player)
    player = nil
    playerPlaylistItems.removeAll()
    pendingSeek = nil
    wantsPlayback = false
    trackIndex = 0
    currentTitle = "Unknown Title"
    currentArtist = nil
    currentCover = nil
    isPlaying = false
    isStalled = false
    currentTrackIndex = 0
    currentTime = 0
    duration = 0
    lastPersistedPosition = 0
    volumeObserver?.invalidate()
    volumeObserver = nil
  }

  // MARK: - Position

  func seek(to time: TimeInterval) {
    guard type == .local, let player else { return }
    let upperBound = duration > 0 ? duration : time
    let clamped = min(max(time, 0), upperBound)
    player.seek(to: clamped)
    self.currentTime = clamped
    self.persistResumePosition(clamped)
  }

  func skip(by offset: TimeInterval) {
    seek(to: currentTime + offset)
  }

  /// Applies the position of a resumed title once the item is loaded — seeking
  /// before that is dropped by the player.
  private func pendingSeekPosition() -> TimeInterval? {
    guard let pendingSeek, pendingSeek.videoID == currentVideo?.id, pendingSeek.position.isFinite else { return nil }
    let position = max(0, pendingSeek.position)
    let knownDuration = duration > 0 ? duration : TimeInterval(currentVideo?.durationMillis ?? 0) / 1000
    return knownDuration > 0 ? min(position, knownDuration) : position
  }

  private func applyPendingSeek() {
    guard pendingSeek != nil, let player else { return }
    let position = pendingSeekPosition()
    pendingSeek = nil
    guard let position, position > 1 else { return }
    player.seek(to: position)
    currentTime = position
  }

  private func refreshDuration() {
    if let millis = currentVideo?.durationMillis, millis > 0 {
      duration = TimeInterval(millis) / 1000.0
    } else if let playerDuration = player?.duration, playerDuration > 0 {
      duration = playerDuration
    }
  }

  // MARK: - Repeat

  /// Sets the player volume from the loudness of the current title. Independent
  /// of the system volume the Digital Crown controls.
  func applyLoudnessNormalization() {
    guard let player else { return }
    let loudnessDb = currentVideo?.loudnessDb
    let gain = preferences.loudnessNormalization.gain(loudnessDb: loudnessDb)
    player.volume = gain
    WatchLog.shared.info("Player", "Loudness \(loudnessDb.map { String(format: "%.2f", $0) } ?? "unknown") dB -> volume \(String(format: "%.2f", gain))")
  }

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

  nonisolated private func onMain(generation: Int? = nil, _ block: @escaping @MainActor () -> Void) {
    Task { @MainActor [weak self] in
      guard let self, generation == nil || generation == self.sessionGeneration else { return }
      block()
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
    let generation = sessionGeneration
    onMain(generation: generation) {
      guard (self.player?.currentItem as AnyObject?) === (item as AnyObject?) else { return }
      self.currentTitle = item?.getTitle() ?? "Unknown Title"
      self.currentArtist = item?.getArtist()
      if let i = index {
        self.currentTrackIndex = i
        self.trackIndex = i
      }
      guard self.validateCurrentStream() else { return }
      if self.wantsPlayback { self.requestedStartVideoID = nil }
      // A resumed title starts at its stored position, so the position must not
      // be reported as 0 before the seek has been applied.
      self.duration = 0
      self.refreshDuration()
      self.currentTime = self.pendingSeekPosition() ?? 0
      self.lastPersistedPosition = self.currentTime
      self.applyLoudnessNormalization()
      self.updateNowPlayingMetadata()
      self.storeResumeState()
    }
    item?.getArtwork({ audioImage in
      self.onMain(generation: generation) {
        // A slow load of a previous title must not replace the cover of the
        // title that is playing now.
        guard (self.player?.currentItem as AnyObject?) === (item as AnyObject?) else { return }
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

  /// Handles the playback state the iPhone publishes in its application
  /// context. While the watch plays, or is still starting local playback, the
  /// context is ignored: `isPlaying` only turns true once the audio session is
  /// active, and taking over before that silently cancelled the local start.
  func phoneContextReceived(title: String?, isPlaying: Bool?) {
    guard type == .phone || (!wantsPlayback && !self.isPlaying) else {
      WatchLog.shared.info("Phone", "Ignored the iPhone playback state during local playback")
      return
    }
    applyPhonePlaybackState(title: title, isPlaying: isPlaying)
  }

  /// Mirrors the playback state the iPhone reports. The watch does not play the
  /// audio in that case, so it also must not claim the now playing slot.
  /// Runs synchronously so a local start cannot begin between the check in
  /// `phoneContextReceived` and the switch to phone mode.
  private func applyPhonePlaybackState(title: String?, isPlaying: Bool?) {
    playbackRevision += 1
    let wasLocal = type == .local
    type = .phone
    if wasLocal {
      NowPlayingCenter.clear(player: player)
      currentTime = 0
      duration = 0
    }
    if let title {
      currentTitle = title
      // Reset artist as not set by api
      currentArtist = nil
    } else {
      WatchLog.shared.warning("Phone", "Playback state without a title received")
    }
    if let isPlaying {
      self.isPlaying = isPlaying
    } else {
      WatchLog.shared.warning("Phone", "Playback state without a play flag received")
    }
  }

  @objc func playMusic() {
      if type == .phone {
        pausePlayOnPhone()
        return
      }

      wantsPlayback = true
      if player?.items.isEmpty ?? true {
        WatchLog.shared.warning("Player", "Play skipped: the queue is empty")
        return
      }
      guard validateCurrentStream() else { return }
      playbackRevision += 1
      let revision = playbackRevision
      let generation = sessionGeneration
      // Long-form audio keeps playback active when the screen is off.
      do {
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
                  self.onMain(generation: generation) { self.currentCover = audioImage }
                })
              }
          } catch {
              print("Failed to set up AVAudioSession: \(error)")
          }
      #else
        AVAudioSession.sharedInstance().activate { [self] success, error in
          if success {
            onMain(generation: generation) { [self] in
              guard revision == playbackRevision, type == .local else {
                WatchLog.shared.info("Player", "Skipped a superseded playback start")
                return
              }
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

      wantsPlayback = false
      playbackRevision += 1
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
