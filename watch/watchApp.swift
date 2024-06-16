import SwiftUI
import SwiftData

struct ContentView: View {
    var body: some View {
      NavigationStack {
        HomeList()
      }
    }
}

@main
struct watchApp: App {
    @StateObject private var musicPlayerManager = MusicPlayerManager.shared
  
    @Environment(\.scenePhase) var scenePhase
    let session = SessionSyncStruct.shared
    var body: some Scene {
        WindowGroup {
          ContentView()
            .modelContainer(DataController.shared.container)
            .environmentObject(musicPlayerManager)
        }
    }
}
