# Plan: Watch-Inhalte vom iPhone aus verwalten

> **Status: ✅ umgesetzt (Phasen 0–5)** · aktualisiert 2026-10-09 · Branch:
> `yt-phone-adaptions` (Commits `3801161` … `56f114e`, Phase 5 noch nicht
> committet). Offen ist nur der gemeinsame Test auf echten Geräten (Abschnitt 6).
> Ursprünglicher Stand: 2026-10-04 · Branch: `po-token-v2`
> Scope: `targets/watch/**` (SwiftData, WatchConnectivity) + `src/hooks/watchSync/**`
> + neue Phone-Screens + Patch an `expo-watch-connectivity`. Baut auf
> `WATCH_UX_PLAN.md` (Phase 1 Transport, Phase 5 Downloads) auf, ist aber
> unabhängig von `WATCH_YOUTUBE_API_PLAN.md`.

---

## 0. Ziel in einem Satz

Die Phone-App zeigt, was auf der Uhr liegt (Downloads, Playlists, Speicher), und
kann es dort ändern — Downloads anstoßen/abbrechen/löschen, Playlists anlegen,
übertragen, umbenennen, umsortieren und löschen — ohne dass man die Uhr bedienen
muss.

---

## 1. Befund — was heute da ist

> Beschreibt den Ausgangszustand vor der Umsetzung (2026-10-04).

### 1.1 Datenhoheit liegt auf der Uhr

Die Uhr hat eine eigene SwiftData-Datenbank (`DBData.swift`: `Video`,
`Playlist`) und eigene Dateien unter `Documents/downloads/<id>/audio.*`. Das
Telefon weiß davon **nichts**: es gibt keinen Kanal Uhr → Telefon, der den
Bestand meldet. `sendDatabase()` in `SessionSync.swift` ist ein leerer Stub,
`GetDownloads` in `useWatchSync.ios.tsx` ein auskommentierter Zweig.

### 1.2 Was das Telefon heute schon an die Uhr schicken kann

| Aktion | Weg | Fundstelle |
|---|---|---|
| Playlist übertragen | `playlistResponse` per `transferUserInfo` | `useWatchSync.ios.tsx` → `sendPlaylistToWatch`, Menü in `MusicPlaylistScreen.tsx` |
| Lokalen Download als Datei übertragen | `sendFile` + Metadaten | `DownloadListItem.tsx` → `uploadToWatch` |
| Fortschritt der Dateiübertragung | Polling von `getCurrentFileTransfers` alle 10 s | `ActiveUploadScreen.tsx` |

Alles ist „Push und vergessen“: das Telefon erfährt nie, ob die Uhr den Inhalt
übernommen hat.

### 1.3 Was die Uhr lokal schon kann (und remote nutzbar wäre)

`DBUtils.swift` / `DownloadManager.swift` haben bereits fast alle Operationen:
`downloadVideo`, `downloadPlaylist`, `deleteDownloadedVideo`,
`deleteDownloadedPlaylist`, `addVideoToPlaylist`, `removeVideoFromPlaylist`,
`clearDownloads`. Es fehlt nur ein **Befehlseingang** und eine
**Rückmeldung** an das Telefon.

### 1.4 Harte Grenzen von WatchConnectivity

| Kanal | Eigenschaft | Brauchbar für |
|---|---|---|
| `sendMessage` | nur wenn die Gegenseite *gerade* erreichbar ist; iPhone → Uhr weckt die Watch-App **nicht**; Größe ~65 KB | Live-Fortschritt, sofortige Antwort |
| `transferUserInfo` | FIFO-Warteschlange, garantiert, wird beim nächsten Start/Hintergrund-Wake der Watch-App zugestellt | **Befehle** Telefon → Uhr |
| `updateApplicationContext` | nur der letzte Stand zählt, pro Richtung getrennt | kleiner Status (Revision, Speicher, Zähler) |
| `transferFile` | garantiert, keine praktische Größengrenze | **vollständiger Bestand** als JSON, Audiodateien |

Konsequenz: Das Telefon kann nie davon ausgehen, die Uhr live zu erreichen.
Die Phone-UI muss mit einem **zwischengespeicherten Snapshot** und
**ausstehenden Befehlen** arbeiten („wird ausgeführt, sobald die Uhr-App aktiv
ist“).

### 1.5 Fehler und Lücken, die vorher behoben werden müssen

> Alle behoben: a–c, e in Phase 0, d in Phase 3, f in Phase 3 (beim Entfernen
> von `playlist-sync`). Unterwegs zusätzlich gefunden und behoben: siehe
> „Zusätzlich behoben“ in den Phasen 0, 2, 3 und 4.

