// A minimal HTTP/1.1 server on the loopback interface — plan phase 3.2.
//
// Why this exists: AVPlayer refuses an HLS master over `file://`
// (`AVFoundationErrorDomain -11800` / `OSStatus -16913`), and SABR segments
// cannot be written out as files at all — they only come into being when asked
// for. So the segments need an address AVPlayer will fetch from, and that means
// a server. Loopback keeps it off the network, which also means tvOS never asks
// the user for local network permission.
//
// Network.framework is used directly rather than a third-party server: what is
// needed here is GET, HEAD, `Range` and keep-alive, which is a few hundred
// lines, and a dependency that stops being maintained would be worse.
//
// **This file deliberately imports nothing from Expo.** It is compiled on its
// own by `tools/media-server-probe.swift`, which drives it with curl and
// AVFoundation on the Mac — the bug classes that break AVPlayer (wrong
// content type, a missing `Content-Length`, a botched `206`) show up there in
// seconds instead of after a device build.

import Foundation
import Network

public enum MediaServerError: Error {
  case notFound
  case badRequest
  case unavailable(status: Int, message: String)
}

/// A response body, either already in hand or produced on demand.
public struct MediaServerResponse {
  public let data: Data
  public let contentType: String

  public init(data: Data, contentType: String) {
    self.data = data
    self.contentType = contentType
  }
}

/// Answers a request for a path that has no stored body.
///
/// Completion-based on purpose: the SABR provider has to go back to JavaScript
/// and wait for a segment, which can take hundreds of milliseconds. Network
/// framework's handlers are asynchronous anyway, so nothing is blocked while
/// this is outstanding.
public typealias MediaServerProvider = (
  _ path: String,
  _ completion: @escaping (Result<MediaServerResponse, MediaServerError>) -> Void
) -> Void

public final class LocalMediaServer {
  /// Content types that matter. A wrong one on the manifest or the segments and
  /// AVPlayer declines the stream without saying why.
  private static let contentTypes: [String: String] = [
    "m3u8": "application/vnd.apple.mpegurl",
    "m4s": "video/iso.segment",
    "mp4": "video/mp4",
    "m4a": "audio/mp4",
    "ts": "video/mp2t",
    "vtt": "text/vtt"
  ]

  public static func contentType(forPath path: String) -> String {
    let ext = (path as NSString).pathExtension.lowercased()
    return contentTypes[ext] ?? "application/octet-stream"
  }

  /// How long a provider has before the request is answered with 504.
  ///
  /// Generous because a SABR segment can need more than one round trip to the
  /// server, and a stall is far better than AVPlayer being told the segment does
  /// not exist — that ends the stream, a slow segment only delays it.
  public var providerTimeout: TimeInterval = 30

  private let queue = DispatchQueue(label: "media-server", qos: .userInitiated)
  /// Guards `texts`, `streamPrefixes` and `provider` against the connection
  /// handlers, which run concurrently on `queue`'s pool.
  private let lock = NSLock()

  private var listener: NWListener?
  private var connections: [ObjectIdentifier: NWConnection] = [:]

  private var texts: [String: MediaServerResponse] = [:]
  private var streamPrefixes: [String] = []
  private var provider: MediaServerProvider?

  public init() {}

  // MARK: - Lifecycle

  /// Binds to a free port on 127.0.0.1 and returns it.
  public func start() throws -> UInt16 {
    if let listener, let port = listener.port {
      return port.rawValue
    }

    let parameters = NWParameters.tcp
    // Loopback only. Anything else would expose the stream to the network and,
    // on tvOS, trip the local network permission prompt.
    parameters.requiredLocalEndpoint = .hostPort(host: .ipv4(.loopback), port: .any)
    parameters.allowLocalEndpointReuse = true

    let listener = try NWListener(using: parameters)

    listener.newConnectionHandler = { [weak self] connection in
      self?.accept(connection)
    }

    let ready = DispatchSemaphore(value: 0)
    var failure: Error?

    listener.stateUpdateHandler = { state in
      switch state {
      case .ready:
        ready.signal()
      case .failed(let error), .waiting(let error):
        failure = error
        ready.signal()
      case .cancelled:
        ready.signal()
      default:
        break
      }
    }

    listener.start(queue: queue)

    if ready.wait(timeout: .now() + 5) == .timedOut {
      listener.cancel()
      throw MediaServerError.unavailable(status: 500, message: "The listener did not come up within 5 s")
    }

    if let failure {
      listener.cancel()
      throw failure
    }

    guard let port = listener.port else {
      listener.cancel()
      throw MediaServerError.unavailable(status: 500, message: "The listener reported no port")
    }

    self.listener = listener
    return port.rawValue
  }

  public func stop() {
    listener?.cancel()
    listener = nil

    lock.lock()
    let open = connections
    connections.removeAll()
    texts.removeAll()
    streamPrefixes.removeAll()
    provider = nil
    lock.unlock()

    for connection in open.values {
      connection.cancel()
    }
  }

