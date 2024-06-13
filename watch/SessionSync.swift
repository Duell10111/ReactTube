//
//  SessionSync.swift
//  watch
//
//  Created by Konstantin Späth on 05.01.24.
//

import Foundation
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

class SessionSync : NSObject, ObservableObject {

  var session = WCSession.default

  var applicationContext : [String: Any] = [:]

  override init() {
    super.init()
    print("SessionSync")
    if (WCSession.isSupported()) {
      session.delegate = self
      session.activate()
    }
  }

}

extension SessionSync: WCSessionDelegate {
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    print("WCSession activationDidCompleteWith activationState:\(activationState) error:\(String(describing: error))")
  }

  func session(_ session: WCSession, didReceiveApplicationContext appContext: [String: Any]) {
    debugPrint("WCSession didReceiveApplicationContext activationState:\(appContext)")
    applicationContext = appContext
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any]) {
    print("WCSession didReceiveUserInfo userInfo:\(userInfo)")
  }

  func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
    print("WCSession didReceiveMessage message:\(message)")
    if(message["sendDatabase"] != nil) {
      Task {
        await self.sendDatabase(session)
      }
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
    print("WCSession didReceiveMessage with reply handler message:\(message)")
    if(message["sendDatabase"] != nil) {
      Task {
        await self.sendDatabase(session)
      }
    } else if let type = message["type"] as? String, type == "overrideDB" {
      Task {
        await self.overrideDatabaseCommand(session, message: message)
      }
    } else if let type = message["type"] as? String {
      if(type == "uploadFile") {
        Task {
          await self.receiveFileUploadData(session, message: message)
        }
      }
    }
  }

  func session(_ session: WCSession, didReceive file: WCSessionFile) {
    // TODO: Do sth?
  }

  func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: (any Error)?) {
    print("WCSession didFinish FileTranfer fileURL:\(fileTransfer.file.fileURL)")

    // Update fileURL for Download URL use metadata
    // Use fileTransfer.file.metadata id to update DB and set downloaded flag
  }

  @MainActor
  func sendDatabase(_ session: WCSession) async {
//    let data = exportDatabase(modelContext: DataController.shared.container.mainContext)
//    let json = JSONEncoder()
//    do {
//      let jsonValue = try json.encode(data)
//      let str = String(decoding: jsonValue, as: UTF8.self)
//      let msg = [
//        "type": "DBSyncFromWatch",
//        "data": str
//      ]
//      session.sendMessage(msg, replyHandler: nil)
//    } catch {
//      print("Error sending database")
//    }
  }

  @MainActor
  func overrideDatabaseCommand(_ session: WCSession, message: [String: Any]) {
//    if let jsonData = message["data"] as? String, let data = jsonData.data(using: .utf8) {
//      let decoder = JSONDecoder()
//      do {
//        let backupFile = try decoder.decode(JSONBackupFile.self, from: data)
//        overrideDatabase(modelContext: DataController.shared.container.mainContext, backupFile: backupFile)
//      } catch {
//        print("Exception in override Database \(error)")
//      }
//
//    } else {
//      print("Json Decode issues")
//    }
  }

  @MainActor
  func receiveFileUploadData(_ session: WCSession, message: [String: Any]) {
    if let id = message["id"] as? String, let title = message["title"] as? String, let duration = message["duration"] as? Int {
      addDownloadData(DataController.shared.container.mainContext, id: id, title: title)
      // Add Data before receiving file
    } else {
      print("File Upload data incomplete")
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
  var diary: [JSONDiary]
  var diaryEntry: [JSONDiaryEntry];
}

struct JSONDiary: Codable  {
 var _id: String;
 var main: Bool?;
 var name: String?;
 var diaryEntries: [String];
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