| # | Fundstelle | Problem |
|---|---|---|
| a | `node_modules/expo-watch-connectivity/ios/WatchSession.swift` → `didReceive file` | Reicht nur `file.fileURL` an JS weiter. WatchConnectivity **löscht die Datei, sobald der Delegate zurückkehrt** — JS kommt zu spät. Muss im Patch synchron in `Caches/` verschoben werden, bevor das Event feuert. Ohne das funktioniert kein Snapshot per `transferFile`. |
| b | `DBUtils.swift` → `deleteDownloadedVideo(id:)` | Löscht nur die Datei, setzt aber `downloaded`/`fileURL` nicht zurück. Der Eintrag behauptet danach „geladen“ und die Wiedergabe zeigt auf eine fehlende Datei. |
| c | `DBUtils.swift` → `addPlaylistData` | `playlist.videos` kommt aus einem `ids.contains`-Fetch, also **ohne Reihenfolge**. Für Umsortieren vom Telefon aus muss die Reihenfolge aus `videoIDs` abgeleitet werden. |
| d | `WatchYoutubeAPI.ts` → `playlist-sync` | Überträgt Uhr → Telefon nur hinzugefügte Titel; Entfernen und Umsortieren gehen verloren. Wird durch das neue Modell (Abschnitt 3.3) ersetzt. |
| e | `watchApp.swift` | Weder `.backgroundTask(.watchConnectivity)` noch ein funktionierender `.backgroundTask(.urlSession)`. Befehle warten deshalb, bis die App im Vordergrund ist; Downloads im Hintergrund schreiben die DB nicht (siehe `WATCH_UX_PLAN.md` Phase 5). |
| f | `WatchYoutubeAPI.ts` | Enthält deutsche Kommentare — laut `AGENTS.md` beim Anfassen ins Englische übersetzen. |

---

## 2. Leitideen

| # | Entscheidung | Begründung |
|---|---|---|
| 1 | **Die Uhr bleibt die Quelle der Wahrheit** für ihren Bestand. Das Telefon hält nur eine Kopie (Snapshot) und schickt Befehle. | Die Dateien liegen dort; nur die Uhr weiß, was wirklich auf der Platte ist. Kein Zwei-Wege-Merge zweier Datenbanken. |
| 2 | **Befehle statt Datenbank-Sync.** Jede Änderung ist ein kleiner, idempotenter Befehl mit `commandId`. | Funktioniert über die Warteschlange von `transferUserInfo`, auch wenn die Uhr gerade schläft. Doppelt zugestellte Befehle schaden nicht. |
| 3 | **Uhr-Playlists sind an iPhone-Playlists gekoppelt.** Gleiche ID auf beiden Seiten; Änderungen fließen in beide Richtungen. Über die Leitung geht immer die vollständige, geordnete `videoIds`-Liste (`upsertPlaylist`), zusammengeführt wird auf dem Telefon per Drei-Wege-Merge gegen den zuletzt synchronisierten Stand (Abschnitt 3.4). | Eine Playlist, die man auf dem Telefon pflegt, soll auf der Uhr einfach „da sein“ — ohne erneutes Übertragen. Der Merge verliert keine Änderung, wenn beide Seiten zwischendurch bearbeitet wurden. |
| 4 | **Jeder Befehl wird quittiert** (`commandResult`) und erhöht eine `revision`. | Die Phone-UI kann „ausstehend / erledigt / fehlgeschlagen“ zeigen statt zu raten. |
| 5 | **Optimistische Anzeige auf dem Telefon**: ausstehende Befehle werden über den Snapshot gelegt und markiert. | Die UI reagiert sofort, auch wenn die Uhr erst in zehn Minuten aufwacht. |
| 6 | **Zwei Download-Wege** sichtbar trennen: „Vom iPhone übertragen“ (Datei existiert schon auf dem Telefon → `sendFile`) und „Auf der Uhr laden“ (Uhr lädt selbst über WLAN/LTE). | Ersteres funktioniert ohne Netz auf der Uhr, Letzteres ohne Speicher auf dem Telefon. |

---

## 3. Protokoll

Alle Typen leben auf dem Telefon in **einer** Datei
(`src/hooks/watchSync/WatchLibraryProtocol.ts`) und auf der Uhr in
`targets/watch/WatchLibraryProtocol.swift` (Codable). Versioniert über
`protocolVersion`, damit eine alte Uhr-App einen unbekannten Befehl sauber mit
`unsupported` quittiert.

