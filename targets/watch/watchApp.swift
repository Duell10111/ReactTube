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
  @State private var dataController = DataController.shared
  @State private var musicPlayerManager = MusicPlayerManager.shared
  @State private var downloadManager = DownloadManager.shared
  @State private var watchStatus = WatchStatus.shared

  let session = SessionSyncStruct.shared

  var body: some Scene {
    WindowGroup {
      if let container = dataController.container {
        ContentView()
          .modelContainer(container)
          .environment(musicPlayerManager)
          .environment(downloadManager)
          .environment(watchStatus)
          .task {
            LibrarySync.shared.start()
            await downloadManager.restore()
            LibrarySync.shared.publishStatus()
          }
      } else {
        DatabaseRecoveryView(controller: dataController)
      }
    }.backgroundTask(.urlSession) { id in
      await downloadManager.handleBackgroundEvents(identifier: id)
    }.backgroundTask(.watchConnectivity) {
      // Phone commands can queue downloads without the UI ever appearing.
      await downloadManager.restore()
      await SessionSyncStruct.shared.waitForPendingContent()
    }
  }
}

/// Kept outside the model-backed UI so an unreadable store cannot hide recovery.
private struct DatabaseRecoveryView: View {
  let controller: DataController
  @State private var confirmRebuild = false
  @AppStorage("uiLanguage") private var uiLanguage = Locale.current.language.languageCode?.identifier == "de" ? "de" : "en"

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 12) {
          Button(WatchStabilityCopy.text(.switchLanguage)) { uiLanguage = uiLanguage == "de" ? "en" : "de" }
            .accessibilityLabel(WatchStabilityCopy.text(.appLanguage))
          if controller.state == .loading {
            ProgressView(DatabaseRecoveryCopy.loading)
          } else {
            Label(DatabaseRecoveryCopy.title, systemImage: "externaldrive.badge.exclamationmark")
            Text(DatabaseRecoveryCopy.explanation)
            if let failure = controller.failure {
              Text(failure).font(.footnote).foregroundStyle(.secondary)
            }
            if let backup = controller.lastBackupURL {
              VStack(alignment: .leading) {
                Text(DatabaseRecoveryCopy.backup)
                Text(backup.lastPathComponent)
              }.font(.footnote).foregroundStyle(.secondary)
            }
            Button(DatabaseRecoveryCopy.retry) { controller.retry() }
            Button(DatabaseRecoveryCopy.rebuild, role: .destructive) { confirmRebuild = true }
          }
        }
      }
      .alert(DatabaseRecoveryCopy.rebuild, isPresented: $confirmRebuild) {
        Button(DatabaseRecoveryCopy.rebuild, role: .destructive) {
          DownloadManager.shared.cancelAll()
          MusicPlayerManager.shared.preferences.clearResumeState()
          controller.rebuildStore()
        }
        Button(DatabaseRecoveryCopy.cancel, role: .cancel) {}
      } message: {
        Text(DatabaseRecoveryCopy.confirmation)
      }
    }
  }
}

private enum DatabaseRecoveryCopy {
  static var loading: String { WatchStabilityCopy.text(.recoveryLoading) }
  static var title: String { WatchStabilityCopy.text(.recoveryTitle) }
  static var explanation: String { WatchStabilityCopy.text(.recoveryExplanation) }
  static var retry: String { WatchStabilityCopy.text(.recoveryRetry) }
  static var rebuild: String { WatchStabilityCopy.text(.recoveryRebuild) }
  static var cancel: String { WatchStabilityCopy.text(.recoveryCancel) }
  static var confirmation: String { WatchStabilityCopy.text(.recoveryConfirmation) }
  static var backup: String { WatchStabilityCopy.text(.recoveryBackup) }
}
