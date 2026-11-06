//
//  PlaylistListView.swift
//  watch
//
//  Created by Konstantin Späth on 26.09.24.
//

import SwiftUI

struct PlaylistListView: View {
  @Environment(MusicPlayerManager.self) private var musicPlayerManager: MusicPlayerManager
  @Environment(\.locale) private var locale
  @State private var unavailable: Video?
  @State private var showUnavailable = false
  private let sortPreferences = LibrarySortPreferences.shared
  var playlist: Playlist

  var body: some View {
    // The sort setting is stored per playlist and never changes `videoIDs`.
    let selection = sortPreferences.selection(.playlistDetail, playlistID: playlist.id)
    let ordered = LibrarySorter.videos(playlist.orderedVideos, selection: selection, locale: locale)
    LibrarySnapshotList(values: ordered, revision: "\(selection)-\(locale.identifier)") { snapshot in
      SortHeaderButton(scope: .playlistDetail, playlistID: playlist.id).id("sort")
      Button(LibraryCopy.text("library.shuffle"), systemImage: "shuffle") {
        // An explicit shuffle start is also the preference for the next start.
        musicPlayerManager.preferences.setShuffleEnabled(true)
        musicPlayerManager.updatePlaylist(playlist: playlist, shuffle: true)
      }.disabled(snapshot.isEmpty)
      if snapshot.isEmpty { Text(LibraryCopy.text("empty")) }
      ForEach(snapshot, id: \.id) { video in
        VStack(alignment: .leading) {
          MusicListItemView(video: video) {
            // The queue takes over the visible order; the playlist order also
            // keeps titles whose metadata has not arrived yet.
            let started = musicPlayerManager.updatePlaylist(
              playlist: playlist, orderedVideos: selection.hasDirection ? snapshot : nil,
              startVideoID: video.id)
            if !started {
              unavailable = video
              showUnavailable = true
            }
          }.swipeActions(edge: .leading) {
            Button {
              removeVideoFromPlaylist(playlist, video: video)
            } label: {
              Label(LibraryCopy.text("playlist.removeTitle"), systemImage: "x.circle")
            }
            .tint(.red)
          }
          SortValueLabel(video: video, selection: selection, now: Date())
        }.librarySnapshotRow(video.id)
      }
    }
    .navigationTitle(playlist.title ?? "")
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink(destination: MusikPlayer()) {
          Label(LibraryCopy.text("library.music"), systemImage: "playpause.circle")
        }
      }
    }
    .onAppear {
      checkPlaylist(playlist)
    }
    // A stable binding: a computed one changes on every render, and inside a
    // pushed list that makes the navigation stack rebuild its destinations.
    .alert(LibraryCopy.text("unavailable"), isPresented: $showUnavailable) {
      Button(LibraryCopy.text("library.refreshInfo")) {
        if let unavailable { MetadataRefresher.shared.refresh(unavailable) }
      }
      Button(LibraryCopy.text("cancel"), role: .cancel) {}
    }
  }
}

#Preview {
  PlaylistListView(playlist: Playlist(id: "id", title: "Title"))
}
