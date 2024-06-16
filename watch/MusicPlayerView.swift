//
//  MusikPlayer.swift
//  watch
//
//  Created by Konstantin Späth on 10.06.24.
//

import SwiftUI
import AVFoundation

struct MusicPlayerView: View {
    @State private var isPlaying = false
    @State private var player: AVQueuePlayer?
    @State private var currentTrackIndex = 0
    @State private var playerItems: [AVPlayerItem] = []
    var playlist: [Video] = []
    @State private var currentTitle: String = "Unknown Title"
    @State private var currentCover: UIImage? = nil

    var body: some View {
        VStack {
            if let cover = currentCover {
                Image(uiImage: cover)
                    .resizable()
                    .scaledToFit()
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

            Text(currentTitle)
              .font(.footnote)
              .padding()

            HStack {
                Button(action: {
                    self.previousTrack()
                }) {
                    Image(systemName: "backward.fill")
                        .resizable()
                        .frame(width: 30, height: 30)
                }.frame(width: 50, height: 50)

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
                .frame(width: 50, height: 50)

                Button(action: {
                    self.nextTrack()
                }) {
                    Image(systemName: "forward.fill")
                        .resizable()
                        .frame(width: 30, height: 30)
                }.frame(width: 50, height: 50)
            }
        }
//            .toolbar {
//                ToolbarItem(placement: .topBarTrailing) {
//                  NavigationLink(destination: PlaylistView(playlist: $playlist, currentTrackIndex: $currentTrackIndex)) {
//                    
//                      Label("Playlist", systemImage: "music.note.list")
//                    }
//                }
//            }
        .onAppear {
            self.setupPlayer()
        }
    }

    func setupPlayer() {
        // Set up AVAudioSession for background audio playback
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to set up AVAudioSession: \(error)")
        }
      
        playerItems = playlist.compactMap { p in
          if let sURL = p.streamURL, let uri = URL(string: sURL) {
            return AVPlayerItem(url: uri)
          }
          return nil
        }
        player = AVQueuePlayer(items: [playerItems[currentTrackIndex]])

        NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: nil, queue: .main) { notification in
            self.nextTrack()
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

    func nextTrack() {
        currentTrackIndex = (currentTrackIndex + 1) % playerItems.count
        player?.advanceToNextItem()
        if currentTrackIndex < playerItems.count - 1 {
            let nextItem = playerItems[currentTrackIndex]
            player?.insert(nextItem, after: player?.currentItem)
        }
        if isPlaying {
            player?.play()
        }
    }

    func previousTrack() {
        currentTrackIndex = (currentTrackIndex - 1 + playerItems.count) % playerItems.count
        let previousItem = playerItems[currentTrackIndex]
        player?.pause()
        player?.removeAllItems()
        player?.insert(previousItem, after: nil)
        if isPlaying {
            player?.play()
        }
    }

    func playCurrentTrack() {
        guard currentTrackIndex < playerItems.count else { return }
        let currentItem = playerItems[currentTrackIndex]
        player?.replaceCurrentItem(with: currentItem)
        if isPlaying {
            player?.play()
        }
    }
}

struct MusicPlayerView_Previews: PreviewProvider {
    static var previews: some View {
      NavigationStack {
        MusicPlayerView()
      }
    }
}
