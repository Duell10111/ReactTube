//
//  LibraryView.swift
//  watch
//
//  Created by Konstantin Späth on 01.07.24.
//

import SwiftUI
import SwiftData

struct LibraryView: View {
    var body: some View {
      List {
        NavigationLink {
          LibraryPlaylists()
        } label: {
          MenuIconLabel(title: "Playlists", systemImage: "music.note.list", color: .red)
        }
        NavigationLink {
          LibraryVideos()
        } label: {
          MenuIconLabel(title: "Videos", systemImage: "play.rectangle.fill", color: .orange)
        }
        NavigationLink {
          LibraryDownloadedVideos()
        } label: {
          MenuIconLabel(title: "Downloaded", systemImage: "arrow.down.circle.fill", color: .blue)
        }
        NavigationLink {
          LibraryAvailableVideos()
        } label: {
          MenuIconLabel(title: "Available", systemImage: "clock.fill", color: .green)
        }
      }.toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          NavigationLink(destination: MusikPlayer()) {
              Label("Music", systemImage: "playpause.circle")
            }
        }
      }
    }
}

struct LibraryPlaylists: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Query(filter: #Predicate<Playlist> { playlist in
    playlist.temp == false || playlist.temp == nil
  }, sort: \Playlist.title, order: .forward) var playlists: [Playlist]
  @Query(filter: #Predicate<Playlist> { playlist in
    playlist.temp == true
  }, sort: \Playlist.title, order: .forward) var tempPlaylists: [Playlist]
  
  var body: some View {
    List {
      Section("Own Playlists") {
        ForEach(playlists, id: \.id) { playlist in
          LibraryPlaylistListItem(playlist: playlist)
        }
        Button("Refresh", systemImage: "arrow.clockwise") {
          requestLibraryPlaylists()
        }
      }
      Section("Temp Playlists") {
        ForEach(tempPlaylists, id: \.id) { playlist in
          LibraryPlaylistListItem(playlist: playlist)
        }
      }
    }.toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink(destination: MusikPlayer()) {
          Label("Music", systemImage: "playpause.circle")
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
          Label("Delete", systemImage: "trash.fill")
      }.tint(.red)
    }.swipeActions(edge: .leading) {
      Button {
          print("Checking Playlist")
          checkPlaylist(playlist)
      } label: {
          Label("Check", systemImage: "arrow.clockwise")
      }
      Button {
        DownloadManager.shared.downloadPlaylist(playlist)
      } label: {
        Label("Download", systemImage: "arrow.down")
      }
      .tint(.blue)
    }.alert("Delete \(playlist.title ?? "Playlist")", isPresented: $deletePlaylist) {
      Button(role: .destructive) {
        print("Delete Playlist")
        let id = playlist.id
        let linked = playlist.linked
        deleteDownloadedPlaylist(modelContext, playlist: playlist)
        if linked {
          LibrarySync.shared.linkedPlaylistDeletedLocally(id: id)
        }
      } label: {
        Text("DELETE")
      }
      Button("Cancel") {
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
        Text(playlist.title ?? "No title")
          .font(.headline)
          .lineLimit(2)
        HStack(spacing: 6) {
          Text("^[\(titleCount) title](inflect: true)")
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
            .accessibilityLabel("Synced with iPhone")
        }
        if playlist.download {
          Image(systemName: "arrow.down.to.line.circle")
            .foregroundStyle(.blue)
            .accessibilityLabel("Auto download")
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
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Environment(DownloadManager.self) private var downloadManager: DownloadManager
  @Query(sort: \Video.title, order: .forward) var videos: [Video]
  
  var body: some View {
    List {
      ForEach(videos, id: \.id) { video in
        VStack {
          MusicListItemView(video: video) {
            musicPlayerManager.updatePlaylist(newPlaylist: [video])
          }
        }
      }
    }.toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink(destination: MusikPlayer()) {
            Label("Music", systemImage: "music.note.list")
          }
      }
    }
  }
}

#Preview {
    LibraryView()
    .modelContext(DataController.previewContainer.mainContext)
}
struct LibraryAvailableVideos: View {
  @State private var date: Date = Date()
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Environment(DownloadManager.self) private var downloadManager: DownloadManager
  @Query var videos: [Video]
  
  init() {
    let now = Date()
    _videos = Query(filter: #Predicate<Video> { video in
      return if let date = video.validUntil {
        now < date
      } else {
        false
      }
    }, sort: \Video.title)
  }
  
  var body: some View {
    List {
      ForEach(Array(videos.enumerated()), id: \.element.id) { index, video in
        VStack {
          MusicListItemView(video: video) {
            musicPlayerManager.updatePlaylist(newPlaylist: Array(videos[index...]))
          }
        }
      }
    }.toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink(destination: MusikPlayer()) {
            Label("Music", systemImage: "music.note.list")
          }
      }
    }
  }
}

#Preview {
  LibraryAvailableVideos()
    .modelContext(DataController.previewContainer.mainContext)
}

struct LibraryDownloadedVideos: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Environment(DownloadManager.self) private var downloadManager: DownloadManager
  @Query(filter: #Predicate<Video> { video in
    video.downloaded == true
  }, sort: \Video.title, order: .reverse) var videos: [Video]
  
  var body: some View {
    List {
      Button("Shuffle", systemImage: "shuffle") {
        musicPlayerManager.updatePlaylist(newPlaylist: Array(videos).shuffled())
      }
      ForEach(Array(videos.enumerated()), id: \.element.id) { index, video in
        VStack {
          MusicListItemView(video: video) {
            musicPlayerManager.updatePlaylist(newPlaylist: Array(videos[index...]))
          }
        }
      }
    }.toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink(destination: MusikPlayer()) {
            Label("Music", systemImage: "music.note.list")
          }
      }
    }
  }
}

#Preview {
    LibraryDownloadedVideos()
    .modelContext(DataController.previewContainer.mainContext)
}
