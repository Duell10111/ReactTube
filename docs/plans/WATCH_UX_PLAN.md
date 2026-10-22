# Plan: Nutzererlebnis der Watch-App stabilisieren

> Stand: 2026-09-20 · Branch: `video-playback-fixes`
> Scope: `targets/watch/**` (watchOS, SwiftUI/SwiftData) + die Gegenseite
> `src/hooks/watchSync/**` (WatchConnectivity-Bridge auf dem Telefon).
> Nicht im Scope: die Wiedergabe auf Apple TV — die läuft in `PLAYBACK_REWORK_PLAN.md`.

---

## 0. Befund: warum sich die Uhr heute fehleranfällig anfühlt

Die Uhr ist kein eigenständiger Client — sie ist ein Frontend vor einem
Nachrichtenkanal zum Telefon. Genau dort liegt das Problem: **jede Anfrage ist
„abgeschickt und vergessen“, jeder Fehler landet in `print()`, und die
Oberfläche zeigt in allen Fällen denselben Zustand — nämlich gar keinen.**

Für den Nutzer sieht das so aus: Titel antippen → nichts passiert. Download
wischen → nichts passiert. Und beim nächsten Öffnen ist der Titel trotzdem da,
oder eben nicht. Das ist kein Bündel unabhängiger Bugs, sondern **ein fehlendes
Konzept an vier Stellen**.

### 0.1 Transport: der Kanal darf fehlschlagen und tut es unsichtbar

| Fundstelle | Symptom |
|---|---|
| `targets/watch/YoutubeAPI.swift:12` | `session.sendMessage(…, replyHandler: nil)` — **ohne `errorHandler`**. `sendMessage` erfordert, dass die Gegenstelle *gerade erreichbar* ist. Ist die Telefon-App nicht im Vordergrund, verschwindet die Anfrage spurlos. Das ist die häufigste Ursache für „ich tippe und es passiert nichts“. |
| `targets/watch/SessionSync.swift:41` | `activationDidCompleteWith` wird nur geloggt. Weder `isReachable` noch `activationState` noch `isCompanionAppInstalled` erreichen jemals die UI. |
| `src/hooks/watchSync/useWatchSync.ios.tsx:208` | Die Antwortrichtung nutzt denselben Mechanismus: `sendMessage` ohne Queue. Antwort auf eine erfolgreiche Anfrage kann genauso verloren gehen wie die Anfrage. |
| `WatchYoutubeAPI.ts` → `homeResponse` | Eine Home-Antwort trägt alle Sections samt `videoIds` in **einer** Nachricht. `sendMessage` ist auf ~65 KB begrenzt; darüber schlägt der Aufruf fehl — wieder unsichtbar. |

### 0.2 Anfragen haben keinen Zustand

Es gibt kein „in Arbeit“, kein „fehlgeschlagen“, keine Entprellung.

- `PlaylistManager.swift:64` feuert in einer inneren `forEach` ein
  `requestVideo` für **jedes** noch nicht auflösbare Video der Playlist — bei
  jedem Queue-Aufbau erneut. Eine 40-Titel-Playlist erzeugt so einen Schwall
  von 40 Nachrichten in denselben Kanal, der gerade nur eine verträgt.
- `PlaylistListView.swift` ruft `checkPlaylist(playlist)` in `.onAppear` auf —
  jedes Zurücknavigieren wiederholt den Schwall.
- Kommt eine Antwort nie, merkt das niemand. Es gibt keinen Timeout und keinen
  Wiederholungsversuch.

### 0.3 Der Player ist eine Momentaufnahme

- `PlaylistManager.swift:67` — `getFirstBatchOfAvailable()` bricht beim
  **ersten** nicht verfügbaren Titel mit `break` ab. Ist Titel 1 nicht
  auflösbar, ist die Queue leer.
- `MusicPlayerManager.swift:105` / `:201` — eine leere Queue führt zu
  `print("Skipping setup…")` und einem stillen `return`. Der Nutzer drückt
  Play, und es passiert sichtbar nichts.
