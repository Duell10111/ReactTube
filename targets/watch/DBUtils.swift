//
//  DBUtils.swift
//  watch
//
//  Created by Konstantin Späth on 10.06.24.
//

import Foundation
import SwiftData
import SDDownloadManager

func getDocumentsDirectory() -> URL {
    let paths = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
    let documentsDirectory = paths[0]
    return documentsDirectory
}

func getDownloadDirectory() -> URL {
  let downloadsDir = getDocumentsDirectory().appending(path: "downloads")
  return downloadsDir
}

func getDownloadVideoDirectory(id: String) -> URL {
  let downloadsDir = getDownloadDirectory().appending(path: id)
  return downloadsDir
}

func createDirectoryIfNotExisting(path: URL) -> Bool {
  do {
    try FileManager.default.createDirectory(at: path, withIntermediateDirectories: true)
    return true
  } catch {
    print("Error creating directory at \(path) - \(error)")
  }
  return false
}

func saveDownloadFile(id: String, filePath: URL, fileExtension: String? = nil) -> String? {
  let downloadDir = getDownloadVideoDirectory(id: id)
  let created = createDirectoryIfNotExisting(path: downloadDir)

  let destinationURL = downloadDir.appending(path: "/audio.\(fileExtension ?? filePath.pathExtension)")

  if created {
    do {
      if FileManager.default.fileExists(atPath: destinationURL.path()) {
        try FileManager.default.replaceItemAt(destinationURL, withItemAt: filePath)
      } else {
        try FileManager.default.moveItem(at: filePath, to: destinationURL)
      }
      return removeURLPrefix(url: destinationURL.absoluteString, prefix: getDownloadDirectory().absoluteString)
    } catch {
      print("Error moving download from \(filePath) to \(destinationURL) - \(error)")
    }
  }
  return nil
}

func removeURLPrefix(url: String, prefix: String) -> String {
  if let range = url.range(of: prefix) {
    var newURLString = url
    newURLString.removeSubrange(range)
    return newURLString
  }
  return url
}

// TODO: Rename to VideoData?
func addDownloadData(_ modelContext: ModelContext, id: String, title: String? = nil, artist: String? = nil, downloaded: Bool? = nil, duration: Int, fileURL: String? = nil, streamURL: String? = nil, validUntil: Date? = nil, coverURL: String? = nil, temp: Bool? = nil, downloadURL: String? = nil) {

  do {
    let descriptor = FetchDescriptor<Video>(
          predicate: #Predicate { $0.id == id }
        )
    let contents = try modelContext.fetch(descriptor)

    let existingEntry = !contents.isEmpty

    let video = contents.first ?? Video(id: id, durationMillis: duration, title: title, downloaded: downloaded ?? false)

    if let d = downloaded {
      video.downloaded = d
    }
    
    if let artist = artist {
      video.artist = artist
    }
    
    if let fURL = fileURL {
      video.fileURL = fURL
      video.durationMillis = duration
    }
    
    if duration > 0 {
      video.durationMillis = duration
    }
    
    if let vUntil = validUntil, let sURL = streamURL {
      video.validUntil = vUntil
      video.streamURL = sURL
    }

    if let cURL = coverURL {
      video.coverURL = cURL
    }

    if let temp = temp {
      video.temp = temp
    }
    
    if let downloadURL = downloadURL {
      video.downloadURL = downloadURL
    }

    if !existingEntry {
      modelContext.insert(video)
    }

    // Check if playlist needs video

    let playlistDescriptor = FetchDescriptor<Playlist>(
//      predicate: #Predicate { $0.videoIDs.contains(id) }
    )

    // Slow workarround as swiftdata is a bitch
    let allPlaylists = try modelContext.fetch(playlistDescriptor)

    let playlists = allPlaylists.filter { p in
      p.videoIDs.contains(id)
    }

    playlists.forEach { playlist in
      if !playlist.videos.contains(where: { v in
        v.id == id
      }) {
        playlist.videos.append(video)
      }
    }

    // Save unsaved changes on download finish
    if modelContext.hasChanges {
      try modelContext.save()
    }
  } catch {
    print("Error inserting Download Data: \(error)")
  }
}

func addPlaylistData(_ modelContext: ModelContext, id: String, title: String? = nil, videoIds: [String]?, coverURL: String? = nil, temp: Bool? = nil) {

  do {
    let descriptor = FetchDescriptor<Playlist>(
          predicate: #Predicate { $0.id == id }
        )
    let contents = try modelContext.fetch(descriptor)

    let existingEntry = !contents.isEmpty

    let playlist = contents.first ?? Playlist(id: id, title: title)

    if let ids = videoIds {
      let descriptor = FetchDescriptor<Video>(
        predicate: #Predicate { ids.contains($0.id) }
          )
      let videos = try modelContext.fetch(descriptor)

      print("VideoIds found for playlist: ", videos)

      playlist.videoIDs = ids
      playlist.videos = videos
    }

    if let cURL = coverURL {
      playlist.coverURL = cURL
    }

    if temp != nil {
      playlist.temp = temp
    }

    if !existingEntry {
      modelContext.insert(playlist)
    }
  } catch {
    print("Error inserting Download Data: \(error)")
  }
}

func addHomeScreenSection(_ modelContext: ModelContext, title: String, date: Date) -> HomeScreenSection? {
  do {
    let descriptor = FetchDescriptor<HomeScreenSection>(
      predicate: #Predicate { $0.title == title }
        )
    let contents = try modelContext.fetch(descriptor)

    let existingEntry = !contents.isEmpty

    let homeScreenElement = contents.first ?? HomeScreenSection(uuid: UUID().uuidString, title: title)
    
    homeScreenElement.date = date

    if !existingEntry {
      modelContext.insert(homeScreenElement)
    }
    
    return homeScreenElement
  } catch {
    print("Error inserting HomeScreenSection: \(error)")
  }
  return nil
}

