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
              Label("Music", systemImage: "music.note.list")
            }
        }
      }
    }
}

struct LibraryPlaylists: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Query(sort: \Playlist.title, order: .reverse) var playlists: [Playlist]
  
  var body: some View {
    List {
      ForEach(playlists, id: \.id) { playlist in
        Button(playlist.title ?? "No title") {
          musicPlayerManager.updatePlaylist(playlist: playlist)
        }
      }
      Button("Refresh") {
        requestLibraryPlaylists()
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

struct LibraryVideos: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Environment(DownloadManager.self) private var downloadManager: DownloadManager
  @Query(sort: \Video.title, order: .reverse) var videos: [Video]
  
//  let formatter = NumberFormatter()
//  formatter.numberStyle = .percent
//  formatter.minimumIntegerDigits = 1
//  formatter.maximumIntegerDigits = 1
//  formatter.maximumFractionDigits = 3
//  formatter.minimumFractionDigits = 3
  
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
                ProgressView(value: videoDownload)  { Text("\(videoDownload)%  progress") }
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