- `PlaylistManager.swift:99` — `checkForNewVideos()` ist ein leeres `TODO`.
  Die nachträglich eintreffenden Streaming-Daten landen in SwiftData, aber
  **niemand füllt die laufende Queue damit auf**. Genau der Fall, der sich
  selbst heilen müsste, heilt nie.
- `MusicPlayerManager.swift:132` — `player.event.fail` loggt nur. Eine
  abgelaufene URL mitten in der Playlist stoppt die Wiedergabe, statt den
  Titel neu anzufordern oder zu überspringen.
- `isStalled` wird an drei Stellen auf `false` gesetzt und **nirgends auf
  `true`** — die Puffer-Animation in `MusikPlayer.swift:115` ist toter Code.
- `duration` / `currentTime` (`MusicPlayerManager.swift:27-28`) werden nie
  fortgeschrieben; ein Fortschrittsbalken ist deshalb gar nicht möglich.

### 0.4 Die Download-Pipeline hat drei handfeste Fehler

| Fundstelle | Fehler |
|---|---|
| `DownloadManager.swift:102` | Die Schleife über `pendingDownloads` **entfernt nie ein Element**. Jeder `checkDownloads()`-Durchlauf startet dieselben Downloads erneut. |
| `DownloadManager.swift:88` | `checkDownloads()` wird ausschließlich im Completion-Handler des **Cover-Downloads** erneut angestoßen. Ein Video ohne `coverURL` — oder ein fehlgeschlagener Bild-Download — lässt die gesamte Warteschlange für immer stehen. |
| `DownloadManager.swift:32` | Fehlt `downloadURL` oder `validUntil`, bleibt es bei `print("Video metadata not available…")`. Kein Nachfordern der Metadaten, keine Rückmeldung. Laut `WatchYoutubeAPI.ts` ist ein fehlendes `downloadURL` bei SABR-only-Formaten der **Normalfall**, nicht die Ausnahme. |
| `DownloadManager.swift:39` u. a. | `progressDownloads` und `activeDownloads` werden aus URLSession-Callback-Threads mutiert, obwohl `@Observable` SwiftUI-Updates auf dem Main-Actor erwartet. |
| `watchApp.swift` | `.backgroundTask(.urlSession)` enthält nur ein `TODO`. Ein Download, der abschließt, während die App suspendiert ist, aktualisiert die Datenbank nicht — die Datei liegt da, der Eintrag sagt „nicht geladen“. |
| `DBUtils.swift` → `addPlaylistData` | Ruft nie `modelContext.save()` (anders als `addDownloadData`). Playlist-Änderungen hängen am Autosave-Zufall. |

Der Download-Zustand lebt außerdem **nur im Speicher** (`activeDownloads`,
`pendingDownloads`). Nach einem App-Neustart ist eine halb abgearbeitete
Playlist-Download-Anforderung ersatzlos verschwunden.

### 0.5 Die Oberfläche zeigt keine Zustände

Kein Ladeindikator, kein leerer Zustand mit Erklärung, keine Fehlermeldung —
und dafür Debug-Schaltflächen im Produktionspfad (`HomeSectionList` → „Print“,
`HomeSection` → „Add“, `HomeList` → „Get Home“). Ein Titel ist blau, wenn er
geladen ist, und sonst nicht — mehr Information bekommt der Nutzer nie.

---

## 1. Leitideen