### 3.1 Uhr → Telefon: Bestand

**Snapshot** (per `transferFile`, JSON, Metadaten `{type: "librarySnapshot", revision}`):

```jsonc
{
  "protocolVersion": 1,
  "revision": 42,
  "generatedAt": 1780000000000,
  "storage": { "usedBytes": 812000000, "availableBytes": 4100000000 },
  "videos": [
    { "id": "abc", "title": "…", "artist": "…", "durationMillis": 180000,
      "downloaded": true, "sizeBytes": 3400000, "coverUrl": "…" }
  ],
  "playlists": [
    { "id": "PL…", "title": "…", "videoIds": ["abc", "…"],
      "autoDownload": true, "temp": false, "linked": true, "syncVersion": 7 }
  ],
  "activeDownloads": [ { "id": "abc", "progress": 0.4 } ],
  "pendingDownloads": ["def"]
}
```

**Kurzstatus** (per `updateApplicationContext` Uhr → Telefon): `{revision,
usedBytes, availableBytes, downloadedCount}`. Billig, immer aktuell; ist die
`revision` neuer als der zwischengespeicherte Snapshot, fordert das Telefon einen
neuen an.

**Live-Fortschritt** (nur wenn erreichbar, `sendMessage`, gedrosselt auf ~1/s):
`{type: "downloadProgress", id, progress}`.

### 3.2 Telefon → Uhr: Befehle

Umschlag (per `transferUserInfo`; das Modul versucht bereits zuerst
`sendMessage`, wenn erreichbar):

```jsonc
{ "type": "libraryCommand", "protocolVersion": 1,
  "commandId": "uuid", "issuedAt": 1780000000000,
  "op": "deleteDownload", "args": { "videoIds": ["abc"] } }
```

| `op` | `args` | Uhr-seitig | 
|---|---|---|
| `requestSnapshot` | – | Snapshot bauen und senden |
| `downloadVideos` | `videoIds`, `videos?` (Metadaten) | Metadaten anlegen → `requestVideo` → `DownloadManager` |
| `cancelDownloads` | `videoIds` | aus `pendingDownloads` nehmen, laufende Tasks abbrechen |
| `deleteDownload` | `videoIds` | Datei löschen **und** `downloaded=false`, `fileURL=nil` (Fix 1.5 b) |
| `removeVideos` | `videoIds` | Eintrag ganz entfernen, wenn in keiner Playlist mehr |
| `upsertPlaylist` | `id`, `title`, `videoIds`, `videos?`, `coverUrl?`, `autoDownload?`, `syncVersion` | ersetzen (das Telefon hat bereits gemergt); Reihenfolge aus `videoIds`; `linked = true` |
| `deletePlaylist` | `id`, `deleteDownloads` | `deleteDownloadedPlaylist` bzw. nur Playlist entfernen; Kopplung aufheben |
| `setPlaylistAutoDownload` | `id`, `enabled` | `playlist.download` + `downloadPlaylist` |
| `clearAllDownloads` | – | `clearDownloads` |
| `transferVideo` | `videoIds` (genau eine) | **kein** `transferUserInfo`-Befehl: verfolgt eine Datei-Übertragung (Phase 4). Die `commandId` steht in den Datei-Metadaten, die Uhr quittiert nach dem Speichern. |

**Datei-Übertragungen** (Telefon → Uhr, `transferFile`, Phase 4). Metadaten:
- Video: `{type: "videoFile", protocolVersion, commandId, id, title?, artist?,
  durationMillis?, coverUrl?, fileExtension?}`. `durationMillis` folgt der
  Einheit der Phone-DB (geladene Titel: ms, sonst s → `getStoredDurationMillis`).
- Cover: `{type: "videoCover", protocolVersion, id, fileExtension?}`, wird vor
  dem Video gesendet, ohne Quittung; landet als `downloads/<id>/cover.<ext>`.

**Quittung** (Uhr → Telefon, `transferUserInfo`):
`{type: "libraryCommandResult", commandId, status: "ok" | "failed" | "unsupported", error?, revision}`.

### 3.3 Änderungen auf der Uhr selbst

Bearbeitet der Nutzer doch auf der Uhr (Swipe-Löschen, „Add to Playlist“),
erhöht die Uhr die `revision` und schickt den Kurzstatus. Bei einer
**gekoppelten** Playlist schickt sie zusätzlich sofort

