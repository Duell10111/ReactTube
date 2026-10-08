import SwiftUI
import SwiftData
import SDDownloadManager

struct ContentView: View {
    var body: some View {
      NavigationStack {
        HomeList()
      }
    }
}

@main
struct watchApp: App {
    @State private var musicPlayerManager = MusicPlayerManager.shared
    @State private var downloadManager = DownloadManager.shared
    @State private var watchStatus = WatchStatus.shared
  
    @Environment(\.scenePhase) var scenePhase
    let session = SessionSyncStruct.shared

    init() {
      LibrarySync.shared.start()
    }

    var body: some Scene {
        WindowGroup {
          ContentView()
            .modelContainer(DataController.shared.container)
            .environment(musicPlayerManager)
            .environment(downloadManager)
            .environment(watchStatus)
        }.backgroundTask(.urlSession) { id in
          debugPrint("handleEventsForBackgroundURLSession: \(id)")
          // TODO: Adapt for DownloadManager
        }.backgroundTask(.watchConnectivity) {
          // Lets queued phone commands (transferUserInfo) run without the app
          // being in the foreground, as far as watchOS allows.
          await SessionSyncStruct.shared.waitForPendingContent()
        }
    }
}
