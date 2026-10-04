// Lädt ein HLS-Master mit AVFoundation und meldet, ob AVPlayer es annimmt.
// Zweck: trennen, ob unser Manifest fehlerhaft ist oder ob AVPlayer schlicht
// keine `file://`-Playlist mit entfernten Segmenten spielt.
import AVFoundation
import Foundation

let args = CommandLine.arguments
guard args.count > 1, let url = URL(string: args[1]) else {
    print("Aufruf: probe <url>")
    exit(2)
}

let asset = AVURLAsset(url: url)
let semaphore = DispatchSemaphore(value: 0)
var result = "keine Antwort"

asset.loadValuesAsynchronously(forKeys: ["playable", "duration", "tracks"]) {
    var error: NSError?
    let status = asset.statusOfValue(forKey: "playable", error: &error)

    switch status {
    case .loaded:
        let duration = CMTimeGetSeconds(asset.duration)
        result = "GELADEN · playable=\(asset.isPlayable) · Dauer=\(duration)s · Tracks=\(asset.tracks.count)"
    case .failed:
        result = "FEHLER · \(error?.localizedDescription ?? "?") · \(error?.debugDescription ?? "")"
    case .cancelled:
        result = "ABGEBROCHEN"
    default:
        result = "Status \(status.rawValue)"
    }
    semaphore.signal()
}

if semaphore.wait(timeout: .now() + 30) == .timedOut {
    result = "ZEITÜBERSCHREITUNG nach 30 s — AVFoundation hat nicht geantwortet"
}

print(result)
