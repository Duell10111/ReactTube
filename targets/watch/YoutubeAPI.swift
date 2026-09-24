//
//  YoutubeAPI.swift
//  watch
//
//  Created by Konstantin Späth on 13.06.24.
//

import Foundation
import WatchConnectivity

enum Delivery {
  case interactive
  case guaranteed
}

func send(_ payload: [String: Any], as delivery: Delivery) {
  let sessionSync = SessionSyncStruct.shared
  let session = sessionSync.session

  guard PropertyListSerialization.propertyList(payload, isValidFor: .binary) else {
    sessionSync.status.reportError("The message contains unsupported data.")
    print("WCSession rejected non-property-list payload: \(payload)")
    return
  }

  switch delivery {
  case .interactive:
    guard session.isReachable else {
      sessionSync.status.reportError("The iPhone is currently not reachable.")
      return
    }

    sessionSync.status.clearError()
    session.sendMessage(payload, replyHandler: nil) { error in
      sessionSync.status.reportError(error.localizedDescription)
    }
  case .guaranteed:
    guard session.activationState == .activated else {
      sessionSync.status.reportError("Watch Connectivity is not active yet.")
      return
    }

    // transferUserInfo is not supported by the Watch simulator. Prefer the
    // immediate channel while both apps are reachable and queue the payload
    // only when live delivery is unavailable (or fails).
    if session.isReachable {
      session.sendMessage(payload, replyHandler: nil) { error in
        WatchLog.shared.warning("Connectivity", "Direct delivery failed, request queued: \(error.localizedDescription)")
        guard session.activationState == .activated else {
          sessionSync.status.reportError(error.localizedDescription)
          return
        }
        session.transferUserInfo(payload)
      }
    } else {
      WatchLog.shared.info("Connectivity", "iPhone not reachable, request queued")
      session.transferUserInfo(payload)
    }
  }
}

private func sendVideoAPIMessage(message: [String: Any]) {
  send(["type": "youtubeAPI", "payload": message], as: .guaranteed)
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
  send(["type": "PhoneNext"], as: .interactive)
}

func previousTitleOnPhone() {
  send(["type": "PhonePrev"], as: .interactive)
}

func pausePlayOnPhone() {
  send(["type": "PhonePausePlay"], as: .interactive)
}

// Update from watch to phone

func sendPlaylistStateToPhone(_ playlist: Playlist) {
  sendVideoAPIMessage(message: ["request": "playlist-sync", "playlistId": playlist.id, "videoIds": playlist.videoIDs])
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
    addDownloadData(DataController.shared.container.mainContext, id: id, title: title, artist: artist, duration: duration, streamURL: streamURL, validUntil: date, coverURL: coverURL, temp: message["temp"] as? Bool, downloadURL: message["downloadURL"] as? String)
  } else if let id = message["id"] as? String, let title = message["title"] as? String, let coverURL = message["coverUrl"] as? String {
    addDownloadData(DataController.shared.container.mainContext, id: id, title: title, duration: 0, coverURL: coverURL, temp: message["temp"] as? Bool)
  } else {
    print("YT Video Response incomplete")
  }
}

@MainActor
func savePlaylistResponse(_ session: WCSession, message: [String: Any], requestVideos: Bool = false) {
  if let id = message["id"] as? String, let title = message["title"] as? String {
    print("Received Playlist Response for id: \(id)")
    let coverURL = message["coverUrl"] as? String
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
        if let id = video["id"] as? String, let title = video["title"] as? String {
          // Use expired date as no video urls are present
          addDownloadData(DataController.shared.container.mainContext, id: id, title: title, duration: 0, validUntil: Calendar.current.date(byAdding: .hour, value: -2, to: Date()), coverURL: video["coverUrl"] as? String, temp: message["temp"] as? Bool)
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
