//
//  DBUtils.swift
//  watch
//
//  Created by Konstantin Späth on 10.06.24.
//

import Foundation
import SwiftData

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
      if FileManager.default.fileExists(atPath: destinationURL.absoluteString) {
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

func addDownloadData(_ modelContext: ModelContext, id: String, title: String? = nil, downloaded: Bool? = nil, duration: Int? = nil, fileURL: String? = nil, streamURL: String? = nil, validUntil: Date? = nil, coverURL: String? = nil) {
  
  do {
    let descriptor = FetchDescriptor<Video>(
          predicate: #Predicate { $0.id == id }
        )
    let contents = try modelContext.fetch(descriptor)
    
    let existingEntry = !contents.isEmpty
    
    let video = contents.first ?? Video(id: id, title: title, downloaded: downloaded ?? false)
    
    if let d = downloaded {
      video.downloaded = d
    }
    if let fURL = fileURL {
      video.fileURL = fURL
    }
//    if let d = duration {
//      video.
//    }
    if let vUntil = validUntil, let sURL = streamURL {
      video.validUntil = vUntil
      video.streamURL = streamURL
    }
    
    if let cURL = coverURL {
      video.coverURL = cURL
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
    
    
  } catch {
    print("Error inserting Download Data: \(error)")
  }
}

func addPlaylistData(_ modelContext: ModelContext, id: String, title: String? = nil, videoIds: [String]?, coverURL: String? = nil) {
  
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
    
    if !existingEntry {
      modelContext.insert(playlist)
    }
  } catch {
    print("Error inserting Download Data: \(error)")
  }
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
    let v = Video(id: video.id, title: video.title, downloaded: false)
    modelContext.insert(v)
  }
}

func clearDownloads(modelContext: ModelContext) {
  do {
    try FileManager.default.removeItem(at: getDownloadDirectory())
    
    let batchSize = 1000
    let descriptor = FetchDescriptor<Video>()
    let videos = try modelContext.fetch(descriptor)
    
    for video in videos {
      video.downloaded = false
      video.fileURL = nil
    }
  } catch {
    print("Failed to clear all Downloads data.")
  }
}

func clearDatabase(modelContext: ModelContext) {
  do {
      try modelContext.delete(model: Video.self)
      try FileManager.default.removeItem(at: getDownloadDirectory())
  } catch {
      print("Failed to clear all Video and Playlist data.")
  }
}