| # | Entscheidung | Konsequenz |
|---|---|---|
| 1 | **Offline zuerst.** Die Uhr ist primär ein Offline-Player; Streaming vom Telefon ist der Sonderfall, nicht der Normalfall. | Downloads werden erstklassig behandelt (persistente Queue, Wiederaufnahme, sichtbarer Fortschritt). Was heruntergeladen ist, spielt **immer**, auch ohne Telefon. |
| 2 | **Kein stiller Fehler.** Jeder `print` im Fehlerpfad wird zu einem Zustand am Datenmodell oder zu einer Meldung. | Neues `WatchStatus`-Objekt + Fehlerfelder an `Video`. |
| 3 | **Jede Anfrage hat eine Identität und einen Zustand.** | Zentrale `RequestRegistry` mit Entprellung, Timeout, begrenztem Retry. |
| 4 | **Der Transport wird zweigleisig.** Interaktives (Play/Pause aufs Telefon) über `sendMessage`, alles Datengetriebene über `transferUserInfo`. | `transferUserInfo` wird vom System **zugestellt, sobald möglich** — auch wenn die Telefon-App gerade nicht läuft. Genau das fehlt heute. |
| 5 | **Der Player ist eine nachfüllende Queue, kein Snapshot.** | Titel dürfen später eintreffen, ausfallen und ersetzt werden, ohne die Wiedergabe zu beenden. |
| 6 | **Lautstärke vor Navigation im Titel.** Die Digital Crown regelt im normalen Playerzustand immer die Systemlautstärke. | Spulen ist eine bewusst aktivierte Sekundärfunktion und darf die Crown nie stillschweigend übernehmen. Lautstärkeänderungen geben sofort sichtbares Feedback. |

**Leitgedanke der Reihenfolge:** Phase 1–3 bauen das Fundament (Transport,
Anfragezustand, Datenmodell). Phase 4–5 reparieren Wiedergabe und Downloads
darauf. Phase 6 macht das Ganze sichtbar. Erst Phase 7 ist Komfort.

---

## 2. Phasen

### Phase 1 — Transport robust machen · ~1,5 Tage

**Problem:** 0.1 — Anfragen verschwinden, wenn die Telefon-App nicht gerade
vorn ist.

**Maßnahmen**

1. `YoutubeAPI.swift`: einen einzigen Ausgang einführen statt fünf direkter
   `sendMessage`-Aufrufe:
   ```swift
   enum Delivery { case interactive   // sendMessage, nur wenn isReachable
                   case guaranteed }  // transferUserInfo, systemgepuffert

   func send(_ payload: [String: Any], as delivery: Delivery)
   ```
   - `requestVideo` / `requestPlaylist` / `requestHome` /
     `requestLibraryPlaylists` / `sendPlaylistStateToPhone` → `.guaranteed`.
   - `nextTitleOnPhone` / `previousTitleOnPhone` / `pausePlayOnPhone` →
     `.interactive` mit `errorHandler`, der bei Misserfolg den Fehler in den
     Status schreibt (Fernsteuerung ergibt ohne erreichbares Telefon ohnehin
     keinen Sinn).
2. Bei `.interactive` **immer** einen `errorHandler` übergeben. Kein
   `sendMessage`-Aufruf im Projekt ohne Fehlerbehandlung.
3. `SessionSync.swift`: `isReachable`, `activationState` und
   `isCompanionAppInstalled` als beobachtbare Eigenschaften veröffentlichen
   (`@Observable class WatchStatus`), inkl. `sessionReachabilityDidChange`.
4. Gegenseite `src/hooks/watchSync/useWatchSync.ios.tsx`: Antworten ebenfalls
   über einen garantierten Kanal schicken. `expo-watch-connectivity` muss dafür
   `transferUserInfo` anbieten — falls nicht vorhanden, ist das ein kleiner
   Patch am Modul (`patches/` existiert bereits im Projekt).
5. `homeResponse` aufteilen: eine Nachricht **pro Section** statt einer großen.
   Das umgeht die 65-KB-Grenze und lässt die Home-Ansicht schrittweise füllen.
6. `sendMessage({test: "test"})` beim Start (`useWatchSync.ios.tsx:174`)
   entfernen oder durch einen echten Handshake ersetzen.

**Abnahme:** Telefon-App vollständig beendet → auf der Uhr eine Playlist
öffnen → Telefon-App starten → die angeforderten Titeldaten treffen ohne
weiteres Zutun ein.

