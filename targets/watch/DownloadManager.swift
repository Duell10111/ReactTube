//
//  DownloadManager.swift
//  watch
//
//  Created by Konstantin Späth on 17.06.24.
//

import Foundation
import SDDownloadManager
import SwiftData

/// Main-actor isolated because SwiftUI observes its state. SDDownloadManager
/// already delivers progress and completion callbacks on the main queue.
@MainActor
@Observable
class DownloadManager {
  static let shared = DownloadManager()

  var activeDownloads : [ActiveDownload] = []
  var progressDownloads: [String: Double] = [:]

  var pendingDownloads: Set<Video> = []
  /// Video ids waiting for fresh stream metadata from the phone before they can be downloaded.
  var awaitingMetadata: Set<String> = []
  /// Reason of the last failed attempt per video id. Kept in memory only, like
  /// the queues, until the download state moves into the database.
  var failedDownloads: [String: String] = [:]
  /// SDDownloadManager keys of running audio downloads, needed to cancel them.
  private var downloadKeys: [String: String] = [:]
  private var coverKeys: [String: String] = [:]
  private var generations: [String: UUID] = [:]

  /// Queues a download. Videos without a valid download URL request fresh
  /// metadata first; `videoMetadataUpdated` continues once it arrives.
  func enqueue(_ video: Video) {
    guard !video.downloaded, !awaitingMetadata.contains(video.id), !pendingDownloads.contains(video), !activeDownloads.contains(where: { $0.id == video.id }) else { return }
    failedDownloads.removeValue(forKey: video.id)
    if video.downloadURL != nil, let validUntil = video.validUntil, validUntil > Date() {
      pendingDownloads.insert(video)
    } else {
      awaitingMetadata.insert(video.id)
      requestVideo(id: video.id)
    }
  }

