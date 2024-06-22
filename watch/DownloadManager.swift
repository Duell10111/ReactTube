//
//  DownloadManager.swift
//  watch
//
//  Created by Konstantin Späth on 17.06.24.
//

import Foundation

class DownloadManager {
  static let shared = DownloadManager()
  
  func downloadVideo(video: Video) {
    if let streamURL = video.streamURL, let date = video.validUntil, let uri = URL(string: streamURL) {
      print("Started download \(video.id)")
      let downloadTask = URLSession.shared.downloadTask(with: URLRequest(url: uri)) { urlOrNil, responseOrNil, errorOrNil in
        print("Response: \(responseOrNil.debugDescription)")
        let ext = responseOrNil?.mimeType?.split(separator: "/")[1]
        print("Extension: \(ext)")
        guard let fileURL = urlOrNil else { return }
        // TODO: Remove hardcode fileExt
        let saveDownload = saveDownloadFile(id: video.id, filePath: fileURL, fileExtension: "mp4")
        print("Save Download \(saveDownload)")
        if let saveURL = saveDownload {
          Task {
            await self.receiveFileUpload(id: video.id, fileURL: saveURL)
            print("Saved Download")
          }
        }
      }
      downloadTask.resume()
    }
  }
  
  @MainActor
  private func receiveFileUpload(id: String, fileURL: String) {
    addDownloadData(DataController.shared.container.mainContext, id: id, downloaded: true, fileURL: fileURL)
  }
  
}