  public var port: UInt16? {
    listener?.port?.rawValue
  }

  // MARK: - Registration

  /// Stores a body to serve verbatim — the manifests.
  public func registerText(path: String, body: String, contentType: String) {
    lock.lock()
    texts[normalize(path)] = MediaServerResponse(data: Data(body.utf8), contentType: contentType)
    lock.unlock()
  }

  /// Marks a path prefix as provider-backed: everything under it is asked for on
  /// demand rather than stored. This is how the SABR segments are served.
  public func registerStreamPrefix(_ prefix: String, provider: @escaping MediaServerProvider) {
    lock.lock()
    let normalized = normalize(prefix)
    if !streamPrefixes.contains(normalized) {
      streamPrefixes.append(normalized)
    }
    self.provider = provider
    lock.unlock()
  }

  public func unregisterAll() {
    lock.lock()
    texts.removeAll()
    streamPrefixes.removeAll()
    provider = nil
    lock.unlock()
  }

  private func normalize(_ path: String) -> String {
    path.hasPrefix("/") ? path : "/\(path)"
  }

  // MARK: - Connections

  private func accept(_ connection: NWConnection) {
    let id = ObjectIdentifier(connection)

    lock.lock()
    connections[id] = connection
    lock.unlock()

    connection.stateUpdateHandler = { [weak self] state in
      switch state {
      case .cancelled, .failed:
        self?.lock.lock()
        self?.connections.removeValue(forKey: id)
        self?.lock.unlock()
      default:
        break
      }
    }

    connection.start(queue: queue)
    receive(on: connection, buffer: Data())
  }

  /// Reads until a complete request head is in the buffer, then handles it.
  ///
  /// The leftover after one request stays in the buffer: with keep-alive a client
  /// may pipeline, and AVPlayer reuses connections heavily.
  private func receive(on connection: NWConnection, buffer: Data) {
    connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] chunk, _, isComplete, error in
      guard let self else { return }

      if error != nil {
        connection.cancel()
        return
      }

      var buffer = buffer

      if let chunk, !chunk.isEmpty {
        buffer.append(chunk)
      }

      while let head = Self.splitHead(of: buffer) {
        buffer = head.rest

        guard let request = HTTPRequest(head: head.head) else {
          self.send(status: 400, reason: "Bad Request", to: connection, closeAfter: true)
          return
        }

        self.handle(request, on: connection)
      }

      if isComplete {
        connection.cancel()
        return
      }

      self.receive(on: connection, buffer: buffer)
    }
  }

  /// Splits the first `\r\n\r\n`-terminated head off the buffer.
  private static func splitHead(of buffer: Data) -> (head: String, rest: Data)? {
    let terminator = Data("\r\n\r\n".utf8)

    guard let range = buffer.range(of: terminator) else {
      return nil
    }

    let head = String(decoding: buffer[buffer.startIndex..<range.lowerBound])
    return (head, buffer[range.upperBound...])
  }

  private func handle(_ request: HTTPRequest, on connection: NWConnection) {
    guard request.method == "GET" || request.method == "HEAD" else {
      send(status: 405, reason: "Method Not Allowed", to: connection, extraHeaders: ["Allow": "GET, HEAD"])
      return
    }

    lock.lock()
    let stored = texts[request.path]
    let isStream = streamPrefixes.contains { request.path.hasPrefix($0) }
    let provider = self.provider
    lock.unlock()

    if let stored {
      respond(with: stored, to: request, on: connection)
      return
    }

    guard isStream, let provider else {
      send(status: 404, reason: "Not Found", to: connection)
      return
    }

    // One-shot guard: a provider that both times out and answers late must not
    // write two responses onto the same connection.
    let answered = ManagedAtomicFlag()

    let deadline = DispatchWorkItem { [weak self] in
      guard answered.take() else { return }
      self?.send(status: 504, reason: "Gateway Timeout", to: connection)
    }

    queue.asyncAfter(deadline: .now() + providerTimeout, execute: deadline)

    provider(request.path) { [weak self] result in
      guard answered.take() else { return }
      deadline.cancel()

      guard let self else { return }

      switch result {
      case .success(let response):
        self.respond(with: response, to: request, on: connection)
      case .failure(.notFound):
        self.send(status: 404, reason: "Not Found", to: connection)
      case .failure(.badRequest):
        self.send(status: 400, reason: "Bad Request", to: connection)
      case .failure(.unavailable(let status, let message)):
        self.send(status: status, reason: message, to: connection)
      }
    }
  }

  /// Writes a body out, honouring `Range` and `HEAD`.
  private func respond(with response: MediaServerResponse, to request: HTTPRequest, on connection: NWConnection) {
    let total = response.data.count

    var status = 200
    var reason = "OK"
    var body = response.data
    var headers: [String: String] = [
      "Content-Type": response.contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store"
    ]

    if let range = request.range {
      guard let resolved = range.resolve(totalLength: total) else {
        // 416 has to state the real length, otherwise the client cannot correct
        // itself and just retries the same impossible range.
        send(
          status: 416,
          reason: "Range Not Satisfiable",
          to: connection,
          extraHeaders: ["Content-Range": "bytes */\(total)"]
        )
        return
      }

      status = 206
      reason = "Partial Content"
      body = response.data.subdata(in: resolved)
      headers["Content-Range"] = "bytes \(resolved.lowerBound)-\(resolved.upperBound - 1)/\(total)"
    }

    headers["Content-Length"] = String(body.count)

    send(
      status: status,
      reason: reason,
      to: connection,
      extraHeaders: headers,
      body: request.method == "HEAD" ? Data() : body
    )
  }

  private func send(
    status: Int,
    reason: String,
    to connection: NWConnection,
    extraHeaders: [String: String] = [:],
    body: Data = Data(),
    closeAfter: Bool = false
  ) {
    var headers = extraHeaders

    // A response without Content-Length leaves the client guessing where the
    // body ends; on a keep-alive connection that desynchronises everything after
    // it. Always set it, even for the empty error bodies.
    if headers["Content-Length"] == nil {
      headers["Content-Length"] = String(body.count)
    }

    headers["Connection"] = closeAfter ? "close" : "keep-alive"

    var head = "HTTP/1.1 \(status) \(reason)\r\n"
    for (name, value) in headers.sorted(by: { $0.key < $1.key }) {
      head += "\(name): \(value)\r\n"
    }
    head += "\r\n"

    var payload = Data(head.utf8)
    payload.append(body)

    connection.send(content: payload, completion: .contentProcessed { _ in
      if closeAfter {
        connection.cancel()
      }
    })
  }
}

