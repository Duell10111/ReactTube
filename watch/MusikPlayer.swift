//
//  MusikPlayer.swift
//  watch
//
//  Created by Konstantin Späth on 10.06.24.
//

import SwiftUI
import AVFoundation

struct MusikPlayer: View {
  @State private var isPlaying = false
  @State private var player: AVAudioPlayer?

  var body: some View {
      VStack {
          Text("Music Player")
              .font(.headline)
              .padding()
          
          Button(action: {
              if self.isPlaying {
                  self.pauseMusic()
              } else {
                  self.playMusic()
              }
          }) {
              Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                  .resizable()
                  .frame(width: 50, height: 50)
          }
          .padding()
      }
      .onAppear {
          self.setupPlayer()
      }
  }

  func setupPlayer() {
      if let url = Bundle.main.url(forResource: "example", withExtension: "mp3") {
          do {
              player = try AVAudioPlayer(contentsOf: url)
              player?.prepareToPlay()
          } catch {
              print("Error loading audio file")
          }
      }
  }

  func playMusic() {
      player?.play()
      isPlaying = true
  }

  func pauseMusic() {
      player?.pause()
      isPlaying = false
  }
}

#Preview {
    MusikPlayer()
}
