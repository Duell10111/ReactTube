import Foundation
import VideoToolbox

@main
enum AutomaticPlaybackProbe {
  static func main() throws {
    let server = LocalMediaServer()
    let port = try server.start()
    defer { server.stop() }

    for root in ["/sabr/a", "/sabr/ab"] {
      server.registerText(path: root + "/master.m3u8", body: "fixture", contentType: "application/vnd.apple.mpegurl")
      server.registerStreamPrefix(root + "/seg") { path, completion in
        completion(.success(MediaServerResponse(data: Data(path.utf8), contentType: "video/mp4")))
      }
    }

    let session = URLSession(configuration: .ephemeral)
    func status(_ path: String) -> Int {
      let ready = DispatchSemaphore(value: 0)
      var result = 0
      let request = URLRequest(url: URL(string: "http://127.0.0.1:\(port)\(path)")!, timeoutInterval: 5)
      session.dataTask(with: request) { _, response, _ in
        result = (response as? HTTPURLResponse)?.statusCode ?? 0
        ready.signal()
      }.resume()
      precondition(ready.wait(timeout: .now() + 6) == .success, "Local request timed out")
      return result
    }

    precondition(status("/sabr/a/master.m3u8") == 200)
    precondition(status("/sabr/a/seg/1.m4s") == 200)
    precondition(status("/sabr/ab/master.m3u8") == 200)
    server.unregister(prefix: "/sabr/a")
    precondition(status("/sabr/a/master.m3u8") == 404)
    precondition(status("/sabr/a/seg/1.m4s") == 404)
    precondition(status("/sabr/ab/master.m3u8") == 200)
    precondition(status("/sabr/ab/seg/1.m4s") == 200)
    server.unregister(prefix: "/sabr/ab")
    precondition(status("/sabr/ab/seg/1.m4s") == 404)
    print("Passed scoped SABR registration cleanup; AV1 hardware support: \(VTIsHardwareDecodeSupported(kCMVideoCodecType_AV1))")
  }
}