  func videoMetadataUpdated(id: String) {
    guard awaitingMetadata.remove(id) != nil else { return }
    let descriptor = FetchDescriptor<Video>(predicate: #Predicate { $0.id == id })
    if let video = try? DataController.shared.container.mainContext.fetch(descriptor).first, !video.downloaded {
      guard video.downloadURL != nil, let expiry = video.validUntil, expiry > Date() else {
        failedDownloads[id] = DownloadMessages.unavailable
        notifyProgress()
        return
      }
      pendingDownloads.insert(video)
      checkDownloads()
    }
  }

  func videoMetadataFailed(id: String) {
    guard awaitingMetadata.remove(id) != nil else { return }
    failedDownloads[id] = WatchStatus.shared.isReachable ? DownloadMessages.metadataFailed : DownloadMessages.connectionFailed
    notifyProgress()
  }

  /// Removes the videos from all queues and cancels running downloads.
  func cancel(ids: Set<String>) {
    pendingDownloads = pendingDownloads.filter { !ids.contains($0.id) }
    awaitingMetadata.subtract(ids)
    VideoMetadataRequests.shared.cancel(ids: ids)
    for id in ids {
      generations.removeValue(forKey: id)
      if let key = coverKeys.removeValue(forKey: id) {
        SDDownloadManager.shared.cancelDownload(forUniqueKey: key)
      }
      failedDownloads.removeValue(forKey: id)
      // SDDownloadManager drops the completion block of a cancelled task, so the
      // bookkeeping normally done there has to happen here.
      if let key = downloadKeys.removeValue(forKey: id) {
        SDDownloadManager.shared.cancelDownload(forUniqueKey: key)
      }
      progressDownloads.removeValue(forKey: id)
    }
    activeDownloads.removeAll { ids.contains($0.id) }
    notifyProgress()
    checkDownloads()
  }

  /// Queues a failed download again; expired metadata is re-requested first.
  func retry(id: String) {
    let descriptor = FetchDescriptor<Video>(predicate: #Predicate { $0.id == id })
    guard let video = try? DataController.shared.container.mainContext.fetch(descriptor).first else {
      failedDownloads.removeValue(forKey: id)
      return
    }
    enqueue(video)
    checkDownloads()
  }

  private func notifyProgress() {
    Task { @MainActor in
      LibrarySync.shared.downloadProgressChanged()
    }
  }

  func cancelAll() {
    VideoMetadataRequests.shared.cancel(ids: awaitingMetadata)
    generations.removeAll()
    coverKeys.removeAll()
    SDDownloadManager.shared.cancelAllDownloads()
    pendingDownloads.removeAll()
    awaitingMetadata.removeAll()
    failedDownloads.removeAll()
    downloadKeys.removeAll()
    progressDownloads.removeAll()
    activeDownloads.removeAll()
    notifyProgress()
  }

  func downloadPlaylist(_ playlist: Playlist) {
    print("Downloading playlist \(playlist.id)")
    playlist.download = true
    playlist.videos.filter { video in
      video.downloaded == false
    }.forEach { video in
      enqueue(video)
    }
    checkDownloads()
  }

  /// Starts the transfer right away. Callers go through `enqueue` so the
  /// parallel limit and the metadata refresh apply.
  @discardableResult
  private func downloadVideo(video: Video) -> Bool {
    let id = video.id
    let duration = video.durationMillis
    let title = video.title ?? id
    guard let streamURL = video.downloadURL, let expiry = video.validUntil, expiry > Date(), let uri = URL(string: streamURL) else {
      failedDownloads[id] = DownloadMessages.unavailable
      return false
    }
    let generation = UUID()
    generations[id] = generation
    let key = SDDownloadManager.shared.downloadFile(withRequest: URLRequest(url: uri), shouldDownloadInBackground: true, onProgress: { progress in
      guard self.generations[id] == generation else { return }
      self.progressDownloads[id] = Double(progress)
      self.notifyProgress()
    }) { error, fileURL in
      guard self.generations[id] == generation, self.existingVideo(id: id) != nil else { return }
      if let error {
        WatchLog.shared.error("Download", "Failed for \(title): \(error.localizedDescription)")
        self.failedDownloads[id] = error.localizedDescription
      } else if let fileURL, let saved = saveDownloadFile(id: id, filePath: fileURL, fileExtension: "mp4") {
        self.receiveFileUpload(id: id, fileURL: saved, duration: duration)
      } else {
        self.failedDownloads[id] = DownloadMessages.saveFailed
      }
      self.activeDownloads.removeAll { $0.id == id }
      self.progressDownloads.removeValue(forKey: id)
      self.downloadKeys.removeValue(forKey: id)
      self.notifyProgress()
      self.checkDownloads()
    }
    guard let key else {
      generations.removeValue(forKey: id)
      failedDownloads[id] = DownloadMessages.startFailed
      return false
    }
    downloadKeys[id] = key
    activeDownloads.append(ActiveDownload(id: id))
    notifyProgress()

    if let coverURL = video.coverURL, let uri = URL(string: coverURL), uri.scheme == "https" || uri.scheme == "http" {
      coverKeys[id] = SDDownloadManager.shared.downloadFile(withRequest: URLRequest(url: uri), shouldDownloadInBackground: true, onProgress: nil) { error, fileURL in
        guard self.generations[id] == generation, self.existingVideo(id: id) != nil else { return }
        self.coverKeys.removeValue(forKey: id)
        guard error == nil, let fileURL,
              let saved = saveDownloadFile(id: id, filePath: fileURL, fileExtension: "png", fileName: "cover") else { return }
        self.receiveFileUploadImage(id: id, coverURL: saved, duration: duration)
      }
    }
    return true
  }

  func checkDownloads() {
    // Deferred so callers can finish their own bookkeeping first. The task
    // inherits the main actor, so the queues are never mutated concurrently.
    Task {
      print("Checking downloads...")

      // Iterate over a snapshot so attempted downloads can be
      // removed from the pending set without mutating the collection being
      // enumerated.
      for video in Array(pendingDownloads) {
        // Do not create a while loop here as this probably causes battery issues. Instead trigger check method after finish of download.
//        while activeDownloads.count > 4 {
//          do {
//            print("More than 4 downloads active. Sleeping...")
//            try await Task.sleep(nanoseconds: 60_000_000_000)
//          } catch {
//            print("Download Task Sleep Error: \(error)")
//          }
//        }
        if activeDownloads.count > 4 {
          print("More than 4 downloads active. Exiting loop for now...")
          break
        }
        // A video that cannot start is recorded in `failedDownloads` and
        // leaves the queue, otherwise every check would retry it silently.
        downloadVideo(video: video)
        pendingDownloads.remove(video)
      }
    }
  }

  private func existingVideo(id: String) -> Video? {
    let descriptor = FetchDescriptor<Video>(predicate: #Predicate { $0.id == id })
    return try? DataController.shared.container.mainContext.fetch(descriptor).first
  }

  private func receiveFileUpload(id: String, fileURL: String, duration: Int) {
    guard let video = existingVideo(id: id) else { return }
    video.downloaded = true
    video.fileURL = fileURL
    try? DataController.shared.container.mainContext.save()
  }

  private func receiveFileUploadImage(id: String, coverURL: String, duration: Int) {
    guard let video = existingVideo(id: id) else { return }
    video.coverURL = coverURL
    try? DataController.shared.container.mainContext.save()
  }

}

struct ActiveDownload {
  var id: String
  var image: Bool = false
  //var session: URLSessionDownloadTask
}

/// Centralized until the native watch gains a UI localization boundary.
enum DownloadMessages {
  static let saveFailed = "The downloaded file could not be saved."
  static let startFailed = "The download could not be started."
  static let unavailable = "No download URL available."
  static let metadataFailed = "The iPhone could not load download information. Please try again."
  static let connectionFailed = "Download information timed out. Reconnect the iPhone and try again."
}
