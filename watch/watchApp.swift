import SwiftUI


struct ContentView: View {
    var body: some View {
        MusikPlayer()
    }
}

@main
struct watchApp: App {
    @Environment(\.scenePhase) var scenePhase
    let session = SessionSyncStruct.shared
    var body: some Scene {
        WindowGroup {
          ContentView()
//            .modelContainer(DataController.shared.container)
        }
    }
}
