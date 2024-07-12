//
//  PlaylistView.swift
//  watch
//
//  Created by Konstantin Späth on 10.06.24.
//

import SwiftUI

struct PlaylistView: View {
    @EnvironmentObject var musicManager: MusicPlayerManager
    
    var body: some View {
        List {
          ForEach(Array(musicManager.playerPlaylistItems.enumerated()), id: \.self.element.id) { (index, video) in
            HStack {
              Text(video.title ?? "Track \(index + 1)")
                Spacer()
                if index == musicManager.trackIndex {
                    Image(systemName: "play.fill")
                }
            }
            .padding()
            .background(index == musicManager.trackIndex ? Color.blue.opacity(0.3) : Color.clear)
            .cornerRadius(8)
            }
//            .onMove(perform: move)
        }
        .navigationBarTitle("Playlist")
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
        .environmentObject(MusicPlayerManager.shared)
    }
}
