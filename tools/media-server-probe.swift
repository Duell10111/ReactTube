// Prüft `LocalMediaServer` (Plan-Phase 3.2) und die SABR-Auslieferung (6.5)
// gegen echte Daten — auf dem Mac, ohne Gerätebuild.
//
// Warum hier und nicht auf der Apple TV: die Fehler, die AVPlayer stumm
// abweisen lassen, sind alle HTTP-Details — ein falscher Content-Type, ein
// fehlendes `Content-Length`, ein `206` mit verkehrtem `Content-Range`. Die
// zeigen sich auf dem Mac in Sekunden statt nach einem Gerätebuild. Genau so
// wurde in Phase 2.0 geklärt, dass AVPlayer kein `file://`-Master annimmt
// (siehe `avplayer-probe.swift`).
//
// Die Aufnahme erzeugt `YouTube.js/dev-scripts/dump-sabr-fixture.mjs`: echte
// Segmente über SABR plus die Playlists mit `__BASE__` als Platzhalter für die
// Serveradresse, die erst zur Laufzeit feststeht.
//
// Bauen und laufen lassen:
//   swiftc -O -o /tmp/media-server-probe \
//     tools/media-server-probe.swift \
//     modules/media-server/ios/LocalMediaServer.swift
//   /tmp/media-server-probe <aufnahmeverzeichnis>

import AVFoundation
import Foundation

// MARK: - Prüfgerüst

final class Checks {
  private(set) var failed = 0
  private var passed = 0

  func expect(_ label: String, _ condition: Bool, _ detail: String = "") {
    let mark = condition ? "✔" : "✘"
    print("  \(mark) \(label)\(detail.isEmpty ? "" : " — \(detail)")")
    if condition { passed += 1 } else { failed += 1 }
  }

  func summary() {
    print("\n\(failed == 0 ? "✔ Alle \(passed) Prüfungen bestanden" : "✘ \(failed) von \(passed + failed) Prüfungen fehlgeschlagen")")
  }
}

struct Fixture: Decodable {
  let videoId: String
  let segmentsPerFormat: Int
  let basePlaceholder: String
  let master: String
  let playlists: [String]

  enum CodingKeys: String, CodingKey {
    case videoId = "video_id"
    case segmentsPerFormat = "segments_per_format"
    case basePlaceholder = "base_placeholder"
    case master
    case playlists
  }
}

