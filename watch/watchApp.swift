import SwiftUI
import SwiftData

struct ContentView: View {
    var body: some View {
      NavigationStack {
        MusicPlayerView()
      }
    }
}

@main
struct watchApp: App {
    @Environment(\.scenePhase) var scenePhase
    let session = SessionSyncStruct.shared
    var body: some Scene {
        WindowGroup {
          ContentView().modelContainer(DataController.shared.container)
        }
    }
}