```jsonc
{ "type": "playlistChanged", "id": "LC-…", "title": "…",
  "videoIds": ["…"], "baseSyncVersion": 7 }
```

per `transferUserInfo`. `baseSyncVersion` ist die Version, die die Uhr zuletzt
vom Telefon bekommen hat. Das ersetzt `playlist-sync` (1.5 d) vollständig.
Mehrere Bearbeitungen innerhalb von 0,5 s werden zu einer Nachricht gebündelt.

Wird eine gekoppelte Playlist auf der Uhr gelöscht, schickt sie
`{type: "playlistDeleted", id}`; das Telefon beendet nur die Kopplung.

**Live-Fortschritt** (umgesetzt in Phase 4): statt einer Nachricht pro Titel
ein Sammel-Update aller laufenden Downloads,
`{type: "downloadProgress", downloads: [{id, progress}]}`, höchstens 1/s und
nur bei Erreichbarkeit. Das Telefon verwirft es nach 5 s ohne Update.

**Snapshot-Ergänzungen:** `videos[].downloadedAt` (ms, Erstellungsdatum der
Audiodatei, Phase 5). Snapshots ≤ 48 KB gehen bei Erreichbarkeit direkt per
`sendMessage` (`{type: "librarySnapshot", revision, json}`), sonst per Datei.
Der Kurzstatus liegt im Application Context unter dem Schlüssel `libraryStatus`.

### 3.4 Kopplung von Playlists

**Identität.** Die Uhr-Playlist trägt dieselbe ID wie die Phone-Playlist —
lokal (`LC-…`, `LC-R-…`) oder YouTube (`PL…`/`VL…`). Neues Feld
`Playlist.linked: Bool` auf der Uhr; nur gekoppelte Playlists nehmen am Abgleich
teil. Die Home-Feed-Playlists (`temp == true`) bleiben ungekoppelt.

**Zustand auf dem Telefon** (im selben JSON-Cache wie der Snapshot), pro
gekoppelter Playlist:

```jsonc
{ "id": "LC-…", "syncVersion": 7,
  "sent":  { "title": "…", "videoIds": ["…"] },  // state sent with syncVersion
  "acked": { "title": "…", "videoIds": ["…"] },  // last state the watch acknowledged
  "ackedVersion": 6,
  "autoDownload": true,
  "pendingWatchChange": null }                   // watch edit not yet applied to the phone
```

> Umgesetzt mit `sent`/`acked` statt eines einzelnen `base`: Bezieht sich ein
> `playlistChanged` auf die aktuelle `syncVersion`, ist `sent` die Basis, sonst
> `acked`. So geht keine Änderung verloren, wenn die Uhr auf einem älteren
> Stand bearbeitet, während ein neueres `upsertPlaylist` noch unterwegs ist.

**Telefon → Uhr.** Ändert sich eine gekoppelte Playlist auf dem Telefon, wird
neu gemergt und — falls sich die geordnete Liste von `base` unterscheidet — ein
`upsertPlaylist` mit `syncVersion + 1` geschickt. Auslöser:
- lokale Playlists: Live-Query auf `playlist`/`playlist_videos` (Drizzle);
- YouTube-Playlists: nach jeder Mutation über `usePlaylistManager` aus der App
  heraus, außerdem beim App-Start/Vordergrund und beim Öffnen des Watch-Screens
  (Änderungen aus anderen YouTube-Clients kommen nicht als Push).

**Uhr → Telefon.** Ein `playlistChanged` wird gegen `base` und den aktuellen
Phone-Stand gemergt und dann auf dem Telefon angewendet:
`saveVideoToPlaylist`, `removeVideoFromPlaylist` und ein **neues** `moveVideo`
in beiden Playlist-Managern (lokal: `playlist_order` umschreiben; YouTube:
`youtube.playlist.moveVideo(playlistId, movedId, predecessorId)` aus
`youtubei.js`). Danach geht das Ergebnis als `upsertPlaylist` zurück, beide
Seiten haben wieder denselben Stand. Ist YouTube gerade nicht erreichbar, bleibt
die Änderung als `pendingWatchChange` liegen und wird später erneut versucht.

**Merge-Regel** (reine Funktion `mergePlaylist(base, phone, watch)`):
- Hinzugefügt = auf einer der beiden Seiten neu gegenüber `base` → aufnehmen.
- Entfernt = auf einer der beiden Seiten gegenüber `base` entfernt → entfernen.
- Reihenfolge: die des Telefons; Titel, die nur die Uhr neu hat, an ihre
  Position relativ zum Vorgänger in der Uhr-Liste einfügen, sonst ans Ende.
  *Umgesetzt:* Hat **nur** die Uhr umsortiert, gilt ihre Reihenfolge. Neue
  Titel kommen hinter den nächsten noch vorhandenen Vorgänger, ohne Vorgänger
  an den Anfang.