---

### Phase 2 — Anfragen bekommen einen Zustand · ~1,5 Tage

**Problem:** 0.2 — Nachrichtenschwälle, keine Timeouts, keine Fehler.

**Maßnahmen**

1. Neue Datei `targets/watch/RequestRegistry.swift`:
   ```swift
   @Observable final class RequestRegistry {
     enum State { case pending(since: Date), failed(Error), done }
     func request(video id: String, priority: Priority)   // entprellt
     func markResponse(for id: String)
     func sweepTimeouts()   // > 30 s → failed, max. 2 Wiederholungen
   }
   ```
   - **Entprellung:** eine laufende Anfrage für dieselbe ID wird nicht
     wiederholt. Das allein beseitigt den Schwall aus
     `PlaylistManager.swift:64` und den `onAppear`-Effekt in
     `PlaylistListView`.
   - **Drosselung:** höchstens N (Vorschlag: 5) offene Anfragen gleichzeitig,
     Rest in einer FIFO-Warteschlange.
   - **Priorität:** der gerade abgespielte und die nächsten drei Titel vor dem
     Rest der Playlist.
2. `YoutubeAPI.swift` → `saveVideoResponse` / `savePlaylistResponse` melden
   der Registry den Eingang.
3. `PlaylistManager.getFirstBatchOfAvailable()` fordert nur noch das an, was es
   wirklich braucht — nicht die ganze Playlist.
4. Die Registry ist die einzige Stelle, die `requestVideo` aufruft. `checkPlaylist`
   und `checkVideosForExpiration` (`DBUtils.swift`) gehen über sie.

**Abnahme:** 40-Titel-Playlist öffnen, dreimal hin und zurück navigieren →
im Log höchstens ein `requestVideo` pro fehlender ID, nie mehr als 5
gleichzeitig offen.

---

### Phase 3 — Datenmodell um Zustände erweitern · ~1 Tag

**Problem:** `Video` kennt nur `downloaded` und `validUntil`. Alles andere —
lädt gerade, fehlgeschlagen, wartet — existiert nur flüchtig im Speicher
(0.4) und ist nach einem Neustart weg.

**Maßnahmen** (`DBData.swift`, plus SwiftData-Migration)

```swift
enum VideoAvailability: Codable {
  case unknown, requested, streamable, downloading, downloaded, failed
}

@Model final class Video {
  // … bestehend …
  var availability: VideoAvailability = .unknown
  var lastError: String?
  var lastRequestedAt: Date?
  var downloadAttempts: Int = 0
  var downloadWanted: Bool = false   // Nutzer will die Datei lokal
}
```

- `downloadWanted` ersetzt das flüchtige `pendingDownloads: Set<Video>` und
  überlebt den App-Neustart. Die Download-Warteschlange ist damit ein
  **SwiftData-Query**, kein Speicherzustand.
- `addPlaylistData` in `DBUtils.swift` bekommt das fehlende
  `modelContext.save()`.
- Aufräumschritt für `temp == true`-Einträge, die zu keiner Playlist mehr
  gehören (läuft beim Start, nicht im Hot Path).

**Abnahme:** Download starten, App zwangsbeenden, neu öffnen → der Titel zeigt
weiter „wartet“ bzw. „lädt“ und wird tatsächlich weiter geladen.

---

### Phase 4 — Player: nachfüllende Queue statt Momentaufnahme · ~2 Tage

**Problem:** 0.3 — ein nicht auflösbarer Titel an Position 1 blockiert alles;
später eintreffende Daten erreichen den Player nie.

**Maßnahmen**

1. `PlaylistManager.swift:67`: das `break` entfällt. Nicht auflösbare Titel
   werden **übersprungen und vorgemerkt**, nicht als Abbruchbedingung benutzt.
   Die Queue enthält, was spielbar ist, und wird später ergänzt.
