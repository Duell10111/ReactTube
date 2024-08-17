//
//  DownloadManager.swift
//  watch
//
//  Created by Konstantin Späth on 17.06.24.
//

import Foundation

class DownloadManager {
  static let shared = DownloadManager()

  var activeDownloads : [ActiveDownload] = []

  func downloadVideo(video: Video) {
    if let streamURL = video.streamURL, let date = video.validUntil, let uri = URL(string: streamURL) {
      print("Started download \(video.id)")
      let downloadTask = URLSession.shared.downloadTask(with: URLRequest(url: uri)) { urlOrNil, responseOrNil, errorOrNil in
        print("Response: \(responseOrNil.debugDescription)")
        let ext = responseOrNil?.mimeType?.split(separator: "/")[1]

        if let response = responseOrNil as? HTTPURLResponse, response.statusCode != 200 {
          print("Download failed for \(video.id)")
          self.activeDownloads.removeAll { download in
            download.id == video.id
          }
        }

        print("Extension: \(ext)")
        guard let fileURL = urlOrNil else {
          self.activeDownloads.removeAll { download in
            download.id == video.id
          }
          return
        }
        // TODO: Remove hardcode fileExt
        let saveDownload = saveDownloadFile(id: video.id, filePath: fileURL, fileExtension: "mp4")
        print("Save Download \(saveDownload)")
        if let saveURL = saveDownload {
          Task {
            await self.receiveFileUpload(id: video.id, fileURL: saveURL)
            self.activeDownloads.removeAll { download in
              download.id == video.id
            }
            print("Saved Download")
          }
        }
      }
      downloadTask.resume()
      activeDownloads.append(ActiveDownload(id: video.id, session: downloadTask))
    }
  }

  @MainActor
  private func receiveFileUpload(id: String, fileURL: String) {
    addDownloadData(DataController.shared.container.mainContext, id: id, downloaded: true, fileURL: fileURL)
  }

}

struct ActiveDownload {
  var id: String
  var session: URLSessionDownloadTask
}
