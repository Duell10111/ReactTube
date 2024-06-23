//
//  YoutubeAPI.swift
//  watch
//
//  Created by Konstantin Späth on 13.06.24.
//

import Foundation
import WatchConnectivity

private func sendVideoAPIMessage(message: [String: Any]) {
  SessionSyncStruct.shared.session.sendMessage(["type": "youtubeAPI", "payload": message], replyHandler: nil)
}

func requestVideo(id: String) {
  sendVideoAPIMessage(message: ["request": "video", "videoId": id])
}

func requestPlaylist(id: String) {
  sendVideoAPIMessage(message: ["request": "playlist", "playlistId": id])
}

func processYoutubeAPIMessage(_ session: WCSession, message: [String: Any]) {
  if let type = message["type"] as? String {
    switch type {
    case "videoResponse":
      Task {
        await saveVideoResponse(session, message: message)
      }
    case "playlistResponse":
      Task {
        await savePlaylistResponse(session, message: message)
      }
    default:
      print("No Youtube API Message type matched: \(type)")
    }
  }
}


@MainActor
func saveVideoResponse(_ session: WCSession, message: [String: Any]) {
  print("VideoResponse: \(message)")
  if let id = message["id"] as? String, let title = message["title"] as? String, let duration = message["duration"] as? Int, let streamURL = message["steamURL"] as? String, let validUntil = message["validUntil"] as? Int64, let coverURL = message["coverUrl"] as? String {
    print("Received Video Response for id: \(id)")
    let date = Date(timeIntervalSince1970: (Double(validUntil) / 1000.0))
    addDownloadData(DataController.shared.container.mainContext, id: id, title: title, streamURL: streamURL, validUntil: date, coverURL: coverURL)
  } else {
    print("YT Video Response incomplete")
  }
}

@MainActor
func savePlaylistResponse(_ session: WCSession, message: [String: Any]) {
  if let id = message["id"] as? String, let title = message["title"] as? String, let videoIds = message["videoIds"] as? [String], let coverURL = message["coverUrl"] as? String {
    print("Received Playlist Response for id: \(id)")
    videoIds.forEach { id in
      requestVideo(id: id)
    }
    addPlaylistData(DataController.shared.container.mainContext, id: id, title: title, videoIds: videoIds, coverURL: coverURL)
  } else {
    print("YT Video Response incomplete")
  }
}