- YouTube kennt nur „hinter Vorgänger verschieben“: `planPlaylistMoves` lässt
  die längste schon passende Teilfolge stehen und verschiebt den Rest
  (minimale Zahl an Aufrufen).
- Titel: das Telefon gewinnt.

**Lebenszyklus.**
- „Auf der Uhr“ (Schalter an der Phone-Playlist) koppelt und überträgt.
- Kopplung auf dem Telefon aufheben → `deletePlaylist` auf der Uhr, auf
  Wunsch inklusive Downloads (nur Titel, die in keiner anderen Playlist sind).
- Phone-Playlist gelöscht → Uhr-Playlist wird ebenfalls entfernt.
- Auf der Uhr gelöscht → nur die Kopplung endet, die Phone-Playlist bleibt.
- `autoDownload` an einer gekoppelten Playlist: neu hinzugekommene Titel lädt
  die Uhr automatisch; entfernte Titel gibt sie frei.

---

## 4. Phasen

### Phase 0 — Voraussetzungen · ✅ erledigt (`3801161`)

- `expo-watch-connectivity` (eigenes Modul, wird weiter gepatcht und später
  als neue Version veröffentlicht; bis dahin über `patches/`):
  - in `didReceive file` die Datei synchron nach `Caches/watch-inbox/`
    verschieben und diesen Pfad im `newFile`-Event liefern (1.5 a);
  - `addFileListener` und `FileTransferInfo` sauber typisieren (der heutige
    `as any`-Cast in `checkTransfers` entfällt);
  - `getCurrentFileTransfers` liefert die `metadata` mit, damit Übertragungen
    einem Titel/Befehl zugeordnet werden können;
  - Events für `didFinish userInfoTransfer` (mit Fehler) an JS weiterreichen,
    damit fehlgeschlagene Befehle sichtbar werden.
- `deleteDownloadedVideo` setzt die DB-Felder zurück (1.5 b).
- `addPlaylistData` ordnet `videos` nach `videoIDs` (1.5 c).
- `watchApp.swift`: `.backgroundTask(.watchConnectivity)` ergänzen, damit
  wartende Befehle auch ohne Vordergrund abgearbeitet werden, soweit watchOS es
  zulässt.

**Umgesetzt.** Abweichungen und Zusätze:
- Patch puffert `newMessage`, `newFile` und `finishedUserInfoTransfer`, bis JS
  zuhört (max. 200 pro Event), damit beim Hintergrund-Wake nichts verloren geht.
- Neuer Listener `addUserInfoTransferFinishedListener`; `ios/Types.swift`
  bleibt ungenutzt im Modul, um kein `pod install` zu erzwingen.
- `Playlist.orderedVideos` sortiert nach `videoIDs`, weil SwiftData die
  Reihenfolge von To-many-Beziehungen nicht garantiert; Liste und Player
  nutzen es.
- Background-Task wartet bis `hasContentPending == false` (max. 25 s).

### Phase 1 — Snapshot Uhr → Telefon (nur lesen) · ✅ erledigt (`b9da040`)

Uhr:
- `LibrarySnapshot.swift`: baut den Snapshot aus SwiftData; Dateigrößen per
  `FileManager` über `getDownloadDirectory()`, freier Speicher über
  `volumeAvailableCapacityForImportantUsageKey`.
- `revision` persistent (`UserDefaults`), erhöht bei jedem `modelContext.save()`
  — zentral über `NotificationCenter` (`ModelContext.didSave`), entprellt auf
  ~2 s, statt an jeder Aufrufstelle.
- Bei Revisionswechsel: Kurzstatus per `updateApplicationContext`; Snapshot auf
  Anfrage (`requestSnapshot`) oder wenn das Telefon erreichbar wird.

Telefon:
- `WatchLibraryProtocol.ts` mit Typen + reinen Funktionen (Parsing/Validierung).
- `WatchLibraryContext` (iOS) / Stub (sonst), analog zu `useWatchSync.tsx` vs.
  `useWatchSync.ios.tsx`. Hält Snapshot, Kurzstatus, Erreichbarkeit
  (`useReachable`), Zeitpunkt der letzten Synchronisation.
