//
//  VideoCoverView.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 24.09.26.
//

import SwiftUI

/// Resolves the stored cover of a title. A downloaded cover is kept as a path
/// relative to the download directory, everything else is a remote URL.
func resolvedCoverURL(for video: Video) -> (url: URL, isLocal: Bool)? {
  guard let coverURL = video.coverURL, !coverURL.isEmpty else { return nil }

  if coverURL.hasPrefix("/") {
    return (getDownloadDirectory().appending(path: coverURL), true)
  }

  guard let url = URL(string: coverURL) else { return nil }
  return (url, url.isFileURL)
}

/// Small cover thumbnail for title lists. Loads through `ArtworkCache`, so the
/// same image the player uses is reused instead of downloaded per row.
struct VideoCoverView: View {
  var video: Video
  var size: CGFloat = 30

  @State private var image: UIImage?

  var body: some View {
    ZStack {
      if let image {
        Image(uiImage: image)
          .resizable()
          .aspectRatio(contentMode: .fill)
      } else {
        Color.gray.opacity(0.25)
        Image(systemName: "music.note")
          .font(.system(size: size * 0.45))
          .foregroundStyle(.secondary)
      }
    }
    .frame(width: size, height: size)
    .clipShape(RoundedRectangle(cornerRadius: 4))
    .accessibilityHidden(true)
    .task(id: video.id) {
      loadCover()
    }
  }

  private func loadCover() {
    guard let resolved = resolvedCoverURL(for: video) else {
      image = nil
      return
    }

    if let cached = ArtworkCache.shared.cachedImage(for: resolved.url) {
      image = cached
      return
    }

    image = nil
    let requestedID = video.id
    ArtworkCache.shared.image(for: resolved.url, isLocal: resolved.isLocal) { loaded in
      DispatchQueue.main.async {
        // The row may already show a different title by now.
        guard requestedID == video.id else { return }
        image = loaded
      }
    }
  }
}

#Preview {
  VideoCoverView(video: Video(id: "test", durationMillis: 1000))
}
