//
//  DiagnosticsScreen.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 23.09.26.
//

import SwiftUI
import SwiftData
import WatchConnectivity

/// Shows the state that otherwise only exists in the Xcode console: connection to
/// the iPhone, player, downloads and database.
struct DiagnosticsScreen: View {
    @Environment(MusicPlayerManager.self) private var musicManager: MusicPlayerManager
    @Environment(DownloadManager.self) private var downloadManager: DownloadManager
    @Environment(WatchStatus.self) private var watchStatus: WatchStatus

    @Query var videos: [Video]
    @Query var playlists: [Playlist]
    @Query var homeSections: [HomeScreenSection]

    @State private var downloadSize: Int64?

    private var downloadedCount: Int {
      videos.filter { $0.downloaded }.count
    }

    private var expiredCount: Int {
      videos.filter { !$0.downloaded && ($0.validUntil ?? Date.distantPast) < Date() }.count
    }

    var body: some View {
      List {
        Section("iPhone") {
          DiagnosticsRow(label: "Reachable", value: watchStatus.isReachable ? "yes" : "no")
          DiagnosticsRow(label: "Session", value: activationStateLabel(watchStatus.activationState))
          DiagnosticsRow(label: "App installed", value: watchStatus.isCompanionAppInstalled ? "yes" : "no")
          if let lastError = watchStatus.lastError {
            DiagnosticsRow(label: "Last error", value: lastError)
          }
        }

        Section("Player") {
          DiagnosticsRow(label: "Source", value: musicManager.type == .local ? "watch" : "iPhone")
          DiagnosticsRow(label: "State", value: musicManager.isPlaying ? "playing" : "paused")
          DiagnosticsRow(label: "Title", value: musicManager.currentTitle)
          DiagnosticsRow(
            label: "Position",
            value: "\(formatPlaybackTime(musicManager.currentTime)) / \(formatPlaybackTime(musicManager.duration))"
          )
          DiagnosticsRow(
            label: "Queue",
            value: "\(musicManager.playerPlaylistItems.isEmpty ? 0 : musicManager.trackIndex + 1) of \(musicManager.playerPlaylistItems.count)"
          )
          DiagnosticsRow(label: "Repeat", value: musicManager.preferences.repeatMode.label)
          DiagnosticsRow(label: "Shuffle", value: musicManager.preferences.shuffleEnabled ? "on" : "off")
          if let resume = musicManager.preferences.resumeState {
            DiagnosticsRow(
              label: "Continue",
              value: "\(resume.title) · \(formatPlaybackTime(resume.position))"
            )
          }
        }

        Section("Downloads") {
          DiagnosticsRow(label: "Active", value: "\(downloadManager.activeDownloads.count)")
          DiagnosticsRow(label: "Waiting", value: "\(downloadManager.pendingDownloads.count)")
          DiagnosticsRow(label: "On disk", value: downloadSize.map(formatBytes) ?? "…")
          ForEach(downloadManager.activeDownloads, id: \.id) { download in
            let progress = downloadManager.progressDownloads[download.id]
            DiagnosticsRow(
              label: download.id,
              value: progress.map { "\(Int($0 * 100)) %" } ?? "started"
            )
          }
        }

        Section("Database") {
          DiagnosticsRow(label: "Titles", value: "\(videos.count)")
          DiagnosticsRow(label: "Downloaded", value: "\(downloadedCount)")
          DiagnosticsRow(label: "Expired", value: "\(expiredCount)")
          DiagnosticsRow(label: "Playlists", value: "\(playlists.count)")
          DiagnosticsRow(label: "Home sections", value: "\(homeSections.count)")
        }

        Section("Events") {
          NavigationLink("Event Log (\(WatchLog.shared.entries.count))") {
            EventLogScreen()
          }
          ForEach(WatchLog.shared.entries.prefix(3)) { entry in
            EventLogRow(entry: entry)
          }
        }
      }
      .navigationTitle("Diagnostics")
      .task {
        downloadSize = await directorySize(getDownloadDirectory())
      }
    }

    private func activationStateLabel(_ state: WCSessionActivationState) -> String {
      switch state {
      case .activated: return "active"
      case .inactive: return "inactive"
      case .notActivated: return "not activated"
      @unknown default: return "unknown"
      }
    }
}

struct DiagnosticsRow: View {
    var label: String
    var value: String

    var body: some View {
      VStack(alignment: .leading, spacing: 1) {
        Text(label)
          .font(.system(size: 12))
          .foregroundStyle(.secondary)
        Text(value)
          .font(.system(size: 14))
      }
    }
}

struct EventLogScreen: View {
    @State private var log = WatchLog.shared

    var body: some View {
      List {
        if log.entries.isEmpty {
          Text("No events recorded yet.")
            .foregroundStyle(.secondary)
        }
        ForEach(log.entries) { entry in
          EventLogRow(entry: entry)
        }
        if !log.entries.isEmpty {
          Button("Clear") {
            log.clear()
          }
        }
      }
      .navigationTitle("Event Log")
    }
}

struct EventLogRow: View {
    var entry: WatchLogEntry

    private static let timeFormatter: DateFormatter = {
      let formatter = DateFormatter()
      formatter.dateFormat = "HH:mm:ss"
      return formatter
    }()

    private var color: Color {
      switch entry.level {
      case .info: return .secondary
      case .warning: return .yellow
      case .error: return .red
      }
    }

    var body: some View {
      VStack(alignment: .leading, spacing: 1) {
        HStack(spacing: 4) {
          Image(systemName: entry.level.symbolName)
          Text(Self.timeFormatter.string(from: entry.date))
          Text(entry.category)
        }
        .font(.system(size: 11))
        .foregroundStyle(color)
        Text(entry.message)
          .font(.system(size: 13))
      }
    }
}

/// Size of the download folder. Used to tell "nothing downloaded" from "the
/// database entry is missing" on the device.
func directorySize(_ url: URL) async -> Int64 {
  await withCheckedContinuation { continuation in
    DispatchQueue.global(qos: .utility).async {
      var total: Int64 = 0
      if let enumerator = FileManager.default.enumerator(
        at: url,
        includingPropertiesForKeys: [.fileSizeKey, .isRegularFileKey]
      ) {
        for case let fileURL as URL in enumerator {
          let values = try? fileURL.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
          if values?.isRegularFile == true, let size = values?.fileSize {
            total += Int64(size)
          }
        }
      }
      continuation.resume(returning: total)
    }
  }
}

func formatBytes(_ bytes: Int64) -> String {
  let formatter = ByteCountFormatter()
  formatter.countStyle = .file
  return formatter.string(fromByteCount: bytes)
}

#Preview {
  NavigationStack {
    DiagnosticsScreen()
  }
  .modelContext(DataController.previewContainer.mainContext)
  .environment(MusicPlayerManager.shared)
  .environment(DownloadManager.shared)
  .environment(WatchStatus.shared)
}
