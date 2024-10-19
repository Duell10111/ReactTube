//
//  PlaylistView.swift
//  watch
//
//  Created by Konstantin Späth on 10.06.24.
//

import SwiftUI

struct PlaylistView: View {
    @Environment(MusicPlayerManager.self) private var musicManager: MusicPlayerManager
    
    var body: some View {
      ScrollViewReader { proxy in
        List {
          Button("Scroll") {
            proxy.scrollTo(musicManager.trackIndex)
          }
          ForEach(Array(musicManager.playerPlaylistItems.enumerated()), id: \.self.element.id) { (index, video) in
            HStack {
              Button(video.title ?? "Track \(index + 1)") {
                musicManager.jumpToIndex(index)
              }
              Spacer()
              if index == musicManager.trackIndex {
                Image(systemName: "play.fill")
              }
            }
            .background(index == musicManager.trackIndex ? Color.blue.opacity(0.3) : Color.clear)
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
      PlaylistView()
        .environment(MusicPlayerManager.shared)
    }
}
