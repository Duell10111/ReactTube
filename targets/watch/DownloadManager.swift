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
      let id = SDDownloadManager.shared.downloadFile(withRequest: request, onProgress: { progress in
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
//      activeDownloads.append(ActiveDownload(id: video.id, session: downloadTask))
    } else {
      print("Video metadata not available needed for Download")
    }
  }
  
  func checkDownloads() {
    Task(priority: .background) {
      print("Checking downloads...")
      pendingDownloads.forEach { video in
        downloadVideo(video: video)
      }
    }
  }

  @MainActor
  private func receiveFileUpload(id: String, fileURL: String, duration: Int) {
    addDownloadData(DataController.shared.container.mainContext, id: id, downloaded: true, duration: duration, fileURL: fileURL)
  }

}

struct ActiveDownload {
  var id: String
  var session: URLSessionDownloadTask
}