2. `checkForNewVideos()` (`PlaylistManager.swift:99`) implementieren und an
   die SwiftData-Änderungsbenachrichtigung hängen: trifft ein zuvor fehlender
   Titel ein, wird er über `player.add(item:at:)` an seiner Position in die
   laufende Queue eingefügt.
3. `MusicPlayerManager.swift:132` — `event.fail` behandeln statt loggen:
   - URL abgelaufen → Titel über die Registry neu anfordern, Position merken,
     nach Eintreffen ersetzen;
   - dauerhaft defekt → `availability = .failed`, `lastError` setzen, zum
     nächsten Titel springen (max. 3 Sprünge in Folge, danach anhalten und
     den Zustand anzeigen, statt still durch die Playlist zu rasen).
4. `isStalled` tatsächlich setzen: aus `event.stateChange` (`.buffering` /
   `.loading`) — dann funktioniert die Animation in `MusikPlayer.swift:115`.
5. `duration` / `currentTime` aus `player.event.secondElapse` fortschreiben
   (Voraussetzung für den Fortschrittsbalken in Phase 6).
6. Leere Queue ist ein **sichtbarer Zustand**, kein stilles `return`
   (`MusicPlayerManager.swift:105`, `:201`): „Titel werden vom iPhone geladen…“
   bzw. „iPhone nicht erreichbar“.
7. **Vorab-Auflösung:** beim Start einer Playlist die nächsten 3 Titel
   auflösen, nicht erst beim Übergang. Beseitigt die Pause zwischen den Titeln.

**Abnahme:** Playlist starten, bei der Titel 1 und 3 keine URL haben →
Wiedergabe startet mit Titel 2, die Titel 1 und 3 werden nachgeladen und
erscheinen an der richtigen Stelle in der Queue, ohne die Wiedergabe zu
unterbrechen.

---

### Phase 5 — Download-Pipeline reparieren · ~2 Tage

**Problem:** 0.4 — Doppeldownloads, blockierte Warteschlange, verlorene
Hintergrund-Abschlüsse, keine Fehlermeldung.

**Maßnahmen** (`DownloadManager.swift`)

1. **`pendingDownloads` durch die Datenbank ersetzen**
   (`downloadWanted == true && !downloaded`). Beim Start eines Downloads wird
   `availability = .downloading` gesetzt, bei Abschluss `.downloaded` — damit
   ist das Doppelstart-Problem aus `:102` strukturell erledigt.
2. **Die Kettenreaktion entkoppeln.** `checkDownloads()` läuft nach
   *jedem* abgeschlossenen Vorgang (Audio **und** Bild, Erfolg **und**
   Fehlschlag), nicht nur nach dem Cover-Download (`:88`). Das Cover wird zum
   optionalen Nebenschritt, der die Warteschlange nie blockiert.
3. **Fehlende Metadaten nachfordern statt aufgeben** (`:32`): kein
   `downloadURL` oder abgelaufenes `validUntil` → `RequestRegistry.request()`,
   Download bleibt in der Warteschlange und startet nach Eintreffen.
   Kommt dauerhaft kein `downloadURL` (SABR-only), wird das als konkreter
   Fehler am Titel hinterlegt — „nicht herunterladbar“ ist eine Antwort,
   Schweigen nicht.
4. **Retry mit Backoff:** `downloadAttempts` hochzählen, maximal 3 Versuche,
   danach `.failed` mit Grund.
5. **Thread-Korrektheit:** `activeDownloads` und `progressDownloads` nur auf
   dem Main-Actor mutieren (`@MainActor` auf der Klasse, Callbacks über
   `MainActor.run`).
6. **Hintergrundabschluss verdrahten:** `watchApp.swift` →
   `.backgroundTask(.urlSession)` an `SDDownloadManager` anschließen, damit ein
   Download, der bei suspendierter App fertig wird, auch in der Datenbank
   ankommt. Ohne das bleibt die Offline-Zusage aus Leitidee 1 unhaltbar.
