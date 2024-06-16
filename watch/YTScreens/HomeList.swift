//
//  HomeList.swift
//  watch
//
//  Created by Konstantin Späth on 13.06.24.
//

import SwiftUI
import SwiftData

struct HomeList: View {
  @EnvironmentObject var musicPlayerManager: MusicPlayerManager
  @Query(sort: \Video.title, order: .reverse) var items: [Video]
  @Query(sort: \Playlist.title, order: .reverse) var playlists: [Playlist]
  
    var body: some View {
      List {
        ForEach(items, id: \.id) { video in
          Button(video.title ?? "No title") {
            musicPlayerManager.updatePlaylist(newPlaylist: [video])
          }
        }
        Section("Playlists") {
          ForEach(playlists, id: \.id) { playlist in
            Button(playlist.title ?? "No title") {
              musicPlayerManager.updatePlaylist(newPlaylist: playlist.videos)
            }
          }
        }
        Button("Fetch video") {
          requestVideo(id: "0nsawcTwebQ")
        }
        Button("Fetch playlist") {
          requestPlaylist(id: "PL9k0aZnruOJgXFKr9QXOLAlo2ZE8IvUAw")
        }
        NavigationLink("Musik") {
          MusikPlayer()
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
    HomeList().modelContext(DataController.previewContainer.mainContext)
}
