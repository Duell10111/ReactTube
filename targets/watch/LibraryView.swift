//
//  LibraryView.swift
//  watch
//
//  Created by Konstantin Späth on 01.07.24.
//

import SwiftData
import SwiftUI

struct LibraryView: View {
  @Environment(DownloadManager.self) private var downloadManager: DownloadManager

  /// Only shown while something is in flight, so the row stays a single line otherwise.
  private var downloadsSummary: LocalizedStringKey? {
    let running =
      downloadManager.activeDownloads.count
      + downloadManager.pendingDownloads.count
      + downloadManager.awaitingMetadata.count
    if running > 0 {
      return LocalizedStringKey(LibraryCopy.format("download.running", running.formatted()))
    }
    if !downloadManager.failedDownloads.isEmpty {
      return LocalizedStringKey(
        LibraryCopy.format("download.failed", downloadManager.failedDownloads.count.formatted()))
    }
    return nil
  }

  var body: some View {
    List {
      NavigationLink {
        LibraryPlaylists()
      } label: {
        MenuIconLabel(
          title: LibraryCopy.text("library.playlists"), systemImage: "music.note.list", color: .red)
      }
      NavigationLink {
        LibraryVideos()
      } label: {
        MenuIconLabel(
          title: LibraryCopy.text("library.videos"), systemImage: "play.rectangle.fill",
          color: .orange)
      }
      NavigationLink {
        DownloadsScreen()
      } label: {
        MenuIconLabel(
          title: LibraryCopy.text("library.downloads"), subtitle: downloadsSummary,
          systemImage: "arrow.down.circle.fill", color: .blue)
      }
      NavigationLink {
        LibraryAvailableVideos()
      } label: {
        MenuIconLabel(
          title: LibraryCopy.text("library.available"), systemImage: "clock.fill", color: .green)
      }
    }.toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink(destination: MusikPlayer()) {
          Label(LibraryCopy.text("library.music"), systemImage: "playpause.circle")
        }
      }
    }
  }
}

struct LibraryPlaylists: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Query(
    filter: #Predicate<Playlist> { playlist in
      playlist.temp == false || playlist.temp == nil
    }, sort: \Playlist.title, order: .forward) var playlists: [Playlist]
  @Query(
    filter: #Predicate<Playlist> { playlist in
      playlist.temp == true
    }, sort: \Playlist.title, order: .forward) var tempPlaylists: [Playlist]

  @Environment(\.locale) private var locale
  private let sortPreferences = LibrarySortPreferences.shared
  var body: some View {
    let selection = sortPreferences.selection(.playlists)
    let values =
      LibrarySorter.playlists(playlists, selection: selection, locale: locale)
      + LibrarySorter.playlists(tempPlaylists, selection: selection, locale: locale)
    LibrarySnapshotList(values: values, revision: "\(selection)-\(locale.identifier)") { snapshot in
      SortHeaderButton(scope: .playlists).id("sort")
      if snapshot.isEmpty { Text(LibraryCopy.text("empty")) }
      Section(LibraryCopy.text("library.ownPlaylists")) {
        ForEach(snapshot.filter { $0.temp != true }, id: \.id) { playlist in
          LibraryPlaylistListItem(playlist: playlist).librarySnapshotRow(playlist.id)
        }
        Button(LibraryCopy.text("library.refresh"), systemImage: "arrow.clockwise") {
          requestLibraryPlaylists()
        }
      }
      Section(LibraryCopy.text("library.temporaryPlaylists")) {
        ForEach(snapshot.filter { $0.temp == true }, id: \.id) { playlist in
          LibraryPlaylistListItem(playlist: playlist).librarySnapshotRow(playlist.id)
        }
      }
    }.navigationTitle(LibraryCopy.text("library.playlists"))
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink(destination: MusikPlayer()) {
          Label(LibraryCopy.text("library.music"), systemImage: "playpause.circle")
        }
      }
    }
  }
}

struct LibraryPlaylistListItem: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Environment(\.modelContext) var modelContext
  @State var deletePlaylist: Bool = false
  var playlist: Playlist

  var body: some View {
    NavigationLink {
      PlaylistListView(playlist: playlist)
    } label: {
      LibraryPlaylistRow(playlist: playlist)
    }
    .swipeActions {
      Button {
        self.deletePlaylist = true
      } label: {
        Label(LibraryCopy.text("library.delete"), systemImage: "trash.fill")
      }.tint(.red)
    }.swipeActions(edge: .leading) {
      Button {
        print("Checking Playlist")
        checkPlaylist(playlist)
      } label: {
        Label(LibraryCopy.text("library.check"), systemImage: "arrow.clockwise")
      }
      Button {
        DownloadManager.shared.downloadPlaylist(playlist)
      } label: {
        Label(LibraryCopy.text("library.download"), systemImage: "arrow.down")
      }
      .tint(.blue)
    }.alert(
      LibraryCopy.format("playlist.delete", playlist.title ?? LibraryCopy.text("library.playlists")),
      isPresented: $deletePlaylist
    ) {
      Button(role: .destructive) {
        print("Delete Playlist")
        let id = playlist.id
        let linked = playlist.linked
        deleteDownloadedPlaylist(modelContext, playlist: playlist)
        if linked {
          LibrarySync.shared.linkedPlaylistDeletedLocally(id: id)
        }
      } label: {
        Text(LibraryCopy.text("library.deleteConfirm"))
      }
      Button(LibraryCopy.text("library.cancel")) {
        deletePlaylist = false
      }
    }
  }
}

