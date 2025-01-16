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

func requestHome() {
  sendVideoAPIMessage(message: ["request": "home"])
}

func requestLibraryPlaylists() {
  sendVideoAPIMessage(message: ["request": "library-playlists"])
}

func nextTitleOnPhone() {
  SessionSyncStruct.shared.session.sendMessage(["type": "PhoneNext"], replyHandler: nil)
}

func previousTitleOnPhone() {
  SessionSyncStruct.shared.session.sendMessage(["type": "PhonePrev"], replyHandler: nil)
}

func pausePlayOnPhone() {
  SessionSyncStruct.shared.session.sendMessage(["type": "PhonePausePlay"], replyHandler: nil)
}

func processYoutubeAPIMessage(_ session: WCSession, message: [String: Any]) {
  print("Process Youtube API")
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
    case "homeResponse":
      Task {
        await saveHomeScreenResponse(session, message: message)
      }
    default:
      print("No Youtube API Message type matched: \(type)")
    }
  }
}


@MainActor
func saveVideoResponse(_ session: WCSession, message: [String: Any]) {
  print("VideoResponse: \(message)")
  if let id = message["id"] as? String, let title = message["title"] as? String, let artist = message["artist"] as? String, let duration = message["duration"] as? Int, let streamURL = message["streamURL"] as? String, let validUntil = message["validUntil"] as? Int64, let coverURL = message["coverUrl"] as? String {
    print("Received Video Response for id: \(id)")
    let date = Date(timeIntervalSince1970: (Double(validUntil) / 1000.0))
    addDownloadData(DataController.shared.container.mainContext, id: id, title: title, duration: duration, streamURL: streamURL, validUntil: date, coverURL: coverURL, temp: message["temp"] as? Bool, downloadURL: message["downloadURL"] as? String)
  } else if let id = message["id"] as? String, let title = message["title"] as? String, let coverURL = message["coverUrl"] as? String {
    addDownloadData(DataController.shared.container.mainContext, id: id, title: title, duration: 0, coverURL: coverURL, temp: message["temp"] as? Bool)
  } else {
    print("YT Video Response incomplete")
  }
}

@MainActor
func savePlaylistResponse(_ session: WCSession, message: [String: Any], requestVideos: Bool = false) {
  if let id = message["id"] as? String, let title = message["title"] as? String, let coverURL = message["coverUrl"] as? String {
    print("Received Playlist Response for id: \(id)")
    let videos = message["videos"] as? [[String: Any]]
    let vIds = message["videoIds"] as? [String]
    
    guard let videoIds = videos?.compactMap({ video in
      if let id = video["id"] as? String {
        return id
      }
      return nil
    }) ?? vIds else {
      print("Error saving Playlist. No Video IDs provided")
      return
    }
    
    print("Playlist Videos: \(videos)")
    
    if requestVideos {
      videoIds.forEach { id in
        requestVideo(id: id)
      }
    } else if let videos = videos {
      videos.forEach { video in
        if let id = video["id"] as? String, let title = video["title"] as? String, let coverURL = video["coverUrl"] as? String {
          addDownloadData(DataController.shared.container.mainContext, id: id, title: title, duration: 0, validUntil: Date(), coverURL: coverURL)
          print("Saving Playlist Video ID: \(id)")
        } else {
          print("Playlist VideoData incomplete")
        }
      }
    } else {
      print("No Video data provided or fetched")
    }
    addPlaylistData(DataController.shared.container.mainContext, id: id, title: title, videoIds: videoIds, coverURL: coverURL, temp: message["temp"] as? Bool)
  } else {
    print("YT Playlist Response incomplete")
  }
}

@MainActor
func saveHomeScreenResponse(_ session: WCSession, message: [String: Any]) {
  print("Received Home Screen Response")
  if let sections = message["sections"] as? [[String: Any]], !sections.isEmpty {
    sections.forEach { section in
      if let title = section["title"] as? String, let data = section["data"] as? [[String: Any]] {
        let elements: [HomeScreenElement] = data.compactMap { sectionData in
          return parseHomeSectionData(session, data: sectionData)
        }
        print("Found elements: \(elements)")
        let section = addHomeScreenSection(DataController.shared.container.mainContext, title: title, date: Date())
        print("Section: \(section)")
        section?.elements = elements
      } else {
        print("Section Data incomplete")
      }
    }
  } else {
    print("YT Home Screen Response incomplete")
  }
}

@MainActor
func parseHomeSectionData(_ session: WCSession, data: [String: Any]) -> HomeScreenElement? {
  if let type = data["type"] as? String, let id = data["id"] as? String {
    if type == "playlist" {
      savePlaylistResponse(session, message: data, requestVideos: false)
      return addHomeScreenElement(DataController.shared.container.mainContext, videoID: nil, playlistID: id)
    } else if type == "video" {
      saveVideoResponse(session, message: data)
      return addHomeScreenElement(DataController.shared.container.mainContext, videoID: id, playlistID: nil)
    }
  }
  return nil
}