- Snapshot persistent als JSON-Datei in `Paths.document` zwischenspeichern
  (wird immer als Ganzes ersetzt), damit der Screen auch ohne erreichbare Uhr
  etwas zeigt. Ausstehende Befehle und der Kopplungszustand (3.4) liegen in
  derselben Datei.

Ergebnis: ein Screen „Apple Watch“ mit Speicherbalken, Downloads und Playlists
— nur lesend.

**Umgesetzt.** Abweichungen und Zusätze:
- Freier Speicher über `systemFreeSize` (der Important-Usage-Key existiert auf
  watchOS nicht).
- Patch: `getReceivedApplicationContext()`, weil `getApplicationContext` nur
  den selbst gesendeten Kontext liefert.
- Cache: `Paths.document/watch-library.json`; Snapshot-Anfragen höchstens alle
  15 s. Platzhalter-Varianten des Contexts für Android (`.tsx`) und tvOS
  (`.tv.tsx`).
- Einstieg im „Du“-Screen, nur bei installierter Watch-App.

### Phase 2 — Befehle + Quittungen · ✅ erledigt (`52a6cb2`)

Uhr:
- `RemoteLibraryCommands.swift`: Dispatcher in
  `SessionSync.handleIncomingMessage` für `type == "libraryCommand"`. Erledigte
  `commandId`s (letzte ~200) in `UserDefaults` merken → Idempotenz.
- Jeder Befehl ruft bestehende Funktionen aus `DBUtils`/`DownloadManager` auf,
  speichert, schickt `libraryCommandResult`.

Telefon:
- Ausstehende Befehle persistent speichern (gleicher Speicher wie Snapshot).
- Reine Funktion `applyPendingCommands(snapshot, pending) → viewModel` für die
  optimistische Anzeige; ein Befehl verschwindet bei Quittung oder wenn ein
  Snapshot mit `revision >= result.revision` eintrifft.
- Timeout-Anzeige („Uhr seit 2 h nicht erreicht“) statt stillem Hängen;
  „Erneut senden“ und „Verwerfen“ pro Befehl.

Ergebnis: Downloads löschen, Uhr-Download starten/abbrechen, „Alle löschen“.

**Umgesetzt.** Abweichungen und Zusätze:
- Zustände ausstehender Befehle: `pending` → `applied` (quittiert, wartet auf
  Snapshot mit `revision ≥ result.revision`) / `failed`. Die Quittung trägt die
  sofort festgeschriebene Revision (`flushRevision`).
- Hinweis bei fehlender Antwort nach 30 min; „Erneut senden“ vergibt eine neue
  `commandId` (bekannte IDs beantwortet die Uhr nur mit dem gespeicherten
  Ergebnis).
- Optimistische Anzeige markiert betroffene Zeilen („Löschen ausstehend“), statt
  sie zu entfernen.

*Zusätzlich behoben:* Downloads ohne gültige URL blieben ewig in der
Warteschlange (`awaitingMetadata` + `videoMetadataUpdated`); abgebrochene
SDDownloadManager-Tasks melden sich nicht zurück, daher eigene
Buchführung über `downloadKeys`.

### Phase 3 — Gekoppelte Playlists · ✅ erledigt (`6ecbff3`)

- Uhr: Feld `Playlist.linked`, Befehle `upsertPlaylist`/`deletePlaylist`,
  `playlistChanged` bei lokaler Bearbeitung gekoppelter Playlists,
  `upsertPlaylist` legt fehlende `Video`-Einträge mit den mitgeschickten
  Metadaten an (wie `savePlaylistResponse` heute) und stößt bei `autoDownload`
  die Downloads an. `sendPlaylistStateToPhone`/`playlist-sync` entfallen.
- Telefon: `mergePlaylist` als reine Funktion; Sync-Engine
  (`src/hooks/watchSync/useLinkedPlaylists.ts`) mit den Auslösern aus 3.4.
- Playlist-Manager um `moveVideo` erweitern (lokal + YouTube) — wird ohnehin
  für Umsortieren in der Phone-App gebraucht.
- UI: Schalter „Auf der Apple Watch“ + „Automatisch laden“ im Menü von
  `MusicPlaylistScreen` (ersetzt „An Watch senden“); im Watch-Screen Liste der
  gekoppelten Playlists mit Sync-Status („synchron“, „wartet auf Uhr“,
  „wartet auf YouTube“). Bearbeitet wird die Playlist dort, wo sie ohnehin
  lebt: in der normalen Phone-Playlist-Ansicht.

