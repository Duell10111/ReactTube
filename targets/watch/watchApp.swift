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
  
    @Environment(\.scenePhase) var scenePhase
    let session = SessionSyncStruct.shared
    var body: some Scene {
        WindowGroup {
          ContentView()
            .modelContainer(DataController.shared.container)
            .environment(musicPlayerManager)
            .environment(downloadManager)
        }.backgroundTask(.urlSession) { id in
          debugPrint("handleEventsForBackgroundURLSession: \(id)")
          // TODO: Adapt for DownloadManager
        }
    }
}
