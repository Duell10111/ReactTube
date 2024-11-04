import SwiftUI
import SwiftData
import SDDownloadManager
import Sentry

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
  
  init() {
    SentrySDK.start { options in
        options.dsn = "https://166fe4f76bbf12d1e6b74e14a3020136@o4508214540042240.ingest.de.sentry.io/4508214606233680"
        options.debug = true // Enabled debug when first installing is always helpful

        // Enable tracing to capture 100% of transactions for tracing.
        // Use 'options.tracesSampleRate' to set the sampling rate.
        // We recommend setting a sample rate in production.
        options.enableTracing = true
    }
  }
  
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
