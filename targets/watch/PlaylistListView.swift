//
//  PlaylistListView.swift
//  watch
//
//  Created by Konstantin Späth on 26.09.24.
//

import SwiftUI

struct PlaylistListView: View {
    @Environment(DownloadManager.self) private var downloadManager: DownloadManager
    @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
    var playlist: Playlist
  
    let formatter: NumberFormatter = {
            let formatter = NumberFormatter()
            formatter.numberStyle = .percent
            formatter.minimumIntegerDigits = 1
            formatter.maximumIntegerDigits = 3
            formatter.maximumFractionDigits = 2
            formatter.minimumFractionDigits = 2
            return formatter
    }()
  
    var body: some View {
      List {
        ForEach(Array(playlist.videos.enumerated()), id: \.element) { index, video in
          MusicListItemView(video: video) {
            print("Playlist: ", playlist.videoIDs)
            musicPlayerManager.updatePlaylist(playlist: playlist, index: index)
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