7. **Dateiendungen nicht raten:** statt hartkodiertem `"mp4"` / `"png"`
   (`:47`, `:80`) den MIME-Typ der Antwort auswerten.
8. **Speicherplatz prüfen**, bevor eine Playlist angefordert wird — auf der
   Uhr eine reale Fehlerquelle. Bei Knappheit vorab warnen statt reihenweise
   fehlzuschlagen.

**Abnahme:** Playlist mit 20 Titeln herunterladen, dabei Flugmodus ein- und
ausschalten, App zwischendurch beenden → am Ende sind alle 20 Titel genau
einmal geladen; nicht ladbare Titel tragen einen sichtbaren Grund.

---

### Phase 6 — Zustände sichtbar machen · ~2 Tage

**Problem:** 0.5 — die Oberfläche zeigt nur „blau oder nicht“.

**Maßnahmen**

1. **`MusicListItemView`** wird die zentrale Zustandsanzeige — ein Symbol pro
   `availability`:
   | Zustand | Anzeige |
   |---|---|
   | `.downloaded` | `arrow.down.circle`, blau (wie heute) |
   | `.downloading` | Fortschrittsring statt separatem `ProgressView` |
   | `.requested` | dezenter Spinner |
   | `.streamable` | `antenna.radiowaves.left.and.right` (braucht Telefon) |
   | `.failed` | `exclamationmark.triangle`, antippbar → Grund + „Erneut versuchen“ |
   | abgelaufen | `clock.badge.exclamationmark` (wie heute) |
2. **Statuszeile** aus `WatchStatus` (Phase 1) oben in `HomeList` /
   `LibraryView`, wenn etwas nicht stimmt: „iPhone nicht erreichbar“ /
   „Watch-App auf dem iPhone nicht gestartet“. Genau die Information, die heute
   nur im Log steht.
3. **Leere Zustände mit Erklärung und Aktion** statt leerer Listen
   („Noch keine Playlists — auf dem iPhone unter … senden“ + „Aktualisieren“).
4. **Playlist-Kopfzeile:** „14 von 20 offline“ + eine Download-Schaltfläche.
   Macht Leitidee 1 im UI greifbar.
5. **Player:** Fortschrittsbalken und Restzeit (jetzt möglich, Phase 4.5);
   Haptik bei Titelwechsel (`WKInterfaceDevice.current().play(.click)`).
6. **Lautstärke ist die primäre Crown-Interaktion:**
   - In der normalen Playeransicht steuert die Digital Crown **immer** die
     lokale Systemlautstärke über `WKInterfaceVolumeControl(origin: .local)`.
     Sie wird nicht an die Abspielposition gebunden.
   - Der vorhandene unsichtbare `NativeVolumeControl` und der selbst gebaute
     `VolumeControl` werden als eine verlässliche Komponente gekapselt:
     Native Control für die tatsächliche Systemlautstärke, eigene gut
     erkennbare Einblendung für den aktuellen Wert.
   - Bei Crown-Bewegung erscheint die Lautstärkeanzeige sofort und blendet
     nach kurzer Inaktivität wieder aus. An den Grenzen 0 % und 100 % gibt es
     eindeutiges visuelles Feedback; der beobachtete Wert aus
     `AVAudioSession.outputVolume` bleibt die Quelle der Anzeige.
   - Die Steuerung funktioniert bei laufender und pausierter Wiedergabe sowie
     für lokale und vom iPhone gesteuerte Titel gleich. Bei Telefonsteuerung
     bleibt sie ausdrücklich **lokal auf der Uhr** und wird nicht als
     Lautstärkebefehl ans Telefon gesendet.
   - VoiceOver benennt das Element als „Lautstärke, … Prozent“. Die
     unsichtbare native View darf nicht zu einem unsichtbaren, separat
     fokussierbaren Bedienelement werden.
