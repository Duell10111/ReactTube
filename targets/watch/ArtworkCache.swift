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
    // Without this a request started while the watch has no connection fails
    // at once; waiting lets covers load as soon as a network is reachable.
    configuration.waitsForConnectivity = true
    configuration.timeoutIntervalForResource = 60
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
      session.dataTask(with: url) { [weak self] data, response, error in
        self?.finish(key: key, image: Self.decodeRemote(url: url, data: data, response: response, error: error))
      }.resume()
    }
  }

  /// Async variant for views; same caching and coalescing as the handler variant.
  func image(for url: URL, isLocal: Bool) async -> UIImage? {
    await withCheckedContinuation { continuation in
      image(for: url, isLocal: isLocal) { continuation.resume(returning: $0) }
    }
  }

  func clear() {
    memoryCache.removeAllObjects()
  }

  /// Logs why a remote cover could not be used, so connection problems, HTTP
  /// errors and undecodable images can be told apart.
  private static func decodeRemote(url: URL, data: Data?, response: URLResponse?, error: Error?) -> UIImage? {
    let source = "\(url.host() ?? "?")/\(url.lastPathComponent)"
    if let error {
      WatchLog.shared.warning("Artwork", "Cover download failed (\(source)): \(error.localizedDescription)")
      return nil
    }
    if let status = (response as? HTTPURLResponse)?.statusCode, !(200..<300).contains(status) {
      WatchLog.shared.warning("Artwork", "Cover download returned HTTP \(status) (\(source))")
      return nil
    }
    guard let data, let image = UIImage(data: data) else {
      WatchLog.shared.warning("Artwork", "Cover could not be decoded (\(source), \(data?.count ?? 0) bytes)")
      return nil
    }
    return image
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
