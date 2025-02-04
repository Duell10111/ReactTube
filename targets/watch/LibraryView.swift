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
      NavigationLink("Playlists") {
        LibraryPlaylists()
      }
      NavigationLink("Videos") {
        LibraryVideos()
      }
      NavigationLink("Downloaded") {
        LibraryDownloadedVideos()
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
        Button("Refresh") {
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
  var playlist: Playlist
  
  var body: some View {
    NavigationLink {
      PlaylistListView(playlist: playlist)
    } label: {
      Text(playlist.title ?? "No title")
        .foregroundStyle(playlist.download == true ? .blue : .primary)
    }
    .swipeActions {
      Button {
          print("Playing Playlist")
          checkPlaylist(playlist)
          musicPlayerManager.updatePlaylist(playlist: playlist)
      } label: {
          Label("Play", systemImage: "play.fill")
      }
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
    }
  }
}

struct LibraryVideos: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Environment(DownloadManager.self) private var downloadManager: DownloadManager
  @Query(sort: \Video.title, order: .reverse) var videos: [Video]
  
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

struct LibraryDownloadedVideos: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Environment(DownloadManager.self) private var downloadManager: DownloadManager
  @Query(filter: #Predicate<Video> { video in
    video.downloaded == true
  }, sort: \Video.title, order: .reverse) var videos: [Video]
  
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
    LibraryDownloadedVideos()
    .modelContext(DataController.previewContainer.mainContext)
}
