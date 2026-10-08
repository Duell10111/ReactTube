//
//  SessionSync.swift
//  watch
//
//  Created by Konstantin Späth on 05.01.24.
//

import Foundation
import Observation
import WatchConnectivity

struct SessionSyncStruct {
  static let shared = SessionSync()

  init() {
    if WCSession.isSupported() {
      //let session = WCSession.default
        //session.delegate = self
        //session.activateSession()
    }
  }
}

@Observable
final class WatchStatus {
  static let shared = WatchStatus()

  private(set) var isReachable = false
  private(set) var activationState: WCSessionActivationState = .notActivated
  private(set) var isCompanionAppInstalled = false
  private(set) var lastError: String?

  private init() {}

  func update(from session: WCSession, activationError: Error? = nil) {
    updateOnMain {
      self.isReachable = session.isReachable
      self.activationState = session.activationState
      self.isCompanionAppInstalled = session.isCompanionAppInstalled
      if let activationError {
        self.lastError = activationError.localizedDescription
      }
    }
  }

  func setReachable(_ isReachable: Bool) {
    updateOnMain {
      self.isReachable = isReachable
    }
  }

  func setCompanionAppInstalled(_ isInstalled: Bool) {
    updateOnMain {
      self.isCompanionAppInstalled = isInstalled
    }
  }

  func reportError(_ message: String) {
    WatchLog.shared.error("Connectivity", message)
    updateOnMain {
      self.lastError = message
    }
  }

  func clearError() {
    updateOnMain {
      self.lastError = nil
    }
  }

  private func updateOnMain(_ update: @escaping () -> Void) {
    if Thread.isMainThread {
      update()
    } else {
      DispatchQueue.main.async(execute: update)
    }
  }
}

final class SessionSync: NSObject {

  var session = WCSession.default
  let status = WatchStatus.shared

  var applicationContext : [String: Any] = [:]

  override init() {
    super.init()
    print("SessionSync")
    if (WCSession.isSupported()) {
      session.delegate = self
      session.activate()
    }
  }

  /// Keeps a WatchConnectivity background task alive until the session is
  /// activated and all queued content has been delivered to the delegate.
  /// watchOS ends the background task once this returns.
  func waitForPendingContent(timeout: Duration = .seconds(25)) async {
    guard WCSession.isSupported() else { return }
    let clock = ContinuousClock()
    let deadline = clock.now.advanced(by: timeout)
    while clock.now < deadline {
      if session.activationState == .activated && !session.hasContentPending {
        break
      }
      try? await Task.sleep(for: .milliseconds(250))
    }
    // Delegate callbacks dispatch their work asynchronously; give them a moment
    // to persist before the app is suspended again.
    try? await Task.sleep(for: .seconds(1))
  }

}

