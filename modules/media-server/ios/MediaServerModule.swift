// Expo bridge for the loopback HLS server and JavaScript-backed SABR segments.
// Segment bytes are copied synchronously while the JavaScript buffer is valid.

import CoreMedia
import ExpoModulesCore
import VideoToolbox

public class MediaServerModule: Module {
  private let server = LocalMediaServer()

  private typealias PendingSegment = (path: String, completion: (Result<MediaServerResponse, MediaServerError>) -> Void)
  private var pending: [Int: PendingSegment] = [:]
  private var registeredPrefixes = Set<String>()
  private var nextRequestId = 1
  private let lock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("MediaServer")

    Events("onSegmentRequest")

    OnDestroy {
      // A JavaScript reload must not leave a listener without a segment provider.
      self.server.stop()
      self.clearPending()
    }

    AsyncFunction("startServer") { () -> [String: Any] in
      let port = try self.server.start()
      return [ "port": Int(port) ]
    }

    AsyncFunction("stopServer") { () in
      self.server.stop()
      self.clearPending()
    }

    Function("supportsAv1") { () -> Bool in
      VTIsHardwareDecodeSupported(kCMVideoCodecType_AV1)
    }

    Function("unregisterPrefix") { (prefix: String) in
      self.server.unregister(prefix: prefix)
      self.clearPending(prefix: prefix)
    }

    Function("registerText") { (path: String, body: String, contentType: String) in
      self.server.registerText(path: path, body: body, contentType: contentType)
    }

    Function("registerStreamPrefix") { (prefix: String) in
      self.lock.lock()
      self.registeredPrefixes.insert(prefix)
      self.lock.unlock()
      self.server.registerStreamPrefix(prefix) { [weak self] path, completion in
        guard let self else {
          completion(.failure(.unavailable(status: 503, message: "Media server is gone")))
          return
        }

        self.lock.lock()
        guard self.registeredPrefixes.contains(where: { path == $0 || path.hasPrefix($0 + "/") }) else {
          self.lock.unlock()
          completion(.failure(.unavailable(status: 503, message: "Media stream stopped")))
          return
        }
        let requestId = self.nextRequestId
        self.nextRequestId += 1
        self.pending[requestId] = (path: path, completion: completion)
        self.lock.unlock()

        self.sendEvent("onSegmentRequest", [
          "requestId": requestId,
          "path": path
        ])
      }
    }

    Function("respondToSegment") { (requestId: Int, data: Uint8Array, contentType: String) in
      guard let completion = self.takePending(requestId) else {
        // The request already timed out or its stream was removed.
        return
      }

      // Copy while the JavaScript buffer is valid.
      let bytes = Data(bytes: data.rawPointer, count: data.byteLength)

      completion(.success(MediaServerResponse(data: bytes, contentType: contentType)))
    }

    Function("failSegment") { (requestId: Int, status: Int, message: String) in
      guard let completion = self.takePending(requestId) else {
        return
      }

      if status == 404 {
        completion(.failure(.notFound))
      } else {
        completion(.failure(.unavailable(status: status, message: message)))
      }
    }

    Function("isRunning") { () -> Bool in
      self.server.port != nil
    }
  }

  private func takePending(_ requestId: Int) -> ((Result<MediaServerResponse, MediaServerError>) -> Void)? {
    lock.lock()
    defer { lock.unlock() }
    return pending.removeValue(forKey: requestId)?.completion
  }

  /// Finish removed requests immediately instead of waiting for their timeout.
  private func clearPending(prefix: String? = nil) {
    lock.lock()
    if let prefix {
      registeredPrefixes = registeredPrefixes.filter { $0 != prefix && !$0.hasPrefix(prefix + "/") }
    } else {
      registeredPrefixes.removeAll()
    }
    let open = pending.filter { _, request in
      guard let prefix else { return true }
      return request.path == prefix || request.path.hasPrefix(prefix + "/")
    }
    for id in open.keys { pending.removeValue(forKey: id) }
    lock.unlock()

    for request in open.values {
      request.completion(.failure(.unavailable(status: 503, message: "Media server stopped")))
    }
  }
}
