//
//  DownloadManager.swift
//  watch
//
//  Created by Konstantin Späth on 17.06.24.
//

import Foundation
import SDDownloadManager
import SwiftData

@Observable
class DownloadManager {
  static let shared = DownloadManager()

  var activeDownloads : [ActiveDownload] = []
  var progressDownloads: [String: Double] = [:]

  var pendingDownloads: Set<Video> = []
  /// Video ids waiting for fresh stream metadata from the phone before they can be downloaded.
  var awaitingMetadata: Set<String> = []
  /// SDDownloadManager keys of running audio downloads, needed to cancel them.
  private var downloadKeys: [String: String] = [:]

  /// Queues a download. Videos without a valid download URL request fresh
  /// metadata first; `videoMetadataUpdated` continues once it arrives.
  func enqueue(_ video: Video) {
    guard !video.downloaded, !activeDownloads.contains(where: { $0.id == video.id }) else { return }
    if video.downloadURL != nil, let validUntil = video.validUntil, validUntil > Date() {
      pendingDownloads.insert(video)
    } else {
      awaitingMetadata.insert(video.id)
      requestVideo(id: video.id)
    }
  }

  @MainActor
  func videoMetadataUpdated(id: String) {
    guard awaitingMetadata.remove(id) != nil else { return }
    let descriptor = FetchDescriptor<Video>(predicate: #Predicate { $0.id == id })
    if let video = try? DataController.shared.container.mainContext.fetch(descriptor).first, !video.downloaded {
      pendingDownloads.insert(video)
      checkDownloads()
    }
  }

  /// Removes the videos from all queues and cancels running downloads.
  func cancel(ids: Set<String>) {
    pendingDownloads = pendingDownloads.filter { !ids.contains($0.id) }
    awaitingMetadata.subtract(ids)
    for id in ids {
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

  private func notifyProgress() {
    Task { @MainActor in
      LibrarySync.shared.downloadProgressChanged()
    }
  }

  func cancelAll() {
    SDDownloadManager.shared.cancelAllDownloads()
    pendingDownloads.removeAll()
    awaitingMetadata.removeAll()
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
      pendingDownloads.insert(video)
    }
    checkDownloads()
  }

  @discardableResult
  func downloadVideo(video: Video) -> Bool {
    var didStartAudioDownload = false

    if let streamURL = video.downloadURL, video.validUntil != nil, let uri = URL(string: streamURL) {
      WatchLog.shared.info("Download", "Started: \(video.title ?? video.id)")
      let request = URLRequest(url: uri)
      let key = SDDownloadManager.shared.downloadFile(withRequest: request, shouldDownloadInBackground: true, onProgress: { progress in
        print("Progrss: \(progress)")
        self.progressDownloads[video.id] = Double(progress)
        self.notifyProgress()
      }) { error, fileUrl in
        if let error = error {
          WatchLog.shared.error("Download", "Failed for \(video.title ?? video.id): \(error.localizedDescription)")
        } else {
          if let url = fileUrl {
            print("Downloaded file's url is \(url.path)")
            // TODO: Remove hardcode fileExt
            let saveDownload = saveDownloadFile(id: video.id, filePath: url, fileExtension: "mp4")
            if let saveURL = saveDownload {
              Task {
                await self.receiveFileUpload(id: video.id, fileURL: saveURL, duration: video.durationMillis)
                print("Saved Download")
              }
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
              Task {
                await self.receiveFileUploadImage(id: video.id, coverURL: saveURL, duration: video.durationMillis)
                print("Saved Image Download")
                // Check for new downloads on end of another download
                self.checkDownloads()
              }
            }
          }
        }
      }
    }

    return didStartAudioDownload
  }

  func checkDownloads() {
    Task(priority: .background) {
      print("Checking downloads...")

      // Iterate over a snapshot so successfully started downloads can be
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
        if downloadVideo(video: video) {
          pendingDownloads.remove(video)
        }
      }
    }
  }

  @MainActor
  private func receiveFileUpload(id: String, fileURL: String, duration: Int) {
    addDownloadData(DataController.shared.container.mainContext, id: id, downloaded: true, duration: duration, fileURL: fileURL)
  }

  @MainActor
  private func receiveFileUploadImage(id: String, coverURL: String, duration: Int) {
    addDownloadData(DataController.shared.container.mainContext, id: id, duration: duration, coverURL: coverURL)
  }

}

struct ActiveDownload {
  var id: String
  var image: Bool = false
  //var session: URLSessionDownloadTask
}
