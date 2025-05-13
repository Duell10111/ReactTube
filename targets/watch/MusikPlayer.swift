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
        GeometryReader { geometry in
          VStack(alignment: .center, spacing: 0) {
            VStack(spacing: 0) {
              // Causes app crashes if switching too fast :/
              if let cover = musicManager.currentCover, false {
                  AsyncImage(url: cover) { image in
                    image
                      .resizable()
                      .scaledToFit()
                  } placeholder: {
                      Color.gray
                  }
                      .scaledToFit()
                      .cornerRadius(8)
                      .padding()
              } else {
                  Image(systemName: "music.note")
                      .resizable()
                      .scaledToFit()
                      .cornerRadius(8)
                      .padding()
              }

              VStack {
                MarqueeText(text: musicManager.currentTitle, font: UIFont.preferredFont(forTextStyle: .subheadline), leftFade: 6, rightFade: 6, startDelay: 5, alignment: .center)
                if let artist = musicManager.currentArtist {
                  Text(artist)
                    .font(.caption2)
                }
              }.padding()
            }
            .frame(width: geometry.size.width, height: geometry.size.height * 2/3)

            HStack {
                ActionButton(systemName: "backward.fill") {
                  musicManager.previousTrack()
                  print("Previous Track")
                }

                Button(action: {
                    if musicManager.isPlaying {
                        musicManager.pauseMusic()
                    } else {
                        musicManager.playMusic()
                    }
                }) {
                  PlayButton()
                }.buttonStyle(.plain)

                ActionButton(systemName: "forward.fill") {
                  musicManager.nextTrack()
                }
            }
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
    GeometryReader { geometry in
      let size = min(geometry.size.width, geometry.size.height)
      
      ZStack {
        Circle()
          .fill(Color.white)
        Circle()
          .stroke(lineWidth: size * 0.1)
          .foregroundColor(!musicManager.isStalled ? .white : .blue)
          .animation(musicManager.isStalled ? .easeInOut(duration: 1).repeatForever() : .smooth, value: musicManager.isStalled)
        Image(systemName: musicManager.isPlaying ? "pause.fill" : "play.fill")
          .resizable()
          .scaledToFit()
          .padding(size * 0.2)
          .foregroundColor(.black)
      }
    }
    .aspectRatio(1, contentMode: .fit)
  }
}

struct ActionButton: View {
  var systemName: String
  var clicked: () -> Void
  
  var body: some View {
    Button(action: {
        clicked()
    }) {
        Image(systemName: systemName)
            .resizable()
            .scaledToFit()
            .padding(1)
    }.aspectRatio(1, contentMode: .fit)
  }
}
