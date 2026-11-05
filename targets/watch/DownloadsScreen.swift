//
//  DownloadsScreen.swift
//  RT-Watch
//
//  Overview of all downloads: running and queued transfers, failures,
//  finished downloads and the storage they occupy.
//

import SwiftData
import SwiftUI

struct DownloadsScreen: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Environment(DownloadManager.self) private var downloadManager: DownloadManager
  @Environment(\.modelContext) private var modelContext

  /// Resolves the ids of the download queues, which only know the video id.
  @Query private var videos: [Video]
  @Query(
    filter: #Predicate<Video> { video in
      video.downloaded == true
    }, sort: \Video.title, order: .forward) private var downloadedVideos: [Video]

  @Environment(\.locale) private var locale
  @State private var unavailable = false
  private let sortPreferences = LibrarySortPreferences.shared
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
    let selection = sortPreferences.selection(.downloaded)
    let ordered = LibrarySorter.videos(downloadedVideos, selection: selection, locale: locale)
    LibrarySnapshotList(values: ordered, revision: "\(selection)-\(locale.identifier)") {
      snapshot in
      SortHeaderButton(scope: .downloaded).id("sort")
      Button(LibraryCopy.text("library.shuffle"), systemImage: "shuffle") {
        if let first = snapshot.shuffled().first {
          let shuffled = [first] + snapshot.filter { $0.id != first.id }.shuffled()
          unavailable = !musicPlayerManager.startLibraryQueue(shuffled, selectedID: first.id)
        }
      }.disabled(snapshot.isEmpty)
      Section {
        storageRow
      }

      if !downloadManager.activeDownloads.isEmpty {
        Section(LibraryCopy.text("library.downloading")) {
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
        Section(LibraryCopy.text("library.queued")) {
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
                Label(LibraryCopy.text("library.dismiss"), systemImage: "xmark")
              }
            }
          }
        } header: {
          Text(LibraryCopy.text("library.failed"))
        } footer: {
          Text(LibraryCopy.text("library.retryHint"))
        }
      }

      Section(LibraryCopy.text("library.downloaded")) {
        if downloadedVideos.isEmpty {
          Text(LibraryCopy.text("library.noDownloads"))
            .font(.footnote)
            .foregroundStyle(.secondary)
        } else {
          ForEach(snapshot, id: \.id) { video in
            VStack(alignment: .leading) {
              MusicListItemView(video: video) {
                unavailable = !musicPlayerManager.startLibraryQueue(snapshot, selectedID: video.id)
              } onDelete: {
                videoToDelete = video
              }
              SortValueLabel(video: video, selection: selection, now: Date())
            }.librarySnapshotRow(video.id)
          }
        }
      }
    }
    .alert(LibraryCopy.text("unavailable"), isPresented: $unavailable) {
      Button(LibraryCopy.text("cancel"), role: .cancel) {}
    }
    .navigationTitle(LibraryCopy.text("library.downloads"))
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        if hasRunningWork {
          Button {
            confirmCancelAll = true
          } label: {
            Label(LibraryCopy.text("library.cancelAll"), systemImage: "xmark.circle")
          }
        } else {
          NavigationLink(destination: MusikPlayer()) {
            Label(LibraryCopy.text("library.music"), systemImage: "playpause.circle")
          }
        }
      }
    }
    .confirmationDialog(LibraryCopy.text("library.cancelAllPrompt"), isPresented: $confirmCancelAll)
    {
      Button(LibraryCopy.text("library.cancelAll"), role: .destructive) {
        downloadManager.cancelAll()
      }
      Button(LibraryCopy.text("library.keep"), role: .cancel) {}
    }
    .confirmationDialog(
      LibraryCopy.format(
        "playlist.delete", videoToDelete?.title ?? LibraryCopy.text("library.download")),
      isPresented: Binding(
        get: { videoToDelete != nil },
        set: { if !$0 { videoToDelete = nil } }
      )
    ) {
      Button(LibraryCopy.text("library.delete"), role: .destructive) {
        if let video = videoToDelete {
          deleteDownload(id: video.id)
        }
        videoToDelete = nil
      }
      Button(LibraryCopy.text("library.cancel"), role: .cancel) {
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
        Text(LibraryCopy.format("download.used", usedBytes.map(formatBytes) ?? "…"))
        if let availableBytes {
          Text(LibraryCopy.format("download.free", formatBytes(availableBytes)))
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
      Label(LibraryCopy.text("library.cancel"), systemImage: "xmark")
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
      Label(LibraryCopy.text("library.waitingPhone"), systemImage: "iphone")
    case .queued:
      Label(LibraryCopy.text("library.queued"), systemImage: "clock")
    case .failed(let reason):
      Label(
        reason.isEmpty ? LibraryCopy.text("library.failed") : reason,
        systemImage: "exclamationmark.triangle"
      )
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
