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

/// Whether a stored cover string points into the download directory.
func isLocalCoverPath(_ coverURL: String?) -> Bool {
  resolvedCoverURL(coverURL)?.isLocal ?? false
}

/// Whether a stored cover can be shown: remote URLs are assumed to be
/// loadable, local covers need their file.
func isCoverUsable(_ coverURL: String?) -> Bool {
  guard let resolved = resolvedCoverURL(coverURL) else { return false }
  return !resolved.isLocal || FileManager.default.fileExists(atPath: resolved.url.path)
}

/// Whether `newCover` may replace `currentCover`. A remote URL from a metadata
/// update must not replace a downloaded cover that still exists, because the
/// local file also works offline.
func shouldReplaceCover(_ currentCover: String?, with newCover: String) -> Bool {
  isLocalCoverPath(newCover) || !isLocalCoverPath(currentCover) || !isCoverUsable(currentCover)
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
  /// Bumped to load a missing cover again, e.g. when the app becomes active.
  @State private var reloadCount = 0
  @Environment(\.scenePhase) private var scenePhase

  /// Pauses before further attempts at a remote cover. The watch often has no
  /// connection right after waking up, and a failed load is not cached.
  private static let retryDelays: [Duration] = [.seconds(5), .seconds(20)]

  private struct LoadKey: Equatable {
    var url: URL?
    var reloadCount: Int
  }

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
    .task(id: LoadKey(url: cover?.url, reloadCount: reloadCount)) {
      await loadCover()
    }
    .onChange(of: scenePhase) { _, phase in
      if phase == .active, image == nil, cover != nil {
        reloadCount += 1
      }
    }
  }

  private func loadCover() async {
    guard let resolved = cover else {
      image = nil
      return
    }

    if let cached = ArtworkCache.shared.cachedImage(for: resolved.url) {
      image = cached
      return
    }

    image = nil
    // A missing local file does not appear by waiting.
    let delays = resolved.isLocal ? [] : Self.retryDelays
    for attempt in 0...delays.count {
      if attempt > 0 {
        try? await Task.sleep(for: delays[attempt - 1])
      }
      // Cancelled once the row shows a different cover.
      guard !Task.isCancelled else { return }
      if let loaded = await ArtworkCache.shared.image(for: resolved.url, isLocal: resolved.isLocal) {
        guard !Task.isCancelled else { return }
        image = loaded
        return
      }
    }
  }
}

#Preview {
  VideoCoverView(video: Video(id: "test", durationMillis: 1000))
}
