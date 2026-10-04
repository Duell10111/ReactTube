// JavaScript-Anbindung für `LocalMediaServer` — Plan-Phase 3.1.
//
// Der Server selbst weiß nichts von Expo (siehe `LocalMediaServer.swift`); hier
// wird nur übersetzt. Zwei Wege führen herein:
//
//  - **Texte**: die Manifeste. JavaScript kennt sie vollständig und legt sie ab.
//  - **Segmente**: kann JavaScript nicht vorab kennen — ein SABR-Segment entsteht
//    erst, wenn danach gefragt wird. Dafür dreht sich die Richtung: der Server
//    stellt eine Frage nach JavaScript (`onSegmentRequest`) und wartet auf
//    `respondToSegment` oder `failSegment`.
//
// Die Antwort kommt als `Uint8Array` und wird **sofort** in `Data` kopiert:
// ein typisiertes Array zeigt in den Speicher der JS-Laufzeit und gilt nur
// innerhalb des Aufrufs. Deshalb ist `respondToSegment` bewusst eine synchrone
// `Function` — ihr Rumpf läuft auf dem JS-Thread, wo der Puffer gültig ist.

import ExpoModulesCore

public class MediaServerModule: Module {
  private let server = LocalMediaServer()

  /// Offene Segmentanfragen, auf die JavaScript noch antworten muss.
  private var pending: [Int: (Result<MediaServerResponse, MediaServerError>) -> Void] = [:]
  private var nextRequestId = 1
  private let lock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("MediaServer")

    Events("onSegmentRequest")

    OnDestroy {
      // Ohne das überlebt der Listener einen Reload der JS-Laufzeit und der Port
      // bleibt belegt, während niemand mehr auf die Ereignisse hört.
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

    Function("registerText") { (path: String, body: String, contentType: String) in
      self.server.registerText(path: path, body: body, contentType: contentType)
    }

    Function("registerStreamPrefix") { (prefix: String) in
      self.server.registerStreamPrefix(prefix) { [weak self] path, completion in
        guard let self else {
          completion(.failure(.unavailable(status: 503, message: "Media server is gone")))
          return
        }

        self.lock.lock()
        let requestId = self.nextRequestId
        self.nextRequestId += 1
        self.pending[requestId] = completion
        self.lock.unlock()

        self.sendEvent("onSegmentRequest", [
          "requestId": requestId,
          "path": path
        ])
      }
    }

    Function("respondToSegment") { (requestId: Int, data: Uint8Array, contentType: String) in
      guard let completion = self.takePending(requestId) else {
        // Der Server hat die Anfrage schon mit 504 beantwortet. Kein Fehler,
        // aber die Bytes sind nicht mehr zu gebrauchen.
        return
      }

      // Kopie, solange der JS-Puffer gültig ist — siehe Kopfkommentar.
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
    return pending.removeValue(forKey: requestId)
  }

  /// Beantwortet alles Offene, damit keine Verbindung bis zum Zeitablauf hängt.
  private func clearPending() {
    lock.lock()
    let open = pending
    pending.removeAll()
    lock.unlock()

    for completion in open.values {
      completion(.failure(.unavailable(status: 503, message: "Media server stopped")))
    }
  }
}
