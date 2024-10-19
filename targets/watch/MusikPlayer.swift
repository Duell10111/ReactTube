//
//  MusikPlayer.swift
//  watch
//
//  Created by Konstantin Späth on 13.06.24.
//

import SwiftUI

struct MusikPlayer: View {
    @Environment(MusicPlayerManager.self) private var musicManager: MusicPlayerManager
    @State private var crownValue: Double = 0.0 // Der aktuelle Wert des Digital Crown

  
    var body: some View {
      @Bindable var musicManager = musicManager
      ZStack {
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
                PlayButton()
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
        }
        HStack(alignment: .center, spacing: 0) {
          Spacer()
          VolumeControl()
        }
      }.toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          NavigationLink(destination: PlaylistView()) {
              Label("Music", systemImage: "music.note.list")
            }
        }
      }
      .focusable(true)
      .digitalCrownRotation(
            $musicManager.volume,
            from: 0.0, through: 1.0,
            by: 0.01,
            sensitivity: .low,
            isContinuous: false,
            isHapticFeedbackEnabled: true
      )
      .onChange(of: musicManager.volume, initial: false) {
        musicManager.updateVolume(volume: musicManager.volume)
      }
    }
}

// TODO: Migrate Forward/Backward to Circle Components

#Preview {
  MusikPlayer()
    .environment(MusicPlayerManager.shared)
}

struct PlayButton: View {
  @Environment(MusicPlayerManager.self) private var musicManager: MusicPlayerManager
  
  var body: some View {
    ZStack {
      Circle()
        .fill(Color.white)
        .frame(width: 45, height: 45)
      Circle()
        .stroke(lineWidth: 5)
        .foregroundColor(!musicManager.isStalled ? .white : .blue)
        .animation(musicManager.isStalled ? .easeInOut(duration: 1).repeatForever() : .smooth, value: musicManager.isStalled)
        .frame(width: 45, height: 45)
      Image(systemName: musicManager.isPlaying ? "pause.fill" : "play.fill")
        .foregroundColor(.black)
        .font(.system(size: 24))
    }
  }
}