**Umgesetzt.** Abweichungen und Zusätze:
- Kopplungszustand mit `sent`/`acked` (siehe 3.4); ältere, noch unbestätigte
  `upsertPlaylist` derselben Playlist werden durch neuere ersetzt.
- Uhr: bei `autoDownload` werden entfernte Titel freigegeben, wenn keine andere
  Playlist sie nutzt; `upsertPlaylist` ignoriert ältere `syncVersion`s.
- Auslöser für YouTube-Änderungen: `playlistChangeEvents` nach jeder Mutation
  der Playlist-Manager; lokale Playlists zusätzlich über Live-Queries.
- Status im Watch-Screen: „synchron“, „wartet auf die Uhr“, „wartet auf
  YouTube“ bzw. „Änderungen der Uhr werden übernommen“ (lokal), „fehlgeschlagen“.
- Alte Pfade entfernt: `sendPlaylistStateToPhone`, `playlist-sync`,
  „An Watch senden“; deutsche Kommentare in `WatchYoutubeAPI.ts` übersetzt.

*Zusätzlich behoben:* `removeVideosIntoPlaylist` wartete die Löschungen nicht
ab; beim Entfernen des letzten Playlist-Eintrags auf der Uhr blieb die Datei
verwaist.

### Phase 4 — Downloads vom iPhone übertragen, vereinheitlicht · ✅ erledigt (`56f114e`)

- In der Watch-Ansicht pro Titel/Playlist: „Vom iPhone übertragen“, wenn der
  Titel auf dem Telefon geladen ist, sonst „Auf der Uhr laden“.
- `ActiveUploadScreen` wird Teil des Watch-Screens (Tab „Übertragungen“), mit
  Live-Fortschritt der Uhr-Downloads aus 3.1 neben den Dateiübertragungen.
- `fileTransfer` bekommt `commandId` in den Metadaten, damit auch dieser Weg
  quittiert wird.

**Umgesetzt.** Abweichungen und Zusätze:
- Uhr nimmt Dateien jetzt in `didReceive file` an und verschiebt sie synchron
  (vorher fälschlich in `didFinish fileTransfer`, dem Sender-Callback).
- `ActiveUploadScreen`/`ActiveUploadListItem` und das 10-s-Polling entfernt;
  Übertragungen werden nur abgefragt, solange der Tab offen ist (alle 2 s).
- Playlists bieten beide Wege getrennt an: „N Titel vom iPhone übertragen“ und
  „M Titel auf der Uhr laden“.

*Zusätzlich behoben:* toter Pfad `uploadFile`; die Dauer wurde doppelt in
Millisekunden umgerechnet (3‑Minuten-Song → ~50 h, nachträglich behoben, auch
in `useLinkedPlaylists`); geladene Cover wurden nicht übertragen (jetzt als
eigene Datei `videoCover`). Bereits übertragene Titel einmal neu übertragen.

### Phase 5 — Feinschliff · ✅ erledigt (noch nicht committet)

- Einstiegspunkte: `YouScreen`, `DownloadScreen`, Kontextmenü
  („Auf der Uhr speichern“) in `DownloadListItem`.
- Mehrfachauswahl und Swipe-to-delete in der Downloadliste.
- Alle Texte über `src/localization/` (`en` + `de`, Namensraum `watchLibrary.*`),
  inklusive Accessibility-Labels.
- Nur iOS-Phone: TV und Android bekommen den Stub, Menüeinträge werden dort
  ausgeblendet (`useInstalled()` / `Platform.OS`).

**Umgesetzt.** Zusätzlich zum Plan:
- Sortierung der Downloadliste nach „Hinzugefügt am“ (Standard), Name
  (natürlich, sprachabhängig) oder Größe; gespeichert in
  `AppSettings.watchLibraryDownloadSort`. Laufende/wartende Downloads bleiben
  oben. Das Datum kommt aus dem Erstellungsdatum der Audiodatei
  (`downloadedAt`), also ohne Migration.
- Auswahlmodus per langem Drücken, Chip „Auswählen“ oder „Mehrere auswählen“
  im Zeilenmenü (VoiceOver); Swipe nach links zum Löschen bzw. Stoppen.
- `AppListItem` hat dafür ein optionales `onLongPress`.

---

## 5. Phone-UI (Skizze)

```
Apple Watch                     ● verbunden · vor 1 Min
┌──────────────────────────────────────────────┐
│ Speicher  ███████░░░░░  812 MB / 4,9 GB        │
└──────────────────────────────────────────────┘
[ Downloads ]  [ Playlists ]  [ Übertragungen ]

Downloads (37)                              ⋯ Alle löschen
  ▢ Titel A · Künstler        3,4 MB
  ▢ Titel B · Künstler        ⟳ 40 %
  ▢ Titel C · Künstler        ⏳ Löschen ausstehend
```

