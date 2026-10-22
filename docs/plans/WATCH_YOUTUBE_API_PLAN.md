# Plan: Eigenständige YouTube-API auf der Uhr

> Stand: 2026-09-25 · Branch: `ui-adaptions`
> Scope: `targets/watch/**` (watchOS, Swift/SwiftUI) — eine kleine, native
> InnerTube-Implementierung, mit der die Uhr Streaming-URLs **ohne das iPhone**
> auflösen kann.
> Berührt am Rand: `src/hooks/watchSync/WatchYoutubeAPI.ts` (bleibt als Fallback
> unverändert bestehen).
> Nicht im Scope: die Wiedergabe-Architektur der Uhr (`WATCH_UX_PLAN.md`) und
> die Wiedergabe auf Apple TV (`PLAYBACK_REWORK_PLAN.md`).

---

## 0. Ziel in einem Satz

Die Uhr soll einen Titel abspielen und herunterladen können, **solange sie
Internet hat** — unabhängig davon, ob die React-Native-App auf dem iPhone
gerade läuft, im Vordergrund ist oder überhaupt in Reichweite ist.

Der heutige Weg (`requestVideo(id:)` → WatchConnectivity → Telefon →
`resolveStreamingSource(…)` → `videoResponse`) bleibt bestehen und wird zum
**zweiten** Weg. Die Uhr bekommt einen ersten.

---

## 1. Befund — was die Uhr technisch kann und was nicht

Alle Zahlen dieses Abschnitts sind am **25.09.2026** eigenhändig gemessen
(reines `curl`, kein `youtubei.js`), also genau in der Form, in der sie eine
Swift-Implementierung reproduzieren müsste.

### 1.1 watchOS hat keine JavaScript-Engine — das ist die harte Grenze

```
$ ls "$(xcrun --sdk watchos --show-sdk-path)/System/Library/Frameworks" | grep -iE "javascript|webkit"
(keine Treffer)
```

Weder `JavaScriptCore` noch `WebKit` existieren im watchOS-SDK. Damit ist der
Weg von `youtubei.js` — Player-Script laden, die `n`/`sig`-Funktion extrahieren
(`YouTube.js/src/utils/javascript/JsExtractor.ts`) und via
`Platform.shim.eval` ausführen (`YouTube.js/src/core/Player.ts:238`) — auf der
Uhr **nicht baubar**. Ein eigener JS-Interpreter in Swift wäre ein Projekt für
sich und bei jedem Player-Update ein Risiko.

**Konsequenz:** Die Uhr darf niemals in die Lage kommen, entschlüsseln zu
müssen. Sie muss Clients benutzen, deren Antworten gar keine Entschlüsselung
verlangen.

### 1.2 Die Client-Wahl ersetzt die Entschlüsselung

| Client | `visitorData` | `playabilityStatus` | URLs / Cipher / `n`-Param | HLS-Manifest | Byte-Range |
|---|---|---|---|---|---|
| `IOS` | keines | **OK** | 22 / 0 / 0 | – | **gekappt bei ~0,37 MB** |
| `VISIONOS` | keines | LOGIN_REQUIRED | – | – | – |
| `ANDROID_VR` | keines | LOGIN_REQUIRED | – | – | – |
| `VISIONOS` | selbst erzeugt (Protobuf) | LOGIN_REQUIRED | – | – | – |
| `ANDROID_VR` | selbst erzeugt | LOGIN_REQUIRED | – | – | – |
| **`VISIONOS`** | **server-ausgestellt** | **OK** | **25–32 / 0 / 0** | **ja** | **ungekappt** |
| `ANDROID_VR` | server-ausgestellt | OK | 25 / 0 / 0 | – | (nicht gemessen) |

Gemessen an `kJQP7kiw5Fk` (Musikvideo) und `bUHZ2k9DYHY`.

Die entscheidende Spalte ist die vierte: **null Formate mit `signatureCipher`,
null URLs mit `n`-Parameter.** Es gibt schlicht nichts zu entschlüsseln — weder
eine Signatur noch eine Drosselungs-Transformation. Die URL aus der Antwort ist
sofort abrufbar. Das deckt sich mit `YouTube.js/docs/playback-matrix.md`, wo
`VISIONOS`, `IOS` und `ANDROID_VR` je 6/6 erreichen, während `TV_SIMPLY` bei
Musikvideos 25 Formate **mit** Cipher liefert (dort: 0 URLs / 25 Cipher) —
`TV_SIMPLY` ist für die Uhr deshalb unbrauchbar, obwohl es auf dem Telefon der
erste Client der Kette ist.

