//
//  PlaylistManager.swift
//  watch
//
//  Created by Konstantin Späth on 13.07.24.
//

import Foundation
import AVFoundation
import SwiftAudioEx

@MainActor
class PlaylistManager {

  private var playlist: Playlist?
  var videos: [Video]?
  private(set) var orderedVideoIDs: [String] = []
  var hasTitles: Bool { !orderedVideoIDs.isEmpty }
  func contains(id: String) -> Bool { orderedVideoIDs.contains(id) }

  init() {

  }

  func setPlaylist(_ playlist: Playlist?, videos: [Video]? = nil, shuffle: Bool = false) {
    self.playlist = playlist
    let models = playlist?.orderedVideos ?? videos ?? []
    let ids = (playlist?.videoIDs ?? []) + models.map(\.id)
    var seen: Set<String> = []
    orderedVideoIDs = ids.filter { seen.insert($0).inserted }
    if shuffle { orderedVideoIDs.shuffle() }
    self.videos = models
    refreshModels()
  }

  private func refreshModels() {
    let models = playlist?.orderedVideos ?? videos ?? []
    let byID = Dictionary(models.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
    videos = orderedVideoIDs.compactMap { byID[$0] }
  }

  func getAll() -> [(Video, AudioItem)] {
    if let videos = videos {
      return getVideos(indexSet: IndexSet(videos.indices)).compactMap { v, a in
        if let audio = a {
          return (v, audio)
        }
        return nil
      }
    }
    return []
  }

  func getFirstBatchOfAvailable() -> [(Video, AudioItem)] {
    for id in orderedVideoIDs where videos?.contains(where: { $0.id == id }) != true { requestVideo(id: id) }
    if let videos = videos {
      var arr = Array<(Video, AudioItem)>()
      let videos = getVideos(indexSet: IndexSet(videos.indices))

      for v in videos {
        if let audio = v.1 {
          arr.append((v.0, audio))
        } else {
          // TODO: Send request for missing video Streaming Data
          requestVideo(id: v.0.id)
          continue
        }
      }
      return arr
    }
    return []
  }

  func getVideos(indexSet: IndexSet) -> [(Video, AudioItem?)] {
    let items : [(Int, AudioItem?)] = indexSet.map { index in
      if let videos, videos.indices.contains(index) {
        // Stream URLs can expire while an earlier title is still playing.
        return (index, getPlayerItem(videos[index]))
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

  /// Forgets deleted titles; the playlist relationship can still list them until it is saved.
  func remove(ids: Set<String>) {
    orderedVideoIDs.removeAll { ids.contains($0) }
    videos?.removeAll { ids.contains($0.id) }
  }

  func checkForNewVideos() -> [(Video, AudioItem)] {
    refreshModels()
    return getAll()
  }

  func isPlayable(_ video: Video) -> Bool {
    getPlayerItem(video) != nil
  }

  private func getPlayerItem(_ video: Video) -> AudioItem? {
    if let localFile = video.fileURL {
      let uri = getDownloadDirectory().appending(path: localFile).absoluteString
      print("Local uri: \(uri)")
      
      // Map to downloaded image if available
      let coverURL = resolvedCoverURL(for: video)?.url.absoluteString
      print("Coverurl: \(coverURL ?? "none")")
      
      // Without a known duration the item must not be cropped: an end time of 0
      // ends it right away and the title cannot be played at all.
      let item: Track? = video.durationMillis > 0
        ? TrackEndtime(url: uri, artworkUrl: coverURL, endTiming: CMTime(value: Int64(video.durationMillis), timescale: 1000))
        : Track(url: uri, artworkUrl: coverURL)
      if let item {
        item.title = video.title
        item.artist = video.artist

        return item
      }

      // TODO: Outsource to skip duplicate code
      
    } else if let sURL = video.streamURL, let validUntil = video.validUntil, validUntil > Date(), let item = Track(url: sURL, artworkUrl: resolvedCoverURL(for: video)?.url.absoluteString) {
      print("Remote uri: \(sURL)")

      // TODO: Outsource to skip duplicate code
      item.title = video.title
      item.artist = video.artist
      // TODO: strip player item to the video duration

      return item
    }
    print("Skipping video: \(video.title ?? video.id) as no type matched")
    return nil
  }

}

protocol PlaylistManagerDelegate {
  func fetchedNewVideos(playlistItems: [AVPlayerItem])
}
