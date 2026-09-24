//
//  ArtworkCache.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 23.09.26.
//

import Foundation
import UIKit

/// Cache for cover images.
///
/// Artwork is requested on every track change — by the player UI and again by the
/// now playing info controller — so without a cache a remote cover is downloaded
/// several times per title. Requests for the same URL are coalesced into one
/// load.
final class ArtworkCache {
  static let shared = ArtworkCache()

  private let memoryCache: NSCache<NSString, UIImage> = {
    let cache = NSCache<NSString, UIImage>()
    cache.countLimit = 40
    return cache
  }()

  private let lock = NSLock()
  private var pending: [String: [(UIImage?) -> Void]] = [:]

  private let fileQueue = DispatchQueue(label: "artwork.cache.file", qos: .utility)
  private let session: URLSession = {
    let configuration = URLSessionConfiguration.default
    configuration.requestCachePolicy = .returnCacheDataElseLoad
    return URLSession(configuration: configuration)
  }()

  private init() {}

  func cachedImage(for url: URL) -> UIImage? {
    memoryCache.object(forKey: url.absoluteString as NSString)
  }

  /// Loads the artwork for `url`. The handler is called on an arbitrary queue,
  /// or synchronously when the image is already cached.
  func image(for url: URL, isLocal: Bool, completion: @escaping (UIImage?) -> Void) {
    if let image = cachedImage(for: url) {
      completion(image)
      return
    }

    let key = url.absoluteString

    lock.lock()
    if pending[key] != nil {
      pending[key]?.append(completion)
      lock.unlock()
      return
    }
    pending[key] = [completion]
    lock.unlock()

    if isLocal {
      fileQueue.async { [weak self] in
        let image = UIImage(contentsOfFile: url.path)
        if image == nil {
          WatchLog.shared.warning("Artwork", "Local cover could not be read: \(url.lastPathComponent)")
        }
        self?.finish(key: key, image: image)
      }
    } else {
      session.dataTask(with: url) { [weak self] data, _, error in
        var image: UIImage?
        if let data, error == nil {
          image = UIImage(data: data)
        }
        if let error {
          WatchLog.shared.warning("Artwork", "Cover download failed: \(error.localizedDescription)")
        }
        self?.finish(key: key, image: image)
      }.resume()
    }
  }

  func clear() {
    memoryCache.removeAllObjects()
  }

  private func finish(key: String, image: UIImage?) {
    if let image {
      memoryCache.setObject(image, forKey: key as NSString)
    }

    lock.lock()
    let handlers = pending.removeValue(forKey: key) ?? []
    lock.unlock()

    handlers.forEach { $0(image) }
  }
}
