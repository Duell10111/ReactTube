//
//  NowPlayingCenter.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 23.09.26.
//

import Foundation
import MediaPlayer
import SwiftAudioEx

/// Fills `MPNowPlayingInfoCenter` for local playback so the watch control center
/// and the smart stack show the real title instead of a placeholder.
///
/// `SwiftAudioEx` already publishes what it knows (title, artist, artwork,
/// elapsed time). Two things are missing: the duration is only known once the
/// asset has been loaded — and it is the duration of the full stream, not of the
/// cropped item — and the queue position is never set. Everything goes through
/// the player's own info controller, because that controller keeps its own copy
/// of the dictionary and would otherwise overwrite direct writes.
enum NowPlayingCenter {

  static func applyMetadata(
    player: AudioPlayer?,
    video: Video?,
    albumTitle: String?,
    queueIndex: Int?,
    queueCount: Int?
  ) {
    guard let player else { return }

    var values: [NowPlayingInfoKeyValue] = [
      NowPlayingInfoProperty.mediaType(.audio),
      NowPlayingInfoProperty.isLiveStream(false)
    ]

    if let video {
      values.append(MediaItemProperty.title(video.title ?? "Unknown Title"))
      values.append(MediaItemProperty.artist(video.artist))
      if video.durationMillis > 0 {
        values.append(MediaItemProperty.duration(TimeInterval(video.durationMillis) / 1000.0))
      }
    }

    if let albumTitle {
      values.append(MediaItemProperty.albumTitle(albumTitle))
    }

    if let queueCount, queueCount > 0 {
      values.append(NowPlayingInfoProperty.playbackQueueCount(UInt64(queueCount)))
    }

    if let queueIndex, queueIndex >= 0 {
      values.append(NowPlayingInfoProperty.playbackQueueIndex(UInt64(queueIndex)))
    }

    player.nowPlayingInfoController.set(keyValues: values)
  }

  static func applyPlaybackValues(player: AudioPlayer?, currentTime: TimeInterval, isPlaying: Bool) {
    guard let player else { return }

    player.nowPlayingInfoController.set(keyValues: [
      NowPlayingInfoProperty.elapsedPlaybackTime(currentTime),
      NowPlayingInfoProperty.playbackRate(isPlaying ? 1.0 : 0.0)
    ])
  }

  /// Called when the watch stops owning the playback — for example while it only
  /// remote controls the iPhone. Claiming a now playing item we do not play
  /// leaves stale data in the smart stack.
  static func clear(player: AudioPlayer?) {
    if let player {
      player.nowPlayingInfoController.clear()
    } else {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }
  }
}
