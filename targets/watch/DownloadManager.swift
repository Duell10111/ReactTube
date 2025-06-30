//
//  DownloadManager.swift
//  watch
//
//  Created by Konstantin Späth on 17.06.24.
//

import Foundation
import SDDownloadManager

@Observable
class DownloadManager {
  static let shared = DownloadManager()

  var activeDownloads : [ActiveDownload] = []
  var progressDownloads: [String: Double] = [:]

  var pendingDownloads: Set<Video> = []

  // TODO: Add function to download Playlist?

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

  func downloadVideo(video: Video) {
    if let streamURL = video.downloadURL, let date = video.validUntil, let uri = URL(string: streamURL) {
      print("Started download \(video.id)")
      let request = URLRequest(url: uri)
      let id = SDDownloadManager.shared.downloadFile(withRequest: request, shouldDownloadInBackground: true, onProgress: { progress in
        print("Progrss: \(progress)")
        self.progressDownloads[video.id] = Double(progress)
      }) { error, fileUrl in
        if let error = error {
          print("Error is \(error as NSError)")
        } else {
          if let url = fileUrl {
            print("Downloaded file's url is \(url.path)")
            // TODO: Remove hardcode fileExt
            let saveDownload = saveDownloadFile(id: video.id, filePath: url, fileExtension: "mp4")
            if let saveURL = saveDownload {
              Task {
                await self.receiveFileUpload(id: video.id, fileURL: saveURL, duration: video.durationMillis)
                self.activeDownloads.removeAll { download in
                  download.id == video.id
                }
                print("Saved Download")
              }
            }
          }
        }
        self.activeDownloads.removeAll { download in
          download.id == video.id
        }
        self.progressDownloads.removeValue(forKey: video.id)
      }
      activeDownloads.append(ActiveDownload(id: video.id))
    } else {
      print("Video metadata not available needed for Download")
    }
    // TODO: Add clear function to delete images without downloaded audio
    // Image Download
    if let coverURL = video.coverURL, let uri = URL(string: coverURL) {
      print("Started image download \(video.id)")
      let request = URLRequest(url: uri)
      let id = SDDownloadManager.shared.downloadFile(withRequest: request, shouldDownloadInBackground: true, onProgress: { progress in
        print("Progrss Image: \(progress)")
      }) { error, fileUrl in
        if let error = error {
          print("Error is \(error as NSError)")
        } else {
          if let url = fileUrl {
            print("Downloaded file's url is \(url.path)")
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

  }

  func checkDownloads() {
    Task(priority: .background) {
      print("Checking downloads...")

      for video in pendingDownloads {
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
        downloadVideo(video: video)
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