@main
enum Probe {
  static func main() {
    let checks = Checks()

    // MARK: - Aufnahme einlesen

    let arguments = CommandLine.arguments

    guard arguments.count > 1 else {
      print("Aufruf: media-server-probe <aufnahmeverzeichnis>")
      exit(2)
    }

    let fixtureURL = URL(fileURLWithPath: arguments[1], isDirectory: true)


    let fixture: Fixture
    do {
      let data = try Data(contentsOf: fixtureURL.appendingPathComponent("fixture.json"))
      fixture = try JSONDecoder().decode(Fixture.self, from: data)
    } catch {
      print("Aufnahme nicht lesbar: \(error.localizedDescription)")
      print("Erst erzeugen: node dev-scripts/dump-sabr-fixture.mjs \(fixtureURL.path)")
      exit(2)
    }

    print("Aufnahme \(fixture.videoId) · \(fixture.segmentsPerFormat) Segmente je Spur\n")

    // MARK: - Server aufsetzen

    let server = LocalMediaServer()
    let port: UInt16

    do {
      port = try server.start()
    } catch {
      print("Server nicht gestartet: \(error)")
      exit(1)
    }

    /// Derselbe Pfadaufbau, den die App in Phase 6.5 benutzt: die Segmente liegen
    /// unter einem eigenen Präfix, die Playlists daneben.
    let base = "http://127.0.0.1:\(port)"
    let segmentPrefix = "/seg"

    print("▶ Server auf \(base)")
    checks.expect("Port vergeben", port > 0, "\(port)")

    // Playlists als Text ablegen, mit der echten Adresse statt des Platzhalters.
    for name in [fixture.master] + fixture.playlists {
      let url = fixtureURL.appendingPathComponent(name)
      guard let content = try? String(contentsOf: url, encoding: .utf8) else {
        checks.expect("Playlist \(name) gelesen", false)
        continue
      }

      let resolved = content.replacingOccurrences(
        of: fixture.basePlaceholder,
        with: base + segmentPrefix
      )

      server.registerText(
        path: "/\(name)",
        body: resolved,
        contentType: LocalMediaServer.contentType(forPath: name)
      )
    }

    /// Steht für den SABR-Anbieter aus Phase 6.5: dort holt der Handler das Segment
    /// aus einem `SabrSegmentSource`, hier von der Platte. Für den Server ist es
    /// dasselbe — ein Pfad kommt herein, Bytes gehen hinaus.
    var providerCalls = 0
    let providerLock = NSLock()

    server.registerStreamPrefix(segmentPrefix) { path, completion in
      providerLock.lock()
      providerCalls += 1
      providerLock.unlock()

      // /seg/<format key>/<n>.m4s → Datei in der Aufnahme
      let relative = String(path.dropFirst(segmentPrefix.count + 1))
      let parts = relative.split(separator: "/")

      guard parts.count == 2 else {
        completion(.failure(.badRequest))
        return
      }

      // Der Server hat den Pfad schon dekodiert (`401:`), auf der Platte liegt das
      // Verzeichnis kodiert — also zurückkodieren.
      let directory = parts[0].addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? String(parts[0])
      let file = fixtureURL.appendingPathComponent(directory).appendingPathComponent(String(parts[1]))

      guard let data = try? Data(contentsOf: file) else {
        completion(.failure(.notFound))
        return
      }

      completion(.success(MediaServerResponse(
        data: data,
        contentType: LocalMediaServer.contentType(forPath: String(parts[1]))
      )))
    }

    // MARK: - HTTP-Semantik

    let session = URLSession(configuration: .ephemeral)

    /// Ein synchroner Abruf — die Probe ist ein Skript, Verschachtelung wäre nur Lärm.
    func request(
      _ path: String,
      method: String = "GET",
      range: String? = nil
    ) -> (status: Int, headers: [String: String], body: Data)? {
      var componentsURL = URLComponents(string: base + path)
      componentsURL?.percentEncodedPath = path
      guard let url = componentsURL?.url ?? URL(string: base + path) else { return nil }

      var urlRequest = URLRequest(url: url)
      urlRequest.httpMethod = method
      if let range {
        urlRequest.setValue(range, forHTTPHeaderField: "Range")
      }

      let semaphore = DispatchSemaphore(value: 0)
      var result: (Int, [String: String], Data)?

      session.dataTask(with: urlRequest) { data, response, _ in
        if let response = response as? HTTPURLResponse {
          var headers: [String: String] = [:]
          for (key, value) in response.allHeaderFields {
            headers[String(describing: key).lowercased()] = String(describing: value)
          }
          result = (response.statusCode, headers, data ?? Data())
        }
        semaphore.signal()
      }.resume()

      _ = semaphore.wait(timeout: .now() + 15)
      return result
    }

    print("\n▶ HTTP-Semantik")

    if let master = request("/\(fixture.master)") {
      checks.expect("Master: 200", master.status == 200)
      checks.expect(
        "Master: Content-Type",
        master.headers["content-type"] == "application/vnd.apple.mpegurl",
        master.headers["content-type"] ?? "fehlt"
      )
      checks.expect(
        "Master: Content-Length passt zum Rumpf",
        master.headers["content-length"] == String(master.body.count),
        "\(master.headers["content-length"] ?? "fehlt") vs. \(master.body.count)"
      )
      checks.expect("Master: kein Platzhalter mehr", !String(decoding: master.body, as: UTF8.self).contains(fixture.basePlaceholder))
    } else {
      checks.expect("Master abrufbar", false)
    }

    if let unknown = request("/gibtsnicht.m3u8") {
      checks.expect("Unbekannter Pfad: 404", unknown.status == 404, "\(unknown.status)")
    }

    if let notAllowed = request("/\(fixture.master)", method: "POST") {
      checks.expect("POST: 405 mit Allow", notAllowed.status == 405 && notAllowed.headers["allow"] != nil, "\(notAllowed.status)")
    }

    // Ein Segment direkt — das ist der Weg, den AVPlayer für jeden EXTINF-Eintrag geht.
    let firstSegmentPath = "\(segmentPrefix)/\("139:".addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? "")/1.m4s"

    guard let segment = request(firstSegmentPath) else {
      checks.expect("Segment abrufbar", false)
      checks.summary()
      exit(checks.failed == 0 ? 0 : 1)
    }

    checks.expect("Segment: 200", segment.status == 200)
    checks.expect(
      "Segment: Content-Type video/iso.segment",
      segment.headers["content-type"] == "video/iso.segment",
      segment.headers["content-type"] ?? "fehlt"
    )
    checks.expect("Segment: Accept-Ranges", segment.headers["accept-ranges"] == "bytes")
    checks.expect(
      "Segment: beginnt mit moof",
      segment.body.count > 8 && String(decoding: segment.body[4..<8], as: UTF8.self) == "moof",
      "\(segment.body.count) B"
    )

    let total = segment.body.count

    if let head = request(firstSegmentPath, method: "HEAD") {
      checks.expect("HEAD: 200 ohne Rumpf", head.status == 200 && head.body.isEmpty, "\(head.body.count) B")
      checks.expect(
        "HEAD: Content-Length wie beim GET",
        head.headers["content-length"] == String(total),
        head.headers["content-length"] ?? "fehlt"
      )
    }

    if let partial = request(firstSegmentPath, range: "bytes=0-99") {
      checks.expect("Range 0-99: 206", partial.status == 206, "\(partial.status)")
      checks.expect("Range 0-99: 100 Bytes", partial.body.count == 100, "\(partial.body.count)")
      checks.expect(
        "Range 0-99: Content-Range",
        partial.headers["content-range"] == "bytes 0-99/\(total)",
        partial.headers["content-range"] ?? "fehlt"
      )
      checks.expect("Range 0-99: Inhalt stimmt", partial.body == segment.body.prefix(100))
    }

    if let openEnded = request(firstSegmentPath, range: "bytes=\(total - 10)-") {
      checks.expect("Range ab Offset ohne Ende: letzte 10 Bytes", openEnded.status == 206 && openEnded.body.count == 10, "\(openEnded.body.count)")
    }

    if let suffix = request(firstSegmentPath, range: "bytes=-20") {
      checks.expect("Range -20: letzte 20 Bytes", suffix.status == 206 && suffix.body == segment.body.suffix(20))
    }

    if let unsatisfiable = request(firstSegmentPath, range: "bytes=\(total + 500)-") {
      checks.expect(
        "Range jenseits des Endes: 416 mit Gesamtlänge",
        unsatisfiable.status == 416 && unsatisfiable.headers["content-range"] == "bytes */\(total)",
        "\(unsatisfiable.status) \(unsatisfiable.headers["content-range"] ?? "")"
      )
    }

    if let missing = request("\(segmentPrefix)/139%3A/9999.m4s") {
      checks.expect("Fehlendes Segment: 404 vom Anbieter", missing.status == 404, "\(missing.status)")
    }

    // Keep-Alive: dieselbe Session holt mehrere Segmente. Bliebe eine Antwort ohne
    // Content-Length, geriete die Verbindung hier aus dem Takt.
    var reused = true
    for sequence in 1...6 {
      guard let response = request("\(segmentPrefix)/139%3A/\(sequence).m4s"), response.status == 200, !response.body.isEmpty else {
        reused = false
        break
      }
    }
    checks.expect("Keep-Alive: sechs Segmente auf einer Session", reused)

    // MARK: - AVFoundation

    print("\n▶ AVFoundation")

    let masterURL = URL(string: "\(base)/\(fixture.master)")!
    let asset = AVURLAsset(url: masterURL)
    let loaded = DispatchSemaphore(value: 0)
    var loadError: String?
    var duration: Double = 0

    asset.loadValuesAsynchronously(forKeys: ["playable", "duration", "tracks"]) {
      var error: NSError?
      switch asset.statusOfValue(forKey: "playable", error: &error) {
      case .loaded:
        duration = CMTimeGetSeconds(asset.duration)
      case .failed:
        loadError = error?.localizedDescription ?? "unbekannt"
      default:
        loadError = "Status \(asset.statusOfValue(forKey: "playable", error: &error).rawValue)"
      }
      loaded.signal()
    }

    if loaded.wait(timeout: .now() + 30) == .timedOut {
      checks.expect("Master von AVFoundation geladen", false, "Zeitüberschreitung nach 30 s")
    } else if let loadError {
      checks.expect("Master von AVFoundation geladen", false, loadError)
    } else {
      checks.expect("Master von AVFoundation geladen", asset.isPlayable, "playable=\(asset.isPlayable), Dauer=\(String(format: "%.1f", duration))s")
      checks.expect(
        "Dauer passt zu \(fixture.segmentsPerFormat) Segmenten",
        duration > 30 && duration < 120,
        "\(String(format: "%.1f", duration))s"
      )
    }

    // Der eigentliche Beweis: nicht nur das Manifest annehmen, sondern dekodieren
    // und die Zeit vorrücken lassen. Genau hier scheiterte in Phase 2.0 der
    // `file://`-Weg, ohne einen Fehler zu melden.
    let item = AVPlayerItem(asset: asset)
    let player = AVPlayer(playerItem: item)
    player.volume = 0
    player.play()

    // Der Run-Loop **muss** laufen: AVPlayer treibt seinen Zustand darüber
    // voran. Mit `Thread.sleep` bleibt die Zeit auf 0, obwohl alles stimmt —
    // das sah zuerst wie ein Serverfehler aus.
    var advanced = CMTime.zero
    let deadline = Date().addingTimeInterval(25)

    while Date() < deadline {
      RunLoop.current.run(until: Date().addingTimeInterval(0.2))
      advanced = player.currentTime()

      if CMTimeGetSeconds(advanced) > 3 || item.status == .failed {
        break
      }
    }

    if item.status == .failed {
      checks.expect("Wiedergabe läuft", false, item.error?.localizedDescription ?? "unbekannt")
    } else {
      let seconds = CMTimeGetSeconds(advanced)
      checks.expect("Wiedergabe läuft", seconds > 3, "\(String(format: "%.1f", seconds))s abgespielt")
    }

    // Bei HLS bleibt `AVURLAsset.tracks` leer — die Spuren tauchen erst am
    // AVPlayerItem auf, sobald es spielt. Deshalb hier und nicht oben.
    let itemTracks = item.tracks.compactMap { $0.assetTrack?.mediaType }
    checks.expect(
      "Video- und Tonspur dekodiert",
      itemTracks.contains(.video) && itemTracks.contains(.audio),
      itemTracks.map(\.rawValue).joined(separator: ", ")
    )

    player.pause()

    providerLock.lock()
    let calls = providerCalls
    providerLock.unlock()

    checks.expect("Segmente kamen über den Anbieter", calls > 0, "\(calls) Aufrufe")

    server.stop()
    checks.expect("Server beendet", server.port == nil)

    checks.summary()
    exit(checks.failed == 0 ? 0 : 1)

  }
}
