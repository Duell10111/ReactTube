//
//  PlaylistView.swift
//  watch
//
//  Created by Konstantin Späth on 10.06.24.
//

import SwiftUI

struct MusicPlayerPlaylistView: View {
    @Environment(MusicPlayerManager.self) private var musicManager: MusicPlayerManager

    var body: some View {
      ScrollViewReader { proxy in
        List {
          Section {
            // Both settings are persisted: repeat takes effect immediately,
            // shuffle applies the next time a playlist is started.
            Button {
              musicManager.cycleRepeatMode()
            } label: {
              Label(musicManager.preferences.repeatMode.label, systemImage: musicManager.preferences.repeatMode.systemImage)
                .foregroundStyle(musicManager.preferences.repeatMode == .off ? Color.primary : Color.blue)
            }
            Button {
              musicManager.preferences.setShuffleEnabled(!musicManager.preferences.shuffleEnabled)
            } label: {
              Label(musicManager.preferences.shuffleEnabled ? "Shuffle On" : "Shuffle Off", systemImage: "shuffle")
                .foregroundStyle(musicManager.preferences.shuffleEnabled ? Color.blue : Color.primary)
            }
          }
          ForEach(Array(musicManager.playerPlaylistItems.enumerated()), id: \.self.element.id) { (index, video) in
            HStack {
              Button {
                musicManager.jumpToIndex(index)
              } label: {
                HStack {
                  VideoCoverView(video: video)
                  VStack(alignment: .leading) {
                    Text(video.title ?? "Track \(index + 1)")
                    if let artist = video.artist {
                      Text(artist)
                        .foregroundStyle(.secondary)
                    }
                  }
                }
              }
              Spacer(minLength: 0)
              if index == musicManager.trackIndex {
                Image(systemName: "play.fill")
              }
            }
            .listRowBackground(index == musicManager.trackIndex ? Color.blue.opacity(0.3).cornerRadius(8) : .none)
            .cornerRadius(8)
            .id(index)
          }
          //            .onMove(perform: move)
        }
        .navigationBarTitle("Music Queue")
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Button {
              proxy.scrollTo(musicManager.trackIndex)
            } label: {
              Label("Current Item", systemImage: "arrow.down.app")
            }
          }
        }
      }
    }

    func move(from source: IndexSet, to destination: Int) {
//        playlist.move(fromOffsets: source, toOffset: destination)
//        if let first = source.first {
//            if first == currentTrackIndex {
//                currentTrackIndex = destination - 1
//            } else if first < currentTrackIndex && destination > currentTrackIndex {
//                currentTrackIndex -= 1
//            } else if first > currentTrackIndex && destination <= currentTrackIndex {
//                currentTrackIndex += 1
//            }
//        }
    }
}

struct PlaylistView_Previews: PreviewProvider {
    static var previews: some View {
      MusicPlayerPlaylistView()
        .environment(MusicPlayerManager.shared)
    }
}