7. **Debug-Elemente aus dem Produktionspfad entfernen:** „Print“
   (`HomeSectionList`), „Add“ (`HomeSection`), „Get Home“ (`HomeList`) →
   Home lädt automatisch beim Öffnen, wenn die Daten älter als X Stunden sind
   (`HomeScreenSection.date` gibt es bereits); manuelles Aktualisieren wandert
   nach unten in die Liste oder in den `SettingsScreen`.

**Abnahme:** Jeder in 0.1–0.4 beschriebene Fehlerfall ist auf dem Gerät ohne
Xcode-Konsole erkennbar. Zusätzlich ändert eine Crown-Drehung auf dem
Player — unabhängig von Play/Pause und Player-Typ — immer die Lautstärke und
zeigt den neuen Wert unmittelbar an.

---

### Phase 7 — Komfort · ~2 Tage (optional, nach 1–6)

> **Stand 2026-09-23: umgesetzt (1–4), 5 offen.** Punkt 1–4 sind implementiert,
> inklusive der aus Phase 4.5 nötigen Vorleistung (`currentTime`/`duration`
> werden aus `secondElapse`/`updateDuration` fortgeschrieben) — der Rest von
> Phase 4 bleibt offen. Punkt 5 (Komplikation) ist an der Build-Kette blockiert:
> `@duell10111/apple-targets` hängt jedes generierte Target an das **iOS**-App-Target
> (`withXcodeChanges.js`), eine Widget-Extension für die Uhr muss aber in die
> Watch-App eingebettet werden. Das braucht einen Patch am Plugin plus App-Group;
> der dafür nötige Zustand (`ResumeState`) wird bereits persistiert und ist in
> `PlayerPreferences` an einer Stelle gekapselt.
>
> Zusätzlich vorgezogen, weil sonst nicht auf dem Gerät prüfbar: Phase 6.7
> (Debug-Schaltflächen aus dem Produktionspfad) und ein Diagnosefenster im Sinne
> von Phase 8 — beides in *Settings → Advanced*, auch im Release-Build erreichbar.

1. **Spulen als expliziter Sekundärmodus, nicht als Crown-Standard.** Der
   Fortschrittsbalken ist zunächst nur Anzeige. Falls Spulen später ergänzt
   wird, öffnet ein Tap darauf einen klar erkennbaren Modus mit eigener
   Beschriftung („Mit Crown spulen“) und einer eindeutigen Möglichkeit zum
   Beenden. Nur solange dieser Modus sichtbar aktiv ist, darf die Crown die
   Position verändern; danach fällt sie sofort auf Lautstärke zurück. Vor der
   Umsetzung auf einem echten Gerät testen, ob der Modus den zusätzlichen
   Fokuswechsel gegenüber einfachen ±15-Sekunden-Aktionen rechtfertigt.
2. **Now-Playing / Smart Stack:** `MPNowPlayingInfoCenter` korrekt füllen
   (Titel, Interpret, Dauer, Position, Artwork), damit Kontrollzentrum und
   Smart Stack echte Daten zeigen.
3. **Cover lokal auflösen** — es wird bereits heruntergeladen
   (`DownloadManager.swift:70`), aber `Track.getArtwork` lädt bei
   Remote-URLs jedes Mal neu über `URLSession` (`Track.swift:63`). Cache
   einbauen.
4. **Shuffle/Repeat persistieren.**
5. **Komplikation** „Weiterhören“ auf dem Zifferblatt.

---

### Phase 8 — Diagnose · ~0,5 Tage

`DebugScreen.swift` von zwei Zeilen zu einem echten Diagnosefenster ausbauen:
Sitzungsstatus, offene Anfragen samt Alter, letzte 20 Fehler mit Zeitstempel,
belegter Speicher der Downloads. Das ist das Werkzeug, mit dem die nächste
Fehlermeldung in Minuten statt in einer Xcode-Sitzung beantwortet wird.

---

## 3. Reihenfolge und Abhängigkeiten

