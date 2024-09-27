//
//  PlaylistListView.swift
//  watch
//
//  Created by Konstantin Späth on 26.09.24.
//

import SwiftUI

struct PlaylistListView: View {
    @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
    var playlist: Playlist
  
    var body: some View {
      List {
        ForEach(Array(playlist.videos.enumerated()), id: \.element) { index, video in
          Button {
            print("Playlist: ", playlist.videoIDs)
            musicPlayerManager.updatePlaylist(playlist: playlist, index: index)
          } label: {
            HStack {
              Text(video.title ?? "Unknown title")
              if let validUntil = video.validUntil, validUntil < Date() && video.downloaded != true {
                Spacer()
                Image(systemName: "clock.badge.exclamationmark")
                  .foregroundColor(.red)
              }
            }
          }
        }
      }
      .navigationTitle(playlist.title ?? "")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          NavigationLink(destination: MusikPlayer()) {
              Label("Music", systemImage: "playpause.circle")
            }
        }
      }.onAppear {
        checkPlaylist(playlist)
      }
    }
}

#Preview {
  PlaylistListView(playlist: Playlist(id: "id", title: "Title"))
}