---

## 6. Tests

- ✅ `test/watch-library-protocol.test.mjs` (statt `.ts`, wie die übrigen
  Tests): Snapshot/Status/Cache-Parsing, ausstehende Befehle und Quittungen,
  Kopplungszustand, optimistische Anzeige, Datei-Metadaten (Dauer, Cover),
  Live-Fortschritt, Übertragungsliste, Sortierung und Auswahl.
- ✅ `test/watch-playlist-merge.test.mjs`: alle geplanten Merge-Fälle; dazu
  `planPlaylistMoves` gegen alle Permutationen von 5 Titeln.
- ⏳ Uhr: keine Swift-Unit-Tests; geprüft wird nur, dass `RT-Watch` baut.
  Idempotenz, `deleteDownload` und `upsertPlaylist` bleiben für den Gerätetest.
- ⏳ **Offen – manuell auf echten Geräten** (der Simulator unterstützt
  `transferUserInfo`/`transferFile` nicht):
  - Befehl mit geschlossener Watch-App absetzen → Watch-App öffnen → Quittung
    und Snapshot erscheinen auf dem Telefon.
  - Lokale und YouTube-Playlist koppeln, auf beiden Seiten bearbeiten,
    YouTube-Umsortieren prüfen (siehe Risiko unten).
  - Titel vom iPhone übertragen: Dauer, Cover, Fortschritt, Quittung.
  - Sortierung, Auswahlmodus, Swipe; bestehende SwiftData-Datenbank nach dem
    Update (neue Felder `linked`, `syncVersion` mit Standardwerten).

---

## 7. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| watchOS weckt die App für `transferUserInfo` nur selten im Hintergrund | UI kommuniziert „ausstehend“ ehrlich; optional Hinweis „Watch-App öffnen“ |
| Snapshot wird bei vielen Titeln groß | `transferFile` statt Nachricht; Cover-URLs statt Bilddaten |
| Konflikt Uhr- vs. Telefon-Bearbeitung derselben Playlist | Drei-Wege-Merge gegen `base` (3.4), Ergebnis geht an beide Seiten zurück |
| YouTube-Playlists ändern sich außerhalb der App | Abgleich beim App-Start/Vordergrund und beim Öffnen des Watch-Screens; kein Echtzeit-Anspruch |
| YouTube-Mutation schlägt fehl (offline, Rate-Limit) | Uhr-Änderung bleibt als `pendingWatchChange` liegen, wird erneut versucht und im Status angezeigt |
| Abgelaufene Stream-URLs bei „Auf der Uhr laden“ | Uhr holt Metadaten wie bisher per `requestVideo` frisch, statt sie im Befehl mitzuschicken |
| Patch an `expo-watch-connectivity` wächst | Änderungen gesammelt in eine neue Modul-Version überführen, danach `patches/expo-watch-connectivity+*.patch` entfernen (dabei `ios/Types.swift` löschen) |
| **Neu:** `youtube.playlist.moveVideo` lädt die Playlist über die Web-Browse-API, die mit der TV-Session laut bestehendem Kommentar mit 400 scheitern kann | Ungetestet. Schlägt es fehl, bleibt die Uhr-Änderung als `pendingWatchChange` liegen, Status „wartet auf YouTube“; ggf. auf die Music-Playlist (`set_video_id`) umstellen |
| **Neu:** Live-Fortschritt vergleicht Uhrzeiten von Telefon und Uhr | Unkritisch bei automatisch gestellter Uhrzeit; sonst fällt die Anzeige auf den Snapshot zurück |

---

## 8. Entscheidungen

1. **`expo-watch-connectivity`:** wird weiter gepatcht (eigenes Modul); die
   Änderungen gehen später in eine neue veröffentlichte Version.
2. **Playlists:** Uhr-Playlists sind an iPhone-Playlists gekoppelt (3.4).
3. **Snapshot-Cache:** JSON-Datei auf dem Telefon, keine Drizzle-Tabelle.
4. **„Hinzugefügt am“:** aus dem Datei-Erstellungsdatum statt eines neuen
   SwiftData-Felds, damit bestehende Downloads ein Datum haben.
5. **Cover bei Übertragungen:** als eigene Datei statt URL, weil die Uhr ohne
   Netz sonst kein Bild hat und das Telefon nur noch den lokalen Pfad kennt.