```
Phase 1 (Transport) ──┬─► Phase 2 (Registry) ──┬─► Phase 4 (Player)
                      │                        │
Phase 3 (Datenmodell)─┴────────────────────────┴─► Phase 5 (Downloads)
                                                          │
                                        Phase 6 (UI) ◄────┘
                                              │
                                        Phase 7 / 8
```

Phase 1 und 3 sind unabhängig voneinander und können parallel laufen.
Phase 6 braucht 3 (die Zustände) und profitiert von 4 und 5, lässt sich aber
schrittweise einziehen, sobald einzelne Zustände existieren.

**Gesamtaufwand Phase 1–6: ~10 Arbeitstage.** Phase 7–8 zusätzlich ~2,5.

---

## 4. Quick Wins (unter einem Tag, unabhängig vom Rest)

Diese fünf Punkte sind isolierte Fehler und keine Umbauten — sie lassen sich
sofort beheben, ohne einer Phase vorzugreifen:

| # | Änderung | Datei |
|---|---|---|
| 1 | `pendingDownloads` nach dem Start eines Downloads leeren → keine Doppeldownloads mehr | `DownloadManager.swift:102` |
| 2 | `checkDownloads()` auch im Audio-Completion-Handler aufrufen → Warteschlange läuft ohne Cover weiter | `DownloadManager.swift:66` |
| 3 | `errorHandler` an alle `sendMessage`-Aufrufe | `YoutubeAPI.swift:12,32,36,40` |
| 4 | `modelContext.save()` in `addPlaylistData` | `DBUtils.swift` |
| 5 | `break` in `getFirstBatchOfAvailable` zu `continue` → ein fehlender Titel blockiert die Playlist nicht mehr | `PlaylistManager.swift:67` |

Punkt 1, 2 und 5 dürften zusammen den größten Teil des Eindrucks
„fehleranfällig“ ausmachen.

---

## 5. Risiken

| Risiko | Einschätzung |
|---|---|
| **SwiftData-Migration** (Phase 3) | Neue Felder mit Default-Werten sind eine leichtgewichtige Migration. Trotzdem vorher an einem Gerät mit echter Datenbank testen — ein Schema-Fehler führt in `DataController.swift` zu `fatalError`, also zum Startabsturz. |
| **`transferUserInfo` in `expo-watch-connectivity`** | Bietet das Modul den Kanal nicht, braucht es einen Patch. Aufwand gering, aber vorab prüfen — Phase 1 hängt daran. |
| **`SwiftAudioEx`-Fork** | Das Einfügen in eine laufende Queue (Phase 4.2) muss der Fork `watchos-support-add-crop` unterstützen. Falls nicht: Queue neu aufbauen und Position wiederherstellen — unschöner, aber machbar. |
| **Hintergrundausführung auf watchOS** | Das System ist strikt. Phase 5.6 macht Hintergrundabschlüsse zuverlässiger, aber nicht garantiert. Die UI muss weiterhin damit umgehen können, dass ein Download erst beim nächsten Öffnen abgeschlossen wird. |
| **Scope-Falle** | Phase 7 ist verlockend und ändert am Kernproblem nichts. Erst 1–6. |

---

## 6. Woran sich der Erfolg messen lässt

1. Ein Titel antippen führt **immer** zu sichtbarer Reaktion — Wiedergabe,
   Ladeanzeige oder Fehlermeldung. Nie zu nichts.
2. Eine heruntergeladene Playlist spielt vollständig ohne Telefon in der Nähe.
3. Ein Download-Auftrag überlebt App-Neustart und Verbindungsabbruch und wird
   genau einmal ausgeführt.
4. Ein fehlender oder abgelaufener Titel unterbricht die laufende Wiedergabe
   nicht.
5. Jeder Fehlerzustand ist auf dem Gerät benennbar, ohne Xcode.
6. Die Digital Crown ändert im Player standardmäßig immer die Lautstärke;
   Spulen kann nur nach einer sichtbaren, bewussten Aktivierung übernehmen.