/// Playlist row with cover, title count and sync/download state.
struct LibraryPlaylistRow: View {
  var playlist: Playlist

  private var titleCount: Int {
    max(playlist.videoIDs.count, playlist.videos.count)
  }

  private var downloadedCount: Int {
    playlist.videos.filter(\.downloaded).count
  }

  /// Uses the playlist cover, otherwise the cover of the first title that has one.
  private var cover: (url: URL, isLocal: Bool)? {
    if let cover = resolvedCoverURL(playlist.coverURL) {
      return cover
    }
    return playlist.orderedVideos.lazy.compactMap { resolvedCoverURL(for: $0) }.first
  }

  var body: some View {
    HStack(spacing: 8) {
      CoverImageView(cover: cover, size: 40, cornerRadius: 6, placeholderSymbol: "music.note.list")
      VStack(alignment: .leading, spacing: 2) {
        Text(playlist.title ?? LibraryCopy.text("library.noTitle"))
          .font(.headline)
          .lineLimit(2)
        HStack(spacing: 6) {
          Text(
            LibraryCopy.format(
              "playlist.count", titleCount.formatted(.number.locale(LibraryCopy.locale))))
          if downloadedCount > 0 {
            Label("\(downloadedCount)", systemImage: "arrow.down.circle.fill")
              .labelStyle(CompactLabelStyle())
              .foregroundStyle(downloadedCount == titleCount ? .green : .blue)
          }
        }
        .font(.footnote)
        .foregroundStyle(.secondary)
        .lineLimit(1)
      }
      Spacer(minLength: 0)
      VStack(spacing: 4) {
        if playlist.linked {
          Image(systemName: "iphone")
            .foregroundStyle(.secondary)
            .accessibilityLabel(LibraryCopy.text("library.synced"))
        }
        if playlist.download {
          Image(systemName: "arrow.down.to.line.circle")
            .foregroundStyle(.blue)
            .accessibilityLabel(LibraryCopy.text("library.autoDownload"))
        }
      }
      .font(.footnote)
    }
    .padding(.vertical, 2)
  }
}

/// Icon directly followed by the title, tighter than the default label spacing.
private struct CompactLabelStyle: LabelStyle {
  func makeBody(configuration: Configuration) -> some View {
    HStack(spacing: 2) {
      configuration.icon
      configuration.title
    }
  }
}

struct LibraryVideos: View {
  @Query private var videos: [Video]
  var body: some View { SortedLibraryVideos(videos: videos, scope: .videos) }
}

struct LibraryAvailableVideos: View {
  @Query private var videos: [Video]
  var body: some View { SortedLibraryVideos(videos: videos, scope: .available) }
}

struct SortedLibraryVideos: View {
  let videos: [Video]
  let scope: LibrarySortScope
  @Environment(MusicPlayerManager.self) private var player
  @Environment(\.scenePhase) private var scenePhase
  @Environment(\.locale) private var locale
  @State private var now = Date()
  @State private var unavailable: Video?
  private let preferences = LibrarySortPreferences.shared
  private var ordered: [Video] {
    let filtered =
      scope == .available
      ? videos.filter {
        LibrarySorter.streamAvailable(
          downloaded: $0.downloaded, file: $0.fileURL,
          stream: $0.streamURL, until: $0.validUntil, now: now)
      } : videos
    return LibrarySorter.videos(filtered, selection: preferences.selection(scope), locale: locale)
  }
  var body: some View {
    LibrarySnapshotList(
      values: ordered, revision: "\(preferences.selection(scope))-\(locale.identifier)"
    ) { snapshot in
      SortHeaderButton(scope: scope).id("sort")
      if scope == .available { Text(LibraryCopy.text("stream.hint")).font(.footnote) }
      if snapshot.isEmpty { Text(LibraryCopy.text("empty")) }
      ForEach(snapshot, id: \.id) { video in
        VStack(alignment: .leading) {
          MusicListItemView(video: video) {
            let queue = scope == .videos ? [video] : snapshot
            let stillAvailable =
              scope != .available
              || LibrarySorter.streamAvailable(
                downloaded: video.downloaded, file: video.fileURL, stream: video.streamURL,
                until: video.validUntil, now: Date())
            if !stillAvailable || !player.startLibraryQueue(queue, selectedID: video.id) {
              unavailable = video
            }
          }
          SortValueLabel(video: video, selection: preferences.selection(scope), now: now)
        }.librarySnapshotRow(video.id)
      }
    }
    .navigationTitle(LibraryCopy.text(scope == .available ? "library.available" : "library.videos"))
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink(destination: MusikPlayer()) {
          Label(LibraryCopy.text("library.music"), systemImage: "playpause.circle")
        }
      }
    }
    .task {
      while !Task.isCancelled {
        now = Date()
        do { try await Task.sleep(for: .seconds(30)) } catch { return }
      }
    }
    .onChange(of: scenePhase) { _, phase in if phase == .active { now = Date() } }
    .alert(
      LibraryCopy.text("unavailable"),
      isPresented: Binding(get: { unavailable != nil }, set: { if !$0 { unavailable = nil } })
    ) {
      Button(LibraryCopy.text("library.refreshInfo")) {
        if let unavailable { MetadataRefresher.shared.refresh(unavailable) }
        unavailable = nil
      }
      Button(LibraryCopy.text("cancel"), role: .cancel) { unavailable = nil }
    }
  }
}
