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
        LibraryPlaylists()
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
  @EnvironmentObject var musicPlayerManager: MusicPlayerManager
  @Query(sort: \Playlist.title, order: .reverse) var playlists: [Playlist]
  
  var body: some View {
    List {
      ForEach(playlists, id: \.id) { playlist in
        Button(playlist.title ?? "No title") {
          musicPlayerManager.updatePlaylist(newPlaylist: playlist.videos)
        }
      }
    }.toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink(destination: MusikPlayer()) {
            Label("Music", systemImage: "music.note.list")
          }
      }
    }.onAppear(perform: {
      requestLibraryPlaylists()
    })
  }
}

#Preview {
    LibraryView()
    .modelContext(DataController.previewContainer.mainContext)
}