/// A flag exactly one caller can claim — the timeout race in `handle`.
private final class ManagedAtomicFlag {
  private let lock = NSLock()
  private var taken = false

  func take() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    if taken { return false }
    taken = true
    return true
  }
}

// MARK: - Request parsing

struct HTTPRequest {
  let method: String
  /// Path with the query string stripped; percent-decoded.
  let path: String
  let headers: [String: String]
  let range: ByteRange?

  init?(head: String) {
    let lines = head.split(separator: "\r\n", omittingEmptySubsequences: false)

    guard let requestLine = lines.first else {
      return nil
    }

    let parts = requestLine.split(separator: " ")

    guard parts.count >= 2 else {
      return nil
    }

    method = String(parts[0]).uppercased()

    let target = String(parts[1])
    let withoutQuery = target.split(separator: "?", maxSplits: 1).first.map(String.init) ?? target
    // The format key in a SABR path carries a colon (`401:`), which the manifest
    // percent-encodes. Without decoding here the lookup would never match.
    path = withoutQuery.removingPercentEncoding ?? withoutQuery

    var headers: [String: String] = [:]

    for line in lines.dropFirst() where !line.isEmpty {
      let pair = line.split(separator: ":", maxSplits: 1)
      guard pair.count == 2 else { continue }
      headers[String(pair[0]).lowercased()] = String(pair[1]).trimmingCharacters(in: .whitespaces)
    }

    self.headers = headers
    range = headers["range"].flatMap(ByteRange.init(header:))
  }
}

/// A single `bytes=` range. Multi-range requests are not supported; AVPlayer does
/// not issue them, and answering one needs a multipart body.
struct ByteRange {
  let start: Int?
  let end: Int?

  init?(header: String) {
    guard header.lowercased().hasPrefix("bytes=") else {
      return nil
    }

    let spec = header.dropFirst("bytes=".count).trimmingCharacters(in: .whitespaces)

    guard !spec.contains(",") else {
      return nil
    }

    let parts = spec.split(separator: "-", omittingEmptySubsequences: false)

    guard parts.count == 2 else {
      return nil
    }

    start = parts[0].isEmpty ? nil : Int(parts[0])
    end = parts[1].isEmpty ? nil : Int(parts[1])

    if start == nil && end == nil {
      return nil
    }
  }

  /// Turns the header into a concrete half-open range, or `nil` if unsatisfiable.
  func resolve(totalLength: Int) -> Range<Int>? {
    guard totalLength > 0 else {
      return nil
    }

    if let start {
      guard start < totalLength else {
        return nil
      }
      // `end` is inclusive in HTTP and may point past the body, which is legal —
      // it simply means "to the end".
      let last = min(end ?? totalLength - 1, totalLength - 1)
      guard last >= start else {
        return nil
      }
      return start..<(last + 1)
    }

    // `bytes=-N`: the last N bytes.
    guard let suffix = end, suffix > 0 else {
      return nil
    }

    return max(0, totalLength - suffix)..<totalLength
  }
}

private extension String {
  init(decoding data: Data) {
    self = String(data: data, encoding: .utf8) ?? String(decoding: data, as: UTF8.self)
  }
}
