//
//  AddToPlaylistView.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 16.05.25.
//

import SwiftUI
import SwiftData

struct AddToPlaylistView: View {
    @Environment(\.presentationMode) var presentationMode: Binding<PresentationMode>
    @Query(filter: #Predicate<Playlist> { playlist in
      playlist.temp == false || playlist.temp == nil
    }, sort: \Playlist.title, order: .forward) var playlists: [Playlist]
    var video: Video
  
    var body: some View {
      List {
        ForEach(playlists) { playlist in
          Button(playlist.title ?? playlist.id) {
            addVideoToPlaylist(playlist, video: video)
            presentationMode.wrappedValue.dismiss()
          }
        }
      }
    }
}

#Preview {
  AddToPlaylistView(video: Video(id: "5pZ2IbO9VB4", durationMillis: 180000, title: "Sarà Perché Ti Amo (Long Version)", downloaded: false))
    .modelContext(DataController.previewContainer.mainContext)
}
