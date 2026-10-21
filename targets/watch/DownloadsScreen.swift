//
//  DownloadsScreen.swift
//  RT-Watch
//
//  Overview of all downloads: running and queued transfers, failures,
//  finished downloads and the storage they occupy.
//

import SwiftUI
import SwiftData

struct DownloadsScreen: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Environment(DownloadManager.self) private var downloadManager: DownloadManager
  @Environment(\.modelContext) private var modelContext

  /// Resolves the ids of the download queues, which only know the video id.
  @Query private var videos: [Video]
  @Query(filter: #Predicate<Video> { video in
    video.downloaded == true
  }, sort: \Video.title, order: .forward) private var downloadedVideos: [Video]

  @State private var usedBytes: Int64?
  @State private var availableBytes: Int64?
  @State private var confirmCancelAll = false
  @State private var videoToDelete: Video?

  private var videosById: [String: Video] {
    Dictionary(videos.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
  }

  private var queuedVideos: [Video] {
    downloadManager.pendingDownloads.sorted { ($0.title ?? $0.id) < ($1.title ?? $1.id) }
  }

  private var failedIds: [String] {
    downloadManager.failedDownloads.keys.sorted()
  }

  private var hasRunningWork: Bool {
    !downloadManager.activeDownloads.isEmpty
      || !downloadManager.pendingDownloads.isEmpty
      || !downloadManager.awaitingMetadata.isEmpty
  }

  var body: some View {
    let videosById = videosById
    List {
      Section {
        storageRow
      }

      if !downloadManager.activeDownloads.isEmpty {
        Section("Downloading") {
          ForEach(downloadManager.activeDownloads, id: \.id) { download in
            DownloadQueueRow(
              id: download.id,
              video: videosById[download.id],
              status: .progress(downloadManager.progressDownloads[download.id] ?? 0)
            )
            .swipeActions { cancelButton(id: download.id) }
          }
        }
      }

      if !downloadManager.awaitingMetadata.isEmpty || !queuedVideos.isEmpty {
        Section("Queued") {
          ForEach(downloadManager.awaitingMetadata.sorted(), id: \.self) { id in
            DownloadQueueRow(id: id, video: videosById[id], status: .waitingForPhone)
              .swipeActions { cancelButton(id: id) }
          }
          ForEach(queuedVideos, id: \.id) { video in
            DownloadQueueRow(id: video.id, video: video, status: .queued)
              .swipeActions { cancelButton(id: video.id) }
          }
        }
      }

      if !failedIds.isEmpty {
        Section {
          ForEach(failedIds, id: \.self) { id in
            Button {
              downloadManager.retry(id: id)
            } label: {
              DownloadQueueRow(
                id: id,
                video: videosById[id],
                status: .failed(downloadManager.failedDownloads[id] ?? "")
              )
            }
            .swipeActions {
              Button {
                downloadManager.cancel(ids: [id])
              } label: {
                Label("Dismiss", systemImage: "xmark")
              }
            }
          }
        } header: {
          Text("Failed")
        } footer: {
          Text("Tap to try again.")
        }
      }

      Section("Downloaded") {
        if downloadedVideos.isEmpty {
          Text("No downloads yet. Swipe a title or playlist to download it.")
            .font(.footnote)
            .foregroundStyle(.secondary)
        } else {
          Button("Shuffle", systemImage: "shuffle") {
            musicPlayerManager.updatePlaylist(newPlaylist: downloadedVideos.shuffled())
          }
          ForEach(Array(downloadedVideos.enumerated()), id: \.element.id) { index, video in
            MusicListItemView(video: video) {
              musicPlayerManager.updatePlaylist(newPlaylist: Array(downloadedVideos[index...]))
            } onDelete: {
              videoToDelete = video
            }
          }
        }
      }
    }
    .navigationTitle("Downloads")
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        if hasRunningWork {
          Button {
            confirmCancelAll = true
          } label: {
            Label("Cancel All", systemImage: "xmark.circle")
          }
        } else {
          NavigationLink(destination: MusikPlayer()) {
            Label("Music", systemImage: "playpause.circle")
          }
        }
      }
    }
    .confirmationDialog("Cancel all running and queued downloads?", isPresented: $confirmCancelAll) {
      Button("Cancel All", role: .destructive) {
        downloadManager.cancelAll()
      }
      Button("Keep", role: .cancel) {}
    }
    .confirmationDialog(
      "Delete \(videoToDelete?.title ?? "download")?",
      isPresented: Binding(
        get: { videoToDelete != nil },
        set: { if !$0 { videoToDelete = nil } }
      )
    ) {
      Button("Delete", role: .destructive) {
        if let video = videoToDelete {
          deleteDownload(id: video.id)
        }
        videoToDelete = nil
      }
      Button("Cancel", role: .cancel) {
        videoToDelete = nil
      }
    }
    // Recomputed whenever a download finishes or is removed.
    .task(id: downloadedVideos.count) {
      usedBytes = await directorySize(getDownloadDirectory())
      availableBytes = LibrarySnapshotBuilder.availableBytes()
    }
  }

  private var storageRow: some View {
    HStack(spacing: 8) {
      Image(systemName: "internaldrive")
        .foregroundStyle(.secondary)
      VStack(alignment: .leading, spacing: 1) {
        Text("\(usedBytes.map(formatBytes) ?? "…") used")
        if let availableBytes {
          Text("\(formatBytes(availableBytes)) free")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      }
    }
  }

  private func cancelButton(id: String) -> some View {
    Button {
      downloadManager.cancel(ids: [id])
    } label: {
      Label("Cancel", systemImage: "xmark")
    }
    .tint(.red)
  }

  private func deleteDownload(id: String) {
    downloadManager.cancel(ids: [id])
    deleteDownloadedVideo(modelContext, id: id)
    do {
      try modelContext.save()
    } catch {
      WatchLog.shared.error("Download", "Saving after delete failed: \(error.localizedDescription)")
    }
  }
}

/// State of a title that is not downloaded yet.
enum DownloadQueueStatus {
  case progress(Double)
  case waitingForPhone
  case queued
  case failed(String)
}

/// Title row for the download queues. Falls back to the id while the metadata
/// of a title requested by the phone has not arrived yet.
struct DownloadQueueRow: View {
  var id: String
  var video: Video?
  var status: DownloadQueueStatus

  var body: some View {
    HStack(spacing: 8) {
      if let video {
        VideoCoverView(video: video)
      }
      VStack(alignment: .leading, spacing: 2) {
        Text(video?.title ?? id)
          .lineLimit(2)
        statusView
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
      Spacer(minLength: 0)
    }
  }

  @ViewBuilder
  private var statusView: some View {
    switch status {
    case .progress(let value):
      ProgressView(value: value) {
        Text(videoDownloadProgressFormatter.string(from: NSNumber(value: value)) ?? "")
      }
    case .waitingForPhone:
      Label("Waiting for iPhone", systemImage: "iphone")
    case .queued:
      Label("Queued", systemImage: "clock")
    case .failed(let reason):
      Label(reason.isEmpty ? "Failed" : reason, systemImage: "exclamationmark.triangle")
        .foregroundStyle(.red)
        .lineLimit(3)
    }
  }
}

#Preview {
  NavigationStack {
    DownloadsScreen()
  }
  .modelContext(DataController.previewContainer.mainContext)
  .environment(MusicPlayerManager.shared)
  .environment(DownloadManager.shared)
}