func addHomeScreenElement(_ modelContext: ModelContext, videoID: String?, playlistID: String?) -> HomeScreenElement? {
  if let id = videoID ?? playlistID {
    do {
      let descriptor = FetchDescriptor<HomeScreenElement>(
          predicate: #Predicate { $0.videoID == videoID || $0.playlistID == playlistID }
          )
      let contents = try modelContext.fetch(descriptor)

      let existingEntry = !contents.isEmpty

      let type = videoID != nil ? HomeScreenElementType.video : .playlist

      let homeScreenElement = contents.first ?? HomeScreenElement(id: id, type: type)

      if let videoID = videoID {
        let descriptor = FetchDescriptor<Video>(
          predicate: #Predicate { $0.id == videoID }
        )
        let video = try modelContext.fetch(descriptor)

        homeScreenElement.video = video.first
      }

      if let playlistID = playlistID {
        let descriptor = FetchDescriptor<Playlist>(
          predicate: #Predicate { $0.id == playlistID }
        )
        let playlist = try modelContext.fetch(descriptor)

        homeScreenElement.playlist = playlist.first
      }

      if !existingEntry {
        modelContext.insert(homeScreenElement)
      }
      
      return homeScreenElement
    } catch {
      print("Error inserting HomeScreenElement: \(error)")
    }
  } else {
    print("HomeScreenElement can not contain videoID and playlistID?!")
  }
  return nil
}

let queue = DispatchQueue(label: "db.utils.queue")

func checkVideosForExpiration(_ videos: [Video]) {
  queue.async {
    for video in videos {
      if let validUntil = video.validUntil, validUntil < Date() {
        print("Refetch expired videoID")
        requestVideo(id: video.id)
      }
    }
  }
}

func checkPlaylist(_ playlist: Playlist) {
  queue.async {
    let ids = playlist.videoIDs.filter { id in
      !playlist.videos.contains { video in
        video.id == id && (video.downloaded || (video.validUntil != nil && video.validUntil! > Date())) && video.durationMillis > 0
      }
    }
    print("Fetching Playlist Ids: \(ids)")
    ids.forEach { id in
      requestVideo(id: id)
    }
  }
}

func addVideoToPlaylist(_ playlist: Playlist, video: Video) {
  playlist.videoIDs.append(video.id)
  playlist.videos.append(video)
}

func deleteDownloadedVideo(id: String) {
  do {
    let path = getDownloadDirectory().appendingPathComponent(id)
    if FileManager.default.fileExists(atPath: path.path()) {
      try FileManager.default.removeItem(at: path)
    }
  } catch {
    print("Error deleting download video: \(error)")
  }
}

func deleteDownloadedPlaylist(_ modelContext: ModelContext, playlist: Playlist) {
  let playlistId = playlist.id
  // Find all videos only saved in the playlist
  for video in playlist.videos {
    // Check if other playlist exists with this video
    let videoID = video.id
    let descriptor = FetchDescriptor<Playlist>(
      predicate: #Predicate { $0.id != playlistId && $0.videos.contains(where: { v in
        v.id == videoID
      })}
    )
    do {
      let otherPlaylists = try modelContext.fetch(descriptor)
      if !otherPlaylists.isEmpty { continue }
      if video.downloaded { deleteDownloadedVideo(id: video.id) }
      
      modelContext.delete(video)
    } catch {
      print("Error deleting video \(video.id) from playlist \(playlist.id): \(error)")
    }
  }
  
  // Delete playlist from database
  modelContext.delete(playlist)
}

func overrideDatabase(modelContext: ModelContext, backupFile: JSONBackupFile) {
  if backupFile.videos.isEmpty {
    print("No Videos available")
    return
  }
  let newFormatter = ISO8601DateFormatter()
  newFormatter.formatOptions = [
    .withInternetDateTime,
    .withFullDate,
    .withFractionalSeconds
  ]
  // TODO: Delete all files as well?
  clearDatabase(modelContext: modelContext)
  backupFile.videos.forEach { video in
    let v = Video(id: video.id, durationMillis: video.duration, title: video.title, downloaded: false)
    modelContext.insert(v)
  }
}

func clearDownloads(modelContext: ModelContext) {
  do {
    SDDownloadManager.shared.cancelAllDownloads()
    if FileManager.default.fileExists(atPath: getDownloadDirectory().path()) {
      try FileManager.default.removeItem(at: getDownloadDirectory())
    }

    let descriptor = FetchDescriptor<Video>()
    let videos = try modelContext.fetch(descriptor)

    for video in videos {
      video.downloaded = false
      video.fileURL = nil
    }
    
    let playlistDescriptor = FetchDescriptor<Playlist>()
    let playlists = try modelContext.fetch(playlistDescriptor)
    
    for playlist in playlists {
      playlist.download = false
    }
  } catch {
    print("Failed to clear all Downloads data. \(error)")
  }
}

func clearDatabase(modelContext: ModelContext) {
  do {
      try modelContext.delete(model: Video.self)
      try modelContext.delete(model: Playlist.self)
      try modelContext.delete(model: HomeScreenSection.self)
      try modelContext.delete(model: HomeScreenElement.self)
    
      if FileManager.default.fileExists(atPath: getDownloadDirectory().path()) {
        try FileManager.default.removeItem(at: getDownloadDirectory())
      }
  } catch {
      print("Failed to clear all Video and Playlist data. \(error)")
  }
}
