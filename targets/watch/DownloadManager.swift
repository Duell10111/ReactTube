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
    for id in ids {
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
    var didStartAudioDownload = false

    if let streamURL = video.downloadURL, let expiry = video.validUntil, expiry > Date(), let uri = URL(string: streamURL) {
      WatchLog.shared.info("Download", "Started: \(video.title ?? video.id)")
      let request = URLRequest(url: uri)
      let key = SDDownloadManager.shared.downloadFile(withRequest: request, shouldDownloadInBackground: true, onProgress: { progress in
        print("Progrss: \(progress)")
        self.progressDownloads[video.id] = Double(progress)
        self.notifyProgress()
      }) { error, fileUrl in
        if let error = error {
          WatchLog.shared.error("Download", "Failed for \(video.title ?? video.id): \(error.localizedDescription)")
          self.failedDownloads[video.id] = error.localizedDescription
        } else {
          if let url = fileUrl {
            print("Downloaded file's url is \(url.path)")
            // TODO: Remove hardcode fileExt
            let saveDownload = saveDownloadFile(id: video.id, filePath: url, fileExtension: "mp4")
            if let saveURL = saveDownload {
              self.receiveFileUpload(id: video.id, fileURL: saveURL, duration: video.durationMillis)
              print("Saved Download")
            } else {
              self.failedDownloads[video.id] = "The downloaded file could not be saved."
            }
          }
        }
        self.activeDownloads.removeAll { download in
          download.id == video.id
        }
        self.progressDownloads.removeValue(forKey: video.id)
        self.downloadKeys.removeValue(forKey: video.id)
        self.notifyProgress()
        // Keep draining the queue even when the video has no cover or the
        // optional cover download fails.
        self.checkDownloads()
      }
      if let key {
        downloadKeys[video.id] = key
      }
      activeDownloads.append(ActiveDownload(id: video.id))
      notifyProgress()
      didStartAudioDownload = true
    } else {
      WatchLog.shared.warning("Download", "No download URL for \(video.title ?? video.id)")
      failedDownloads[video.id] = "No download URL available."
    }
    // TODO: Add clear function to delete images without downloaded audio
    // Image Download
    if let coverURL = video.coverURL, let uri = URL(string: coverURL) {
      print("Started image download \(video.id)")
      let request = URLRequest(url: uri)
      _ = SDDownloadManager.shared.downloadFile(withRequest: request, shouldDownloadInBackground: true, onProgress: { progress in
        print("Progrss Image: \(progress)")
      }) { error, fileUrl in
        if let error = error {
          print("Error is \(error as NSError)")
        } else {
          if let url = fileUrl {
            print("Downloaded cover url is \(url.path)")
            // TODO: Remove hardcode fileExt
            let saveDownload = saveDownloadFile(id: video.id, filePath: url, fileExtension: "png")
            if let saveURL = saveDownload {
              self.receiveFileUploadImage(id: video.id, coverURL: saveURL, duration: video.durationMillis)
              print("Saved Image Download")
              // Check for new downloads on end of another download
              self.checkDownloads()
            }
          }
        }
      }
    }

    return didStartAudioDownload
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

  private func receiveFileUpload(id: String, fileURL: String, duration: Int) {
    addDownloadData(DataController.shared.container.mainContext, id: id, downloaded: true, duration: duration, fileURL: fileURL)
  }

  private func receiveFileUploadImage(id: String, coverURL: String, duration: Int) {
    addDownloadData(DataController.shared.container.mainContext, id: id, duration: duration, coverURL: coverURL)
  }

}

struct ActiveDownload {
  var id: String
  var image: Bool = false
  //var session: URLSessionDownloadTask
}

/// Centralized until the native watch gains a UI localization boundary.
enum DownloadMessages {
  static let unavailable = "No download URL available."
  static let metadataFailed = "The iPhone could not load download information. Please try again."
  static let connectionFailed = "Download information timed out. Reconnect the iPhone and try again."
}
