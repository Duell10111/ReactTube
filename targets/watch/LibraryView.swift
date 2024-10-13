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
  
  let formatter: NumberFormatter = {
          let formatter = NumberFormatter()
          formatter.numberStyle = .percent
          formatter.minimumIntegerDigits = 1
          formatter.maximumIntegerDigits = 1
          formatter.maximumFractionDigits = 2
          formatter.minimumFractionDigits = 2
          return formatter
  }()
  
  var body: some View {
    List {
      ForEach(videos, id: \.id) { video in
        VStack {
          Button {
            musicPlayerManager.updatePlaylist(newPlaylist: [video])
          } label: {
            VStack {
              HStack {
                Text(video.title ?? "Empty title")
                if let validUntil = video.validUntil, validUntil < Date() && video.downloaded != true {
                  Spacer()
                  Image(systemName: "clock.badge.exclamationmark")
                    .foregroundColor(.red)
                }
              }
              if video.downloaded {
                HStack {
                  Label("Downloaded", systemImage: "arrow.down.circle")
                }
              }
              if let videoDownload = downloadManager.progressDownloads[video.id] {
                ProgressView(value: videoDownload)  { Text("\(formatter.string(from: NSNumber(value: videoDownload)) ?? String(videoDownload))  progress").font(.system(size: 12)) }
              }
            }
          }
          .swipeActions {
            Button {
              DownloadManager.shared.downloadVideo(video: video)
            } label: {
              Label("Download", systemImage: "arrow.down")
            }
            .tint(.blue)
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
