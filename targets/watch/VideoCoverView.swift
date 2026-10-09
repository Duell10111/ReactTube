//
//  VideoCoverView.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 24.09.26.
//

import SwiftUI

/// Resolves the stored cover of a title.
func resolvedCoverURL(for video: Video) -> (url: URL, isLocal: Bool)? {
  resolvedCoverURL(video.coverURL)
}

/// Resolves a stored cover string. Downloaded covers are kept as a path
/// relative to the download directory (with or without a leading slash,
/// depending on how they were saved), everything else is a remote URL.
func resolvedCoverURL(_ coverURL: String?) -> (url: URL, isLocal: Bool)? {
  guard let coverURL, !coverURL.isEmpty else { return nil }

  guard let url = URL(string: coverURL), url.scheme != nil else {
    return (getDownloadDirectory().appending(path: coverURL), true)
  }
  return (url, url.isFileURL)
}

/// Small cover thumbnail for title lists.
struct VideoCoverView: View {
  var video: Video
  var size: CGFloat = 30

  var body: some View {
    CoverImageView(cover: resolvedCoverURL(for: video), size: size)
  }
}

/// Cover thumbnail with a symbol placeholder. Loads through `ArtworkCache`, so
/// the same image the player uses is reused instead of downloaded per row.
struct CoverImageView: View {
  var cover: (url: URL, isLocal: Bool)?
  var size: CGFloat = 30
  var cornerRadius: CGFloat = 4
  var placeholderSymbol = "music.note"

  @State private var image: UIImage?

  var body: some View {
    ZStack {
      if let image {
        Image(uiImage: image)
          .resizable()
          .aspectRatio(contentMode: .fill)
      } else {
        Color.gray.opacity(0.25)
        Image(systemName: placeholderSymbol)
          .font(.system(size: size * 0.45))
          .foregroundStyle(.secondary)
      }
    }
    .frame(width: size, height: size)
    .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
    .accessibilityHidden(true)
    .task(id: cover?.url) {
      loadCover()
    }
  }

  private func loadCover() {
    guard let resolved = cover else {
      image = nil
      return
    }

    if let cached = ArtworkCache.shared.cachedImage(for: resolved.url) {
      image = cached
      return
    }

    image = nil
    let requestedURL = resolved.url
    ArtworkCache.shared.image(for: resolved.url, isLocal: resolved.isLocal) { loaded in
      DispatchQueue.main.async {
        // The row may already show a different cover by now.
        guard requestedURL == cover?.url else { return }
        image = loaded
      }
    }
  }
}

#Preview {
  VideoCoverView(video: Video(id: "test", durationMillis: 1000))
}
