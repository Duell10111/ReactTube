//
//  PlaylistView.swift
//  watch
//
//  Created by Konstantin Späth on 10.06.24.
//

import SwiftUI

struct PlaylistView: View {
    @Binding var playlist: [URL]
    @Binding var currentTrackIndex: Int
    
    var body: some View {
        List {
            ForEach(playlist.indices, id: \.self) { index in
                HStack {
                    Text("Track \(index + 1)")
                    Spacer()
                    if index == currentTrackIndex {
                        Image(systemName: "play.fill")
                    }
                }
                .padding()
                .background(index == currentTrackIndex ? Color.blue.opacity(0.3) : Color.clear)
                .cornerRadius(8)
            }
            .onMove(perform: move)
        }
        .navigationBarTitle("Playlist")
//        .navigationBarItems(trailing: EditButton())
    }
    
    func move(from source: IndexSet, to destination: Int) {
        playlist.move(fromOffsets: source, toOffset: destination)
        if let first = source.first {
            if first == currentTrackIndex {
                currentTrackIndex = destination - 1
            } else if first < currentTrackIndex && destination > currentTrackIndex {
                currentTrackIndex -= 1
            } else if first > currentTrackIndex && destination <= currentTrackIndex {
                currentTrackIndex += 1
            }
        }
    }
}

struct PlaylistView_Previews: PreviewProvider {
    static var previews: some View {
        PlaylistView(playlist: .constant([
            URL(string: "https://www.example.com/path/to/your/music1.mp3")!,
            URL(string: "https://www.example.com/path/to/your/music2.mp3")!,
            URL(string: "https://www.example.com/path/to/your/music3.mp3")!
        ]), currentTrackIndex: .constant(0))
    }
}