### 1.3 `VISIONOS` ist der einzige Client ohne Byte-Range-Kappung

```
IOS,      itag 139:  Range 0-65535        → 206
                     Range 0-              → 403
                     Range 1000000-1100000 → 403
VISIONOS, itag 139:  Range 0-              → 206  (1.718.053 Bytes, vollständig)
                     Range 1000000-1100000 → 206
                     Range 1600000-1718052 → 206
```

Das bestätigt `YouTube.js/docs/byte-range-cap.md` aus Sicht der Uhr: die
`IOS`-URL trägt nach rund 0,37 MB nichts mehr — bei itag 140 (128 kbit/s) sind
das etwa 23 Sekunden Ton. Für Streaming **und** Download ist `IOS` damit
untauglich; es bleibt nur als Metadaten-Notnagel.

**`VISIONOS` ist deshalb kein „bevorzugter“ Client, sondern Bedingung.**

### 1.4 `visitorData` muss vom Server kommen

Ein selbst erzeugtes `visitorData` (Protobuf aus 11 Zufallszeichen + Zeitstempel,
wie `Session.ts:438` es als Notlösung baut) führt bei `VISIONOS` und
`ANDROID_VR` zu `LOGIN_REQUIRED` („Melde dich an, damit wir sehen, dass du kein
Bot bist"). Ein server-ausgestelltes funktioniert. Beschafft wird es mit einem
einzigen POST — das Telefon macht es in `src/utils/InnertubeSession.ts:105`
schon genau so:

```
POST https://www.youtube.com/youtubei/v1/visitor_id
Cookie: SOCS=CAE=
{"context":{"client":{"clientName":"WEB","clientVersion":"2.20250213.05.00","hl":"en","gl":"US"}}}
→ 200, responseContext.visitorData  (48 Zeichen, getestet)
```

Kein JSPB-Geflecht, kein `/sw.js_data`-Parsing nötig. Ein `Codable`-Struct mit
zwei Feldern genügt.

### 1.5 Ohne `Range`-Header bricht der Abruf bei ~720 KB ab

```
GET <VISIONOS itag 139, contentLength 6.412.865>
   ohne Range-Header        → 200, 720.896 Bytes  ← Verbindung endet, Datei unvollständig
   Range: bytes=0-          → 206, 6.412.865 Bytes in 1,6 s
   Range: bytes=720896-…    → 206, 720.896 Bytes
```

Das betrifft `DownloadManager.swift:37` unmittelbar: dort geht ein blanker
`URLRequest` an `SDDownloadManager`. Ein Download, der ohne `Range` startet,
liefert eine abgeschnittene Datei — und zwar mit HTTP 200, also ohne erkennbaren
Fehler. **Jeder Medienabruf der Uhr braucht einen expliziten `Range`-Header.**

### 1.6 Weitere gemessene Eckdaten

| Beobachtung | Wert |
|---|---|
| Gültigkeit der Streaming-Daten (`expiresInSeconds`) | 21540 s ≈ 5 h 59 min |
| Größe einer `/player`-Antwort | ~160 KB (gzip-komprimiert übertragen) |
| Audioformate `VISIONOS` | itag 139 (m4a, ~50 kbit/s), 140 (m4a, ~130 kbit/s), 249/250/251 (WebM/Opus) |
| HLS-Master von `VISIONOS` | abrufbar, enthält reine Audio-Renditions (`EXT-X-MEDIA`, GROUP-ID 233/234 = itag 139/140) |
| Musik-Queue autark | `POST music.youtube.com/youtubei/v1/next` mit `WEB_REMIX` + `visitorData` → 50 Queue-Einträge, gezielt per JSON-Pfad lesbar |

### 1.7 Ist-Stand auf der Uhr

Jeder Bedarf an Streaming-Daten läuft heute über `requestVideo(id:)`
(`targets/watch/YoutubeAPI.swift:66`). Aufgerufen wird es an vier Stellen:

| Fundstelle | Anlass |
|---|---|
| `DBUtils.swift:270` | `checkVideosForExpiration` — abgelaufene `validUntil` |
| `DBUtils.swift:285` | `checkPlaylist` — Titel ohne verwertbare Daten |
| `PlaylistManager.swift:62` | Queue-Aufbau, Titel ohne `AudioItem` |
| `SessionSync.swift` (`receiveFileUploadData`) | angeforderter Download |

Verbraucht werden die Daten an drei Stellen: `PlaylistManager.swift:117`
(`streamURL` + `validUntil` → `Track`), `DownloadManager.swift:37`
(`downloadURL`) und `DBUtils.swift:69` (`addDownloadData` schreibt beides).

Das ist der Angriffspunkt: **wenn `requestVideo` zu einer Fassade wird, die
entweder lokal auflöst oder das Telefon fragt, ändert sich an den Aufrufern
nichts.**

---

## 2. Leitideen

| # | Entscheidung | Konsequenz |
|---|---|---|
| 1 | **Client-Wahl statt Kryptographie.** Die Uhr benutzt ausschließlich Clients, deren Antworten keine Signatur- oder `n`-Transformation verlangen. | `VISIONOS` ist der Hauptclient, `ANDROID_VR` die Reserve. Eine Antwort mit `signatureCipher` oder `n`-Parameter gilt als **nicht lokal verwertbar** und wird verworfen, nicht repariert. |
| 2 | **Die Uhr bleibt zweigleisig.** Lokal auflösen ist ein zusätzlicher Weg, kein Ersatz. | Das Telefon bleibt zuständig für alles, was Kontosachen braucht (Bibliothek, Home-Feed, Playlist-Sync). Antworten vom Telefon werden weiterhin angenommen. |
| 3 | **Eine Fassade, keine Streuung.** Alle vier bestehenden Aufrufer sprechen weiter `requestVideo(id:)`; dahinter entscheidet eine Policy. | Kein Umbau von `PlaylistManager`, `DBUtils` oder `DownloadManager` nötig, um den neuen Weg zu aktivieren. |
| 4 | **Kein stiller Fehler.** Jeder Fehlversuch landet in `WatchLog` und als Zustand am Video. | `WatchStatus`/`WatchLog` sind dafür schon da (`WatchLog.swift`, `SessionSync.swift:24`). |
| 5 | **Sparsam mit Anfragen.** Die Uhr ist ein Akku-Gerät, und YouTube stuft Anfrageschwälle als Bot ein. | Entprellung, höchstens zwei gleichzeitige `/player`-Abrufe, exponentielles Zurückweichen, Wiederverwendung des `visitorData`. |
| 6 | **Messbar bleiben.** Was heute stimmt, kann in drei Monaten falsch sein. | Ein Selbsttest im Diagnose-Screen und ein Node-Messskript, das die Client-Matrix aus Sicht der Uhr nachmisst. |

**Reihenfolge:** Phase 1–3 bauen den Weg (HTTP → Session → Player → Fassade).
Phase 4–5 hängen Wiedergabe und Downloads daran. Phase 6 macht ihn sichtbar und
schaltbar. Phase 7 ist optional (Playlists ohne Telefon), Phase 8 Härtung.

---

## 3. Modulschnitt

**Wichtig für die Umsetzung:** `@duell10111/apple-targets` sammelt die Quellen
mit `glob.sync("*.swift")` im Target-Ordner ein
(`node_modules/@duell10111/apple-targets/build/withXcodeChanges.js:777`) —
**nicht rekursiv**. Alle neuen Dateien liegen also flach in `targets/watch/`
und tragen zur Ordnung das Präfix `YT`.

| Datei | Verantwortung | Umfang |
|---|---|---|
| `YTClients.swift` | Client-Konstanten (Name, Version, Gerät, User-Agent, Client-ID) | ~70 Z. |
| `YTHTTP.swift` | `URLSession`-Konfiguration, Header, JSON-POST, Fehlerklassen, Wiederholung | ~130 Z. |
| `YTSession.swift` | `visitorData` beschaffen, persistieren, erneuern | ~110 Z. |
| `YTPlayerResponse.swift` | `Codable`-Modell der `/player`-Antwort (nur benötigte Felder) | ~120 Z. |
| `YTFormatSelection.swift` | Formatwahl (Audio), Ablaufzeit, Tauglichkeitsprüfung | ~110 Z. |
| `YTPlayerService.swift` | Client-Kette, Annahmekriterien, Client-Gedächtnis | ~140 Z. |
| `YTVideoResolver.swift` | Fassade: Policy lokal/Telefon, Entprellung, Nebenläufigkeit | ~180 Z. |
| `YTSelfTest.swift` | Selbsttest für den Diagnose-Screen | ~90 Z. |
| *geändert:* `YoutubeAPI.swift` | `requestVideo(id:)` delegiert an `YTVideoResolver` | – |
| *geändert:* `DownloadManager.swift` | `Range`-Header, Nachfordern bei fehlender URL | – |
| *geändert:* `DiagnosticsScreen.swift`, `AdvancedScreen.swift` | Statusanzeige + Schalter | – |

Keine neue Abhängigkeit: alles nur `Foundation` (`URLSession`, `JSONDecoder`,
`UserDefaults`). `expo-target.config.js` bleibt unverändert.

---

## 4. Phasen

### Phase 1 — HTTP-Grundlage und Session · ~0,5 Tag

**Ziel:** Die Uhr hat ein server-ausgestelltes `visitorData` und einen
gemeinsamen Ausgang für alle InnerTube-Anfragen.

**`YTClients.swift`**

```swift
/// InnerTube client identities the watch is allowed to use.
///
/// Only clients whose `/player` responses carry ready-to-use URLs belong here:
/// watchOS has no JavaScript engine, so a response with `signatureCipher` or an
/// `n` parameter cannot be repaired on the device (see WATCH_YOUTUBE_API_PLAN.md §1.1).
struct YTClient {
  let name: String          // "VISIONOS"
  let version: String       // "1.02"
  let clientID: String      // "101" — X-Youtube-Client-Name
  let userAgent: String
  let deviceMake: String?
  let deviceModel: String?
  let osName: String?
  let osVersion: String?

  static let visionOS = YTClient(...)   // primary: unthrottled byte ranges + HLS
  static let androidVR = YTClient(...)  // reserve: same format shape, no HLS
  static let iOS = YTClient(...)        // last resort: works without visitorData,
                                        // but its URLs are capped at ~0.37 MB
}
```

Werte übernehmen aus `YouTube.js/src/utils/Constants.ts:24-140` (`CLIENTS`,
`CLIENT_NAME_IDS`). Die Konstanten gehören an **eine** Stelle, mit einem
Kommentar, aus welcher Quelle sie stammen — sie veralten.

**`YTHTTP.swift`**

- eine `URLSession` mit `waitsForConnectivity = true`,
  `timeoutIntervalForRequest = 15`, `allowsExpensiveNetworkAccess = true`;
- `post(_:body:client:visitorData:)` setzt `Content-Type`,
  `User-Agent`, `X-Youtube-Client-Name`, `X-Youtube-Client-Version`,
  `X-Goog-Visitor-Id` und `Accept-Language`;
- Fehlerklassen, weil die Aufrufer unterschiedlich reagieren müssen:

```swift
enum YTError: Error {
  case offline                  // no route to host / NSURLErrorNotConnectedToInternet
  case http(status: Int)        // 4xx/5xx from InnerTube
  case loginRequired(String?)   // playabilityStatus == LOGIN_REQUIRED → refresh session
  case unplayable(String?)      // UNPLAYABLE / LOGIN_REQUIRED for the video itself
  case needsDecipher            // response requires JS we cannot run → phone only
  case noUsableFormat
  case decoding(Error)
}
```

**`YTSession.swift`**

- `visitorData` per POST auf `/youtubei/v1/visitor_id` (§1.4), Ergebnis in
  `UserDefaults` mit Ausstellungszeitpunkt;
- Wiederverwendung bis 12 h; bei `loginRequired` sofort verwerfen und einmal neu
  holen (dasselbe Selbstheilungs-Muster wie
  `PlaybackResolver.ts:69 resetRejectedPlaybackSession`);
- ein einziger laufender Abruf (`Task`-Deduplizierung), damit paralleler Bedarf
  nicht drei Sessions erzeugt.

**Akzeptanz:** Ein Aufruf im Simulator liefert ein 40+ Zeichen langes
`visitorData`, ein zweiter Aufruf liefert dasselbe aus dem Speicher; im
`WatchLog` steht je eine Zeile.

---

### Phase 2 — `/player` abrufen und auswerten · ~1 Tag

**Ziel:** `YTPlayerService.streamingData(for: videoID)` liefert ein geprüftes
Ergebnis oder einen klaren Fehler.

**`YTPlayerResponse.swift`** — nur das, was gebraucht wird. `JSONDecoder`
ignoriert alles Übrige, die 160 KB kosten damit kaum Speicher:

```swift
struct YTPlayerResponse: Decodable {
  struct PlayabilityStatus: Decodable { let status: String?; let reason: String? }
  struct VideoDetails: Decodable {
    let videoId: String?; let title: String?; let author: String?
    let lengthSeconds: String?      // InnerTube sends this as a string
    let thumbnail: Thumbnails?
  }
  struct Format: Decodable {
    let itag: Int
    let url: String?
    let signatureCipher: String?    // presence ⇒ not usable on watchOS
    let mimeType: String
    let bitrate: Int?
    let contentLength: String?
    let approxDurationMs: String?
    let audioQuality: String?
  }
  struct StreamingData: Decodable {
    let expiresInSeconds: String?
    let formats: [Format]?
    let adaptiveFormats: [Format]?
    let hlsManifestUrl: String?
  }
  let playabilityStatus: PlayabilityStatus?
  let videoDetails: VideoDetails?
  let streamingData: StreamingData?
}
```

**`YTFormatSelection.swift`** — die Regeln, in dieser Reihenfolge:

1. **Tauglichkeit.** Ein Format mit `signatureCipher` oder mit `n` in der
   Query ist für die Uhr wertlos → `YTError.needsDecipher`. Diese Prüfung ist
   die Sicherung gegen §1.1 und darf nie entfallen.
2. **Nur MPEG-4/AAC.** itag 140 (≈130 kbit/s) vorrangig, itag 139 (≈50 kbit/s)
   als Sparvariante. **WebM/Opus (249/250/251) wird verworfen** — AVPlayer auf
   watchOS spielt es nicht.
3. **Sparvariante wann?** itag 139 bei `PlayerPreferences`-Einstellung
   „Datensparen" und bei Downloads mit knappem Speicher; sonst 140.
4. **Ablaufzeitpunkt** aus `expiresInSeconds` (gemessen 21540 s), nicht
   schätzen: `DBUtils.swift:268` verwirft danach.
5. **Dauer** aus `approxDurationMs`, ersatzweise `videoDetails.lengthSeconds`
   — `durationMillis` ist in `PlaylistManager` und `DownloadManager` Pflichtfeld.

Ergebnis:

```swift
struct YTStreamingResult {
  let videoID: String
  let title: String?
  let artist: String?
  let coverURL: String?
  let durationMillis: Int
  /// Progressive m4a URL — used for both playback and download.
  let audioURL: String
  /// YouTube's own HLS master, when the client provided one. Reserve for
  /// playback only; it is not downloadable as a single file.
  let hlsManifestURL: String?
  let validUntil: Date
  let client: String
}
```

**`YTPlayerService.swift`** — Kette `VISIONOS → ANDROID_VR`, wie
`resolvePlaybackInfo` auf dem Telefon, nur kleiner:

- erfolgreichen Client in `UserDefaults` merken und beim nächsten Mal zuerst
  probieren (`rememberSuccessfulClient` als Vorbild,
  `PlaybackResolver.ts:39`);
- bei `LOGIN_REQUIRED`: `visitorData` verwerfen, **einmal** wiederholen;
- `IOS` steht **nicht** in der Kette. Es taugt nur, wenn ausschließlich
  Metadaten gebraucht werden (§1.3) — das ist heute nirgends der Fall, deshalb
  bleibt es vorerst ungenutzt und nur dokumentiert.

**Akzeptanz:** `YTPlayerService` löst `kJQP7kiw5Fk` und `bUHZ2k9DYHY` im
Simulator auf; das Ergebnis trägt eine `audioURL`, die mit
`Range: bytes=0-1023` HTTP 206 liefert; `validUntil` liegt ~6 h in der Zukunft.

---

### Phase 3 — Die Fassade: lokal oder Telefon · ~1 Tag

**Ziel:** `requestVideo(id:)` bedeutet ab jetzt „besorg mir die Daten", nicht
„schick eine Nachricht ans Telefon".

**`YTVideoResolver.swift`**

```swift
@Observable
final class YTVideoResolver {
  static let shared = YTVideoResolver()

  enum Source { case local, phone }

  /// Entry point for every caller. Returns immediately; results land in
  /// SwiftData through `addDownloadData`, exactly as the phone response does.
  func resolve(videoID: String, reason: String)
}
```

Policy (bewusst einfach gehalten, drei Zustände):

| Lage | Verhalten |
|---|---|
| iPhone erreichbar **und** Einstellung „automatisch" | Telefon fragen. Kommt binnen **8 s** keine Antwort, lokal auflösen. |
| iPhone nicht erreichbar | sofort lokal. |
| Einstellung „immer selbst" | sofort lokal; das Telefon wird nur noch für Bibliothek/Home gefragt. |
| lokal fehlgeschlagen, iPhone erreichbar | über `send(…, as: .guaranteed)` nachfordern (der heutige Weg). |
| beides fehlgeschlagen | Fehler am Video vermerken, `WatchLog`-Eintrag, kein stiller Abbruch. |

Warum das Telefon vorn bleibt, wenn es da ist: es kennt das angemeldete Konto,
liefert Musik-Metadaten aus `youtube.music.getInfo` (`WatchYoutubeAPI.ts:180`)
und kostet die Uhr weder Funk noch Akku. Der lokale Weg ist die Versicherung —
und greift auch dann, wenn das iPhone zwar in Reichweite, die RN-App aber nicht
aktiv ist: `WCSession.isReachable` ist dann `false`, während die Uhr über den
Companion-Proxy trotzdem online ist. Das ist der häufigste reale Fehlerfall.

Weiter in dieser Phase:

- **Entprellung und Registry.** Eine laufende Auflösung pro `videoID`;
  Wiederholungen derselben ID werden angehängt statt neu gestartet. Damit
  entschärft sich zugleich der Schwall aus `PlaylistManager.swift:62` und
  `checkPlaylist` (`DBUtils.swift:285`).
- **Nebenläufigkeit** auf 2 begrenzen; 250 ms Mindestabstand zwischen
  `/player`-Abrufen.
- **Schreibweg wiederverwenden:** das lokale Ergebnis geht durch dasselbe
  `addDownloadData(…)` wie die Telefonantwort (`DBUtils.swift:69`) — ein
  Schreibpfad, ein Datenmodell, keine zweite Wahrheit.

`YoutubeAPI.swift` wird dabei klein gehalten: `requestVideo(id:)` ruft nur noch
`YTVideoResolver.shared.resolve(videoID:reason:)`; `requestPlaylist`,
`requestHome`, `requestLibraryPlaylists` bleiben unverändert beim Telefon.

**Akzeptanz:** Bei beendeter iPhone-App spielt ein Titel aus der Bibliothek an,
ohne dass das iPhone berührt wird. Im `WatchLog` steht `local` als Quelle.

---

### Phase 4 — Wiedergabe: ablaufende URLs selbst erneuern · ~0,5 Tag

**Ziel:** Eine abgelaufene oder abgewiesene URL beendet die Wiedergabe nicht
mehr.

- `MusicPlayerManager` (`player.event.fail`, heute nur ein Log,
  `WATCH_UX_PLAN.md` §0.3): bei einem Fehler auf einem Remote-Track den Titel
  **einmal** neu auflösen und die Queue-Position ersetzen, statt zu stoppen.
- `PlaylistManager.getPlayerItem` (`PlaylistManager.swift:117`): läuft
  `validUntil` innerhalb der nächsten 10 Minuten ab, vorsorglich neu auflösen —
  ein Titel, der mitten im Abspielen ungültig wird, ist der unangenehmste Fall.
- `checkVideosForExpiration` (`DBUtils.swift:265`) läuft weiter, geht aber jetzt
  durch die Registry und erzeugt keinen Schwall mehr.

**Akzeptanz:** Ein Video mit künstlich auf „abgelaufen" gesetztem `validUntil`
spielt nach Antippen trotzdem; im Log steht genau eine Neuauflösung.

---

### Phase 5 — Downloads ohne Telefon · ~0,5 Tag

**Ziel:** Die Uhr lädt selbst herunter — und lädt vollständig.

1. **`Range`-Header (§1.5).** `DownloadManager.swift:37` baut heute einen
   blanken `URLRequest`. Ohne `Range: bytes=0-` endet der Abruf nach ~720 KB mit
   HTTP 200 und einer **abgeschnittenen Datei**. Das ist unabhängig vom Rest
   dieses Plans ein Fehler und wird hier mitbehoben.
2. **Vollständigkeit prüfen.** `contentLength` aus dem Format mitführen und nach
   dem Download gegen die Dateigröße prüfen; Abweichung ⇒ Download verwerfen und
   als fehlgeschlagen markieren, nicht als „geladen" eintragen.
3. **Fehlende URL nachfordern.** `DownloadManager.swift:32` bricht heute mit
   einem Log ab, wenn `downloadURL` fehlt — künftig geht die Anforderung an
   `YTVideoResolver` und der Download wartet, statt zu verschwinden.
4. **Format.** Downloads nehmen itag 140 (oder 139 bei „Datensparen"). Die
   Dateiendung bleibt `mp4`/`m4a` — der heutige harte `fileExtension: "mp4"`
   (`DownloadManager.swift:51`) passt zu beiden m4a-itags, bekommt aber einen
   Kommentar, warum.

**Akzeptanz:** Ein 4-minütiger Titel lädt bei ausgeschalteter iPhone-App
vollständig herunter; Dateigröße = `contentLength`; danach spielt er im
Flugmodus.

---

### Phase 6 — Sichtbar und schaltbar machen · ~0,5 Tag

- **`AdvancedScreen`**: eine Einstellung „Titel selbst laden" mit den Werten
  *automatisch* (Standard) / *immer selbst* / *nie* (= heutiges Verhalten, der
  Notausgang). Persistiert über `PlayerPreferences` (`PlayerPreferences.swift`).
- **`DiagnosticsScreen`**: Zeile „YouTube-API" mit `visitorData`-Alter, zuletzt
  erfolgreichem Client und letztem Fehler; darunter der Selbsttest aus
  `YTSelfTest.swift` (Session holen → `/player` für eine feste Test-ID →
  `Range`-Abruf auf die Audio-URL → Ergebnis als Liste).
- **Log-Kategorien** konsequent: `YT-Session`, `YT-Player`, `YT-Resolve`.
- **UI-Texte** nach `AGENTS.md` gruppiert ablegen, damit sie in die spätere
  en/de-Lokalisierung wandern können; Diagnosetexte bleiben englisch.

**Akzeptanz:** Der Selbsttest auf einem echten Gerät ohne gekoppeltes iPhone
läuft grün durch und zeigt den verwendeten Client.

---

### Phase 7 — *Optional:* Playlists und Queue ohne Telefon · ~1,5 Tage

Nur sinnvoll, wenn die Uhr auch ohne iPhone **neue** Inhalte finden soll. Die
Machbarkeit ist geprüft (§1.6): `POST music.youtube.com/youtubei/v1/next` mit
`WEB_REMIX` und `visitorData` liefert 50 Queue-Einträge; die Pfade sind stabil
genug für gezieltes Decodieren:

```
contents.singleColumnMusicWatchNextResultsRenderer.tabbedRenderer
  .watchNextTabbedResultsRenderer.tabs[0].tabRenderer.content
  .musicQueueRenderer.content.playlistPanelRenderer.contents[]
    .playlistPanelVideoRenderer → videoId, title.runs[0].text, thumbnail
```

Umfang: ein `YTMusicQueue.swift` mit eng gefassten `Decodable`-Structs, ein
„Radio starten"-Eintrag im Player-Menü, Speicherung als `temp`-Playlist. Die
Antwort ist ~500 KB — das Decodieren gehört auf einen Hintergrund-Task, nicht
auf den Main-Actor.

**Bewusst nicht enthalten:** Home-Feed und Bibliothek. Beides hängt am
angemeldeten Konto und bleibt Sache des Telefons.

---

### Phase 8 — Härtung · ~0,5 Tag

- **Zurückweichen:** bei HTTP 429/403 auf `/player` exponentiell (2 s, 8 s,
  30 s), höchstens drei Versuche je Titel und Stunde.
- **Ergebnis-Cache:** eine aufgelöste `videoID` wird bis `validUntil` minus
  10 Minuten nicht erneut abgefragt — die Daten stehen ohnehin in SwiftData.
- **Hintergrund:** Auflösungen nur starten, wenn die App aktiv ist oder ein
  `WKApplicationRefreshBackgroundTask` läuft; Downloads laufen weiter über die
  Hintergrund-`URLSession` von `SDDownloadManager`.
- **Messskript:** `tools/watch-client-matrix.mjs` — dieselben Abrufe wie in §1,
  aber als Skript, damit die Tabelle bei Verdacht in einer Minute neu gemessen
  werden kann. Vorbild: `YouTube.js/dev-scripts/playback-matrix.mjs`.

---

## 5. Fehlerverhalten

| Fall | Erkennung | Reaktion |
|---|---|---|
| Kein Netz auf der Uhr | `NSURLErrorNotConnectedToInternet` | Telefonweg versuchen; sonst Video als „nicht verfügbar" markieren |
| `LOGIN_REQUIRED` | `playabilityStatus.status` | `visitorData` verwerfen, einmal wiederholen, dann Telefon |
| `UNPLAYABLE` (Geo, privat, Altersfreigabe) | `playabilityStatus` | Telefon fragen (angemeldet, kann mehr); Grund am Video vermerken |
| Antwort mit `signatureCipher` / `n` | `YTFormatSelection` | `needsDecipher` → **nie** lokal weiterverarbeiten, Telefon fragen, Log-Warnung (Signal, dass §1.2 nicht mehr gilt) |
| Nur WebM/Opus-Audio | Formatwahl | nächster Client, dann Telefon |
| Download unvollständig | Größe ≠ `contentLength` | Datei löschen, Video bleibt „nicht geladen", ein Wiederholungsversuch |
| 429 | HTTP-Status | Zurückweichen (Phase 8), Log-Warnung |

Der vierte Fall ist der wichtige: Er ist die eingebaute Frühwarnung. Sollte
YouTube `VISIONOS` eines Tages ebenfalls mit Cipher beliefern, fällt die Uhr
geordnet auf den Telefonweg zurück — statt still kaputtzugehen.

---

## 6. Tests

Ein Unit-Test-Target existiert für die Uhr nicht, und es dafür einzuführen wäre
im Expo-Prebuild-Aufbau ein eigenes Vorhaben. Deshalb dreistufig:

1. **Reine Logik im Test-Target des Repos, wo möglich:** Formatwahl, Ablauf- und
   Dauerberechnung sowie die Cipher-Erkennung arbeiten auf einer gespeicherten
   `/player`-Antwort. Die Fixture (`targets/watch/fixtures/player-visionos.json`,
   von `curl` erzeugt und um Tokens gekürzt) wird von beiden Seiten genutzt —
   ein Node-Test in `test/` prüft dieselben Regeln, die Swift umsetzt.
2. **`YTSelfTest.swift`** als Gerätetest (Phase 6): der einzige Test, der die
   echte Kette Session → `/player` → `Range`-Abruf durchläuft.
3. **Manuelles Protokoll**, weil nur das den Zweck belegt:
   - iPhone-App beendet → Titel aus der Bibliothek spielt an;
   - iPhone im Flugmodus, Uhr im WLAN → Titel spielt an;
   - Uhr im Flugmodus → verständliche Meldung, kein Hängen;
   - Download bei beendeter iPhone-App → Datei vollständig, spielt offline;
   - Einstellung „nie" → Verhalten exakt wie heute.

---

## 7. Risiken

| Risiko | Einschätzung | Umgang |
|---|---|---|
| YouTube liefert `VISIONOS` künftig mit Cipher oder `n` | mittel — genau das ist `TV_SIMPLY` bei Musikvideos schon passiert | Erkennung ist eingebaut (§5), Rückfall aufs Telefon ist der Normalpfad; Messskript zeigt es in einer Minute |
| Client-Konstanten veralten | hoch (Versionen, User-Agents) | eine Datei, eine Quelle (`Constants.ts`), Kommentar mit Herkunft; beim nächsten `youtubei.js`-Update mitziehen |
| Bot-Erkennung auf Uhr-IP | gering, solange sparsam | Nebenläufigkeit 2, Entprellung, Cache, Zurückweichen |
| `visitorData` wird ungültig | mittel | 12-h-TTL plus Selbstheilung bei `LOGIN_REQUIRED` |
| Akku-/Datenverbrauch der Uhr | gering bei Audio (itag 139 ≈ 1,7 MB / 4,5 min) | Telefon bleibt bevorzugt, wenn erreichbar; „Datensparen" wählt itag 139 |
| Mehr Code auf einer ohnehin fehleranfälligen Oberfläche | real | Fassade statt Streuung (Leitidee 3); `WATCH_UX_PLAN.md` Phase 1–3 sind die sinnvolle Grundlage, dieser Plan setzt darauf auf |

---

## 8. Offene Entscheidungen

1. **Reihenfolge gegenüber `WATCH_UX_PLAN.md`.** Dieser Plan setzt eine
   Anfrage-Registry voraus (dort Phase 3). Entweder zuerst jene Phase, oder die
   Registry entsteht hier in Phase 3 und wird dort nur noch genutzt. Empfehlung:
   hier bauen, dort verwenden — der Nutzen ist hier unmittelbar sichtbar.
2. **Standardeinstellung.** Vorschlag „automatisch" (Telefon zuerst, 8 s
   Geduld). Alternative: „immer selbst", sobald der lokale Weg sich bewährt hat
   — dann wird das Telefon nur noch für Kontosachen gebraucht.
3. **`visitorData` teilen.** Die Uhr könnte das `visitorData` des Telefons über
   den `applicationContext` übernehmen (`src/utils/InnertubeSession.ts`). Spart
   einen Abruf und hält die Identität konsistent. Nur sinnvoll, wenn die Uhr in
   derselben Region funkt; deshalb vorerst zurückgestellt.
4. **Phase 7 überhaupt?** Nur, wenn die Uhr ohne iPhone auch stöbern soll. Sonst
   entfällt sie ersatzlos.