extension SessionSync: WCSessionDelegate {
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    print("WCSession activationDidCompleteWith activationState:\(activationState) error:\(String(describing: error))")
    status.update(from: session, activationError: error)
    if activationState == .activated {
      Task { @MainActor in
        LibrarySync.shared.publishStatus()
      }
    }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    status.setReachable(session.isReachable)
    if session.isReachable {
      Task { @MainActor in
        LibrarySync.shared.sendSnapshotIfOutdated()
      }
    }
  }

  func sessionCompanionAppInstalledDidChange(_ session: WCSession) {
    status.setCompanionAppInstalled(session.isCompanionAppInstalled)
  }

  func session(_ session: WCSession, didReceiveApplicationContext appContext: [String: Any]) {
    debugPrint("WCSession didReceiveApplicationContext activationState:\(appContext)")
    applicationContext = appContext
    
    if(MusicPlayerManager.shared.type == .phone || !MusicPlayerManager.shared.isPlaying) {
      MusicPlayerManager.shared.applyPhonePlaybackState(
        title: appContext["title"] as? String,
        isPlaying: appContext["playing"] as? Bool
      )
    }
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any]) {
    print("WCSession didReceiveUserInfo userInfo:\(userInfo)")
    handleIncomingMessage(session, message: userInfo)
  }

  func session(_ session: WCSession, didFinish userInfoTransfer: WCSessionUserInfoTransfer, error: Error?) {
    if let error {
      print("WCSession user info transfer failed: \(error.localizedDescription), payload: \(userInfoTransfer.userInfo)")
      status.reportError("Transfer to the iPhone failed: \(error.localizedDescription)")
    } else {
      print("WCSession user info transfer finished: \(userInfoTransfer.userInfo)")
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
    print("WCSession didReceiveMessage message:\(message)")
    handleIncomingMessage(session, message: message)
  }

  private func handleIncomingMessage(_ session: WCSession, message: [String: Any]) {
    if(message["sendDatabase"] != nil) {
      Task {
        await self.sendDatabase(session)
      }
    } else if let type = message["type"] as? String, type == "overrideDB" {
      Task {
        await self.overrideDatabaseCommand(session, message: message)
      }
    } else if let type = message["type"] as? String {
      if type == "youtubeAPI", let payload = message["payload"] as? [String: Any] {
        processYoutubeAPIMessage(session, message: payload)
      } else if type == WatchLibraryProtocol.commandType {
        Task { @MainActor in
          await RemoteLibraryCommands.shared.handle(message)
        }
      }
    }
  }
  
  func session(_ session: WCSession, didReceiveMessageData messageData: Data) {
    print("WCSession didReceiveMessageData messageData:\(messageData)")
  }
  
  func session(_ session: WCSession, didReceiveMessageData messageData: Data, replyHandler: @escaping (Data) -> Void) {
    print("WCSession didReceiveMessageData with reply handler messageData:\(messageData)")
  }

  func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
    print("WCSession didReceiveMessage with reply handler message:\(message)")
    handleIncomingMessage(session, message: message)
    replyHandler(["received": true])
  }

  func session(_ session: WCSession, didReceive file: WCSessionFile) {
    print("WCSession didReceive File fileURL:\(file.fileURL)")
    let metadata = file.metadata ?? [:]
    // Older phone apps sent video files without a type, so only the id is required.
    guard let id = metadata["id"] as? String, !id.isEmpty else {
      WatchLog.shared.warning("Transfer", "Received file without video id ignored")
      return
    }
    // WatchConnectivity deletes the file as soon as this method returns, so it
    // has to be moved into the download directory synchronously.
    if metadata["type"] as? String == WatchLibraryProtocol.videoCoverType {
      let savedPath = saveDownloadFile(id: id, filePath: file.fileURL, fileExtension: metadata["fileExtension"] as? String, fileName: "cover")
      Task { @MainActor in
        RemoteLibraryCommands.shared.handleReceivedCover(id: id, savedPath: savedPath)
      }
      return
    }
    let savedPath = saveDownloadFile(id: id, filePath: file.fileURL, fileExtension: metadata["fileExtension"] as? String)
    Task { @MainActor in
      await RemoteLibraryCommands.shared.handleReceivedVideoFile(metadata: metadata, savedPath: savedPath)
    }
  }

  /// Called for transfers this watch started; only library snapshots are sent as files.
  func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: (any Error)?) {
    print("WCSession didFinish FileTranfer fileURL:\(fileTransfer.file.fileURL)")
    _ = LibrarySync.handleFinishedTransfer(fileTransfer, error: error)
  }

  @MainActor
  func sendDatabase(_ session: WCSession) async {
    // Database sync is currently disabled. Future payloads must use send(_:as:).
  }

  @MainActor
  func overrideDatabaseCommand(_ session: WCSession, message: [String: Any]) {
    if let jsonData = message["data"] as? String, let data = jsonData.data(using: .utf8) {
      let decoder = JSONDecoder()
      do {
        let backupFile = try decoder.decode(JSONBackupFile.self, from: data)
        overrideDatabase(modelContext: DataController.shared.container.mainContext, backupFile: backupFile)
      } catch {
        print("Exception in override Database \(error)")
      }

    } else {
      print("Json Decode issues")
    }
  }

}


struct DBFileData : Codable {
  var entries: [DBFileDiaryEntry]
}

struct DBFileDiaryEntry : Codable {
  var id: String
  var title: String?
  var date: Int?
  var content: [DBFileContent]
}

struct DBFileContent : Codable {
  var key: String
  var content: String
  var type: String
}

// BackupFile

// swiftlint:disable identifier_name
struct JSONBackupFile: Codable {
  var version: Int
  var videos: [JSONVideo]
}

struct JSONVideo: Codable  {
 var id: String;
 var title: String?;
 var duration: Int;
}

struct JSONDiaryEntry: Codable  {
  var _id: String;
  var date: String;
  var title: String?;
  var content: [JSONContent];
}

struct JSONContent: Codable  {
  var key: String;
  var content: String?;
  var type: String;
  var groupID: String?;
}
// swiftlint:enable identifier_name
