//
//  MusikPlayer.swift
//  watch
//
//  Created by Konstantin Späth on 13.06.24.
//

import SwiftUI

struct MusikPlayer: View {
    @EnvironmentObject var musicManager: MusicPlayerManager
  
    var body: some View {
        VStack {
          // Causes app crashes if switching too fast :/
          if let cover = musicManager.currentCover, false {
              AsyncImage(url: cover) { image in
                image
                  .resizable()
                  .scaledToFit()
              } placeholder: {
                  Color.gray
              }
                  .frame(width: 100, height: 100)
                  .cornerRadius(8)
                  .padding()
          } else {
              Image(systemName: "music.note")
                  .resizable()
                  .scaledToFit()
                  .frame(width: 100, height: 100)
                  .cornerRadius(8)
                  .padding()
          }

          Text(musicManager.currentTitle)
            .font(.footnote)
            .padding()

          HStack {
              Button(action: {
                  musicManager.previousTrack()
              }) {
                  Image(systemName: "backward.fill")
                      .resizable()
                      .frame(width: 30, height: 30)
              }.frame(width: 50, height: 50)

              Button(action: {
                  if musicManager.isPlaying {
                      musicManager.pauseMusic()
                  } else {
                      musicManager.playMusic()
                  }
              }) {
                Image(systemName: musicManager.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                      .resizable()
                      .frame(width: 50, height: 50)
              }
              .frame(width: 50, height: 50)

              Button(action: {
                  musicManager.nextTrack()
              }) {
                  Image(systemName: "forward.fill")
                      .resizable()
                      .frame(width: 30, height: 30)
              }.frame(width: 50, height: 50)
          }
      }.toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          NavigationLink(destination: PlaylistView()) {
              Label("Music", systemImage: "music.note.list")
            }
        }
    }
    }
}

#Preview {
  MusikPlayer()
    .environmentObject(MusicPlayerManager.shared)
}

struct PlayButton: View {
  @Binding var playing: Bool
  @Binding var loading: Bool
  
  var body: some View {
    Image(systemName: playing ? "pause.circle.fill" : "play.circle.fill")
          .resizable()
          .frame(width: 50, height: 50)
  }
}
