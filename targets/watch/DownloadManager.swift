//
//  DownloadManager.swift
//  watch
//
//  Created by Konstantin Späth on 17.06.24.
//

import Foundation
import AVFoundation

class DownloadManager : NSObject {
  static let shared = DownloadManager()
  
  var activeDownloads : [ActiveDownload] = []
  var assetURLSession: AVAssetDownloadURLSession? = nil
  
  override init() {
    let backgroundConfiguration = URLSessionConfiguration.background(
        withIdentifier: "assetDownloadConfigurationIdentifier")
    super.init()
    assetURLSession = AVAssetDownloadURLSession(configuration: backgroundConfiguration,
                                                    assetDownloadDelegate: self, delegateQueue: OperationQueue.main)
  }
  
  func downloadVideo(video: Video) {
    if let streamURL = video.streamURL, let date = video.validUntil, let uri = URL(string: streamURL), let assetURLSession = self.assetURLSession {
      let hlsAsset = AVURLAsset(url: uri)
      print("Started download \(video.id)")
      
      let assetDownloadTask = assetURLSession.makeAssetDownloadTask(downloadConfiguration: AVAssetDownloadConfiguration(asset: hlsAsset, title: video.title ?? "Unknown video"))
      assetDownloadTask.taskDescription = video.id
      assetDownloadTask.resume()
      
      activeDownloads.append(ActiveDownload(id: video.id, session: assetDownloadTask))
    }
  }
  
  @MainActor
  private func receiveFileUpload(id: String, fileURL: String) {
    addDownloadData(DataController.shared.container.mainContext, id: id, downloaded: true, fileURL: fileURL)
  }
  
}

extension DownloadManager: AVAssetDownloadDelegate {
  func urlSession(_ session: URLSession, assetDownloadTask: AVAssetDownloadTask, willDownloadTo location: URL) {
    print("Response: \(assetDownloadTask.debugDescription)")
    if let videoID = assetDownloadTask.taskDescription {
      if assetDownloadTask.state == .completed, let videoID = assetDownloadTask.taskDescription {
        Task {
          await self.receiveFileUpload(id: videoID, fileURL: location.absoluteString)
          self.activeDownloads.removeAll { download in
            download.id == videoID
          }
          print("Saved Download")
        }
      } else {
        print("Error while processing DownloadTask: \(assetDownloadTask.debugDescription)")
        print("State: \(assetDownloadTask.state) - ID: \(videoID)")
        self.activeDownloads.removeAll { download in
          download.id == videoID
        }
      }
    }
  }
  
  func urlSession(_ session: URLSession, assetDownloadTask: AVAssetDownloadTask, didFinishDownloadingTo location: URL) {
    print("Response: \(assetDownloadTask.debugDescription)")
    if let videoID = assetDownloadTask.taskDescription {
      if assetDownloadTask.state == .completed, let videoID = assetDownloadTask.taskDescription {
        Task {
          await self.receiveFileUpload(id: videoID, fileURL: location.absoluteString)
          self.activeDownloads.removeAll { download in
            download.id == videoID
          }
          print("Saved Download")
        }
      } else {
        print("Error while processing DownloadTask: \(assetDownloadTask.debugDescription) - \(assetDownloadTask.error)")
        print("State: \(assetDownloadTask.state) - ID: \(videoID)")
        self.activeDownloads.removeAll { download in
          download.id == videoID
        }
      }
    }
  }
}

struct ActiveDownload {
  var id: String
  var session: AVAssetDownloadTask
}
