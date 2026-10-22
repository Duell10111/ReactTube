# Plan: Zuverlässige Hintergrunddownloads und Download-Mitteilungen auf der Watch

## Ziel

Downloads auf der Watch sollen auch dann sauber abgeschlossen werden, wenn die
App im Hintergrund ist oder vom System beendet wurde. Der Benutzer soll ohne
geöffnete App erfahren, ob ein Download-Auftrag fertig ist oder ob Titel
fehlgeschlagen sind.

Der Plan umfasst zwei Teile:

1. Hintergrundabschlüsse zuverlässig verarbeiten. Das behebt
   [W05](WATCH_APP_STABILITY_REVIEW.md#w05-hintergrunddownloads-gehen-nach-prozessneustart-verloren)
   und den Download-Teil von
   [W04](WATCH_APP_STABILITY_REVIEW.md#w04-löschaktionen-lassen-downloadaufträge-weiterlaufen).
2. Eine zusammengefasste lokale Mitteilung, sobald ein Download-Auftrag
   abgeschlossen ist.

Nicht Teil dieses Plans sind ein Smart-Stack-Widget und eine Live Activity über
das iPhone. Eine laufende Fortschrittsanzeige im Hintergrund ist auf watchOS
nicht möglich: Eine angehaltene App erhält keine Fortschrittsmeldungen, sondern
wird erst bei abgeschlossenen Aufgaben geweckt.

## Stand (22. Oktober 2026, Branch `watch-stability`)

Teil 1 ist im Rahmen der Stabilitätsarbeiten umgesetzt, teilweise anders als
ursprünglich geplant. Teil 2 ist offen.

| Phase                                 | Stand                                                          |
| ------------------------------------- | -------------------------------------------------------------- |
| 1: Persistierter Auftragszustand      | Umgesetzt mit W05 (`1285b52`), ohne Batches                    |
| 2: Eigene Hintergrundsession          | Umgesetzt mit W04/W05 (`1448a6f`, `1285b52`)                   |
| 3: Appstart und Hintergrundereignisse | Umgesetzt (`1285b52`, `8dc5ba3`, `69bf46d`, Nachtrag)          |
| 4: Zusammengefasste Mitteilungen      | Offen; benötigt zuerst Batches                                 |
| 5: Prüfung                            | Isolierte Prüfungen und Entwicklerhilfe vorhanden; Gerät offen |

Weitere Änderungen auf dem Branch, die den Plan betreffen:

- **W03** (`6bf7340`, `8dc5ba3`, `69bf46d`): Metadatenanfragen haben eine
  Kennung, ein Zeitlimit von 20 Sekunden und höchstens drei Versuche.
  Wiederverbindungen senden erneut, ohne einen Versuch zu verbrauchen.
  `metadata_not_ready` führt nach drei Sekunden zu einem neuen Versuch.
  `awaitingMetadata` endet damit immer in einem Download oder einem Fehler.
  Der frühere offene Punkt „Batch bleibt dauerhaft offen“ ist erledigt.
- **W09** (`aa06f0a`): Eine nicht lesbare Datenbank beendet die App nicht mehr.
  Stattdessen erscheint ein Wiederherstellungsbildschirm. Solange keine
  Datenbank bereitsteht, behalten Hintergrundabschlüsse ihre Zwischendateien.
- **Lokalisierung:** Die Watch hat mit `WatchStabilityCopy` erstmals typisierte
  englische und deutsche Texte und eine eigene Einstellung `uiLanguage`,
  getrennt von der YouTube-Inhaltssprache.
- **Löschen während der Wiedergabe** (`6ec38f7`): Beim Freigeben eines Downloads
  verlässt der lokale Eintrag die Warteschlange, bevor die Datei gelöscht wird.

## Umgesetzter Aufbau

- [`DownloadManager.swift`](../targets/watch/DownloadManager.swift) enthält zwei
  Teile:
  - `DownloadManager` (`MainActor`, `@Observable`) verwaltet die Warteschlangen
    und die Zuordnung von Video-ID zu Generation sowie zu den Schlüsseln für
    Audio und Cover. Die öffentlichen Eigenschaften (`activeDownloads`,
    `pendingDownloads`, `awaitingMetadata`, `failedDownloads`,
    `progressDownloads`) sind unverändert. Views, `LibrarySnapshot` und
    `RemoteLibraryCommands` mussten nicht angepasst werden.
  - `WatchDownloadTransport` ist ein eigener `URLSessionDownloadDelegate` mit
    der Sessionkennung `com.duell10111.reacttube.watch.downloads.v2`.
- SDDownloadManager ist vollständig entfernt, auch aus
  [`expo-target.config.js`](../targets/watch/expo-target.config.js).
- Persistenz unter `Documents/download-transfers/`, jeweils atomar als JSON
  geschrieben:
  - `jobs.json`: laufende Transfers als `WatchDownloadJob` (Schlüssel, Video-ID,
    Art `audio`/`cover`, Generation, Dauer).
  - `queue.json`: angeforderte Video-IDs und Fehlergründe.
  - `<Schlüssel>.complete`: Zwischendateien abgeschlossener Transfers.
- [`watchApp.swift`](../targets/watch/watchApp.swift): Die UI startet
  `restore()`. `.backgroundTask(.urlSession)` ruft `handleBackgroundEvents` auf;
  `.backgroundTask(.watchConnectivity)` stellt ebenfalls wieder her, damit vom
  iPhone angestoßene Downloads auch ohne UI starten.

### Abweichungen vom ursprünglichen Plan

- **`taskDescription` enthält nur einen UUID-Schlüssel**, kein JSON mit
  Video-ID, Art und Batch. Die Zuordnung läuft über das Journal `jobs.json`.
  Fehlt ein Journaleintrag, gilt der Task als verwaist und wird abgebrochen.
- **Generation statt Zustandsautomat.** Es gibt keinen `DownloadJobStore` mit
  reinen Übergangsfunktionen. Verspätete Rückmeldungen werden stattdessen über
  eine Generation pro Video-ID verworfen. Abgebrochene Aufträge werden aus dem
  Journal entfernt, bevor das System den Task abbricht. Ein spätes
  `NSURLErrorCancelled` findet deshalb keinen Auftrag mehr.
- **Kein `DownloadBatch`.** Batches wurden für W05 nicht benötigt und sind in
  Phase 4 verschoben.
- **Ablageort** ist `Documents/download-transfers/`, nicht Application Support
  und nicht `downloads/.incoming/`.
- **Ein Auftrag ohne Systemtask** (`running` ohne Task) wird einmal
  automatisch neu eingereiht (`WatchDownloadError.taskMissing`). Ist der Link
  abgelaufen, fordert `enqueue` neue Metadaten an. Fehlt der Task erneut, gilt
  der Auftrag als fehlgeschlagen. Die bereits neu gestarteten Video-IDs stehen
  in `queue.json` (`restartedIDs`, optional für ältere Dateien).
- **Titel mit fehlender lokaler Datei** werden beim Start nur auf „nicht
  heruntergeladen“ zurückgesetzt und nicht automatisch erneut geladen
  (`69bf46d`).
- **Abschlüsse kopieren die Zwischendatei** an den Zielort. Erst nachdem
  SwiftData gespeichert und das Journal aktualisiert ist, wird sie gelöscht.
  Scheitert ein Schritt, bleibt sie für den nächsten Abgleich erhalten.

## Phase 1: Persistierter Auftragszustand

- [x] Persistierter Auftrag `WatchDownloadJob` und Warteschlangenzustand
      (`queue.json`) als atomar geschriebenes JSON, ohne SwiftData-Schemaänderung.
- [x] Ist das Journal nicht lesbar, wird der Fehler protokolliert und mit einem
      leeren Journal begonnen. Laufende Systemtasks ohne Eintrag werden beim
      Abgleich abgebrochen.
- [ ] `DownloadBatch` (Kennung, Anzeigename, Video-IDs, Art: Playlist,
      Einzeltitel oder Synchronisierung vom iPhone). Verschoben in Phase 4.
- [ ] ~~Reine Übergangsfunktionen in einem `DownloadJobStore`~~ — durch die
      Generation pro Video-ID ersetzt. Nur nötig, falls die Batch-Logik in
      Phase 4 einen eigenen Zustandsautomaten braucht.

## Phase 2: Eigene Hintergrundsession

- [x] `WatchDownloadTransport` mit eigener, fester Sessionkennung. Die alte
      Kennung der Bibliothek wird nicht weiterverwendet.
- [x] `didFinishDownloadingTo` verschiebt die Datei synchron in die
      Zwischenablage und übergibt erst danach an den Main-Thread. Die
      Reihenfolge bis einschließlich `urlSessionDidFinishEvents` bleibt dabei
      erhalten.
- [x] Abschlüsse arbeiten nur mit der Video-ID. Ein fehlendes `Video` oder ein
      abgebrochener Auftrag führt zum Verwerfen der Datei, ohne dass ein
      Datenbankeintrag angelegt wird. `addDownloadData` wird für Abschlüsse
      nicht mehr verwendet.
- [x] Abbrechen erfasst Audio, Cover und Metadatenanfragen (W04).
- [x] Fortschritt aus `didWriteData` geht an `progressDownloads` und wird nicht
      persistiert.
- [x] **Verständlicher Fehlergrund bei HTTP-Fehlern.** Statuscodes außerhalb von
      2xx werden als `WatchDownloadError.httpStatus` gemeldet.
      `DownloadMessages.reason(for:)` liefert lokalisierte Texte aus
      `WatchStabilityCopy`: abgelaufener Link (403/410), sonstiger Serverfehler
      mit Statuscode, Netzwerkfehler, vom System abgebrochener Task und
      allgemeiner Fehler. Bei einem abgelaufenen Link wird `downloadURL`
      gelöscht, damit „Erneut versuchen“ einen neuen Link anfordert.

## Phase 3: Appstart und Hintergrundereignisse

- [x] **Abgleich beim Start** (`restore()` → `reconcile()`): Zwischendateien
      werden übernommen. Aufträge ohne Task starten einmal neu. Verwaiste
      Tasks werden abgebrochen, verwaiste Zwischendateien gelöscht. Angeforderte,
      aber nicht laufende Titel werden erneut eingereiht.
- [x] **Hintergrundereignisse:** `handleBackgroundEvents` stellt zuerst wieder
      her und wartet dann auf `urlSessionDidFinishEvents`. Kommt das Ereignis vor
      dem Handler, wird es vorgemerkt. Wird die Hintergrundaufgabe abgebrochen,
      kehrt der Handler zurück.
- [x] `checkDownloads` holt eine ausstehende Wiederherstellung nach und startet
      nach jedem Abschluss die nächsten Aufträge, auch im Hintergrund. Das Limit
      von vier parallelen Downloads bleibt bestehen.
- [x] Ist die Datenbank nicht verfügbar (W09), bleiben Zwischendateien und
      Journaleinträge erhalten, bis die Bibliothek wieder geöffnet ist.
- [x] **Abgleich bei `scenePhase == .active`.** `DownloadManager.refresh()`
      gleicht nach der ersten Wiederherstellung erneut ab, wenn die App wieder
      aktiv wird. Vor dem Vergleich leert `reconcile()` die Delegate-Queue. Ein
      Task, der die Session gerade verlassen hat und dessen Rückmeldung noch
      aussteht, gilt damit nicht als verloren.
- [x] **Zeitlimit als Sicherheitsnetz** in `waitForBackgroundEvents`: Nach
      20 Sekunden ohne `urlSessionDidFinishEvents` kehrt der Handler mit einer
      Warnung im Log zurück. Ob der Wert zur Hintergrundlaufzeit auf dem Gerät
      passt, ist Teil der Geräteprüfung.

## Phase 4: Zusammengefasste Mitteilungen

**Voraussetzung: Batches.**

- [ ] `DownloadBatch` mit Kennung, Anzeigename, Art und Video-IDs einführen und
      zusammen mit `queue.json` persistieren. Den bestehenden Zustand dabei
      abwärtskompatibel laden; ohne Batchfeld gilt eine leere Liste.
- [ ] Batches entstehen in `downloadPlaylist` (Playlist), in `enqueue` bzw.
      `retry` aus dem UI (Einzeltitel) und in den Downloadbefehlen von
      `RemoteLibraryCommands`/`SessionSync` (Synchronisierung vom iPhone).
      Eine Video-ID kann zu mehreren Batches gehören.
- [ ] Ein Batch ist abgeschlossen, sobald für jede seiner Video-IDs gilt:
      heruntergeladen, in `failedDownloads` oder abgebrochen. `awaitingMetadata`
      endet dank W03 immer in einem dieser Zustände.
- [ ] Die Auswertung erfolgt zentral in `complete`, `videoMetadataUpdated`,
      `videoMetadataFailed`, `cancel` und nach `reconcile()`. Sie läuft also
      auch dann, wenn die App nur im Hintergrund geweckt wurde.
- [ ] Abgeschlossene Batches werden erst entfernt, nachdem die Mitteilung
      geplant ist, damit ein Prozessende dazwischen keine Mitteilung verliert.

**Mitteilungen:**

- [ ] Die Berechtigung wird im Kontext angefragt, wenn der Benutzer zum ersten
      Mal einen Download startet, nicht beim Appstart. Eine Ablehnung
      beeinträchtigt die Downloads nicht.
- [ ] Mitteilungen gibt es nur pro abgeschlossenem Batch. Einzelne Titel lösen
      keine eigene Mitteilung aus. Beispiele:
  - „Playlist ‚Laufen‘ heruntergeladen: 15 Titel“
  - „Playlist ‚Laufen‘: 12 von 15 Titeln geladen, 3 fehlgeschlagen“
  - „‚Titelname‘ konnte nicht geladen werden“
- [ ] Die Mitteilungskennung entspricht der Batch-Kennung, damit eine spätere
      Aktualisierung desselben Batches die vorherige Mitteilung ersetzt.
- [ ] Ist die App im Vordergrund, unterdrückt der
      `UNUserNotificationCenterDelegate` die Mitteilung, weil der Status dann
      bereits sichtbar ist.
- [ ] Ein Tippen auf die Mitteilung öffnet den Downloads-Bildschirm.
- [ ] Eine Einstellung „Download-Mitteilungen“ (Standard: an) in
      [`SettingsScreen.swift`](../targets/watch/SettingsScreen.swift).
- [ ] Ein Batch, dessen Aufträge vollständig abgebrochen wurden, erzeugt keine
      Mitteilung.
- [ ] **Texte:** Die Watch hat inzwischen `WatchStabilityCopy` mit typisierten
      Schlüsseln, Englisch als Fallback und der Einstellung `uiLanguage`. Die
      Mitteilungstexte sollen diesen Weg nutzen statt eines String Catalogs.
      Ein Catalog würde der Systemsprache folgen und `uiLanguage` ignorieren.
      Dafür braucht die Struktur Interpolation und Pluralformen, etwa über
      Funktionen mit Parametern statt fester Textpaare. Den Typ dabei aus
      `DownloadManager.swift` in eine eigene Datei verschieben. Playlist- und
      Titelnamen werden nicht übersetzt.

## Phase 5: Prüfung

**Isolierte Logikprüfung.** Die Watch hat weiterhin kein Testtarget. Native
Prüffälle laufen über den Node-Test-Runner mit `swiftc` auf macOS
(`test/helpers/watchNative.mjs`):

- [x] `test/watch-download-recovery.test.mjs`: Neustart mit Zwischendatei,
      fehlender Task, fehlgeschlagene Verbuchung, Zeitlimit des
      Hintergrundhandlers, einmaliger Neustart verlorener Tasks, Fehlertexte,
      altes `queue.json` ohne `restartedIDs` und Verdrahtung von Start,
      Vordergrund und Hintergrundereignissen.
- [x] `test/watch-download-stability.test.mjs`: Verspätete Audio- und
      Coverabschlüsse nach Abbruch, Löschung und Neustart desselben Titels.
- [ ] Batch-Abschluss, Mitteilungstext (inklusive Pluralformen beider Sprachen)
      und das Laden eines alten `queue.json` ohne Batches.

**Entwicklerhilfe.**

- [x] [`DevTests.swift`](../targets/watch/DevTests.swift) enthält den Eintrag
      „Terminate process“ (Developer Tools → Dev Tests), der nach einer
      Bestätigung `exit(0)` aufruft. Anders als das Wischen im App-Umschalter
      beendet das die App so, wie es das System tut; Hintergrundtransfers
      laufen dabei weiter. Nur in Debug-Builds (`#if DEBUG`) vorhanden.

**Szenarien auf einer echten Apple Watch** (noch keines auf dem Gerät geprüft):

| Szenario                                                 | Erwartetes Verhalten                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Playlist-Download starten, App im Vordergrund lassen     | Fortschritt sichtbar, keine Mitteilung, alle Titel geladen.                                           |
| Playlist-Download starten, Handgelenk senken             | Titel werden im Hintergrund fertig; eine Mitteilung fasst das Ergebnis zusammen.                      |
| Download starten, dann „Terminate process“               | Nach dem Wecken bzw. Neustart werden die Dateien übernommen; Mitteilung erscheint.                    |
| Download starten, Playlist während des Downloads löschen | Audio und Cover werden abgebrochen; kein Titel taucht wieder auf; keine Mitteilung.                   |
| Download mit abgelaufenem Link, iPhone nicht erreichbar  | Nach Zeitlimit und drei Versuchen Fehler „Zeitüberschreitung“; Batch-Mitteilung nennt den Fehler.     |
| iPhone-App startet gerade (`metadata_not_ready`)         | Watch fragt nach drei Sekunden erneut; Download startet, sobald das iPhone bereit ist.                |
| Einzelne Titel scheitern (z. B. HTTP 403)                | Mitteilung nennt Anzahl der Fehler; Downloads-Bildschirm zeigt verständlichen Grund und Wiederholung. |
| Download vom iPhone anstoßen, Watch-App im Hintergrund   | Download startet über den `watchConnectivity`-Hintergrundhandler.                                     |
| Download läuft, Datenbank nicht lesbar (W09)             | Zwischendateien bleiben erhalten; nach erfolgreicher Wiederherstellung werden sie übernommen.         |
| Mitteilungsberechtigung abgelehnt                        | Downloads funktionieren unverändert, ohne Mitteilung.                                                 |
| Update von einer Version mit SDDownloadManager           | Alte, noch laufende Tasks der Bibliothek gehen verloren; betroffene Titel erneut laden.               |

Zu prüfen ist dabei auch, wie stark watchOS große Hintergrundtransfers ohne
Ladegerät oder WLAN verzögert. Das bestimmt, wie lange ein Batch realistisch
offen bleibt.

## Reihenfolge und nächste Schritte

1. Geräteprüfung der bereits umgesetzten Szenarien (ohne Mitteilungen) mit der
   Entwicklerhilfe „Terminate process“. Erst damit ist W05 auf watchOS
   bestätigt.
2. Phase 4: zuerst Batches samt Persistenz und Abschlusserkennung, dann
   Mitteilungen, Einstellung und Texte.
3. Abschließend die Geräteszenarien mit Mitteilungen.

## Offene Punkte

- Beim Update von der Version mit SDDownloadManager gehen laufende Downloads
  einmalig verloren, weil die Sessionkennung wechselt. Eine Übernahme lohnt
  sich nicht, weil die alte Bibliothek sie ohnehin nicht zuordnen konnte.
- Ob aus den isolierten `swiftc`-Prüfungen ein dauerhaftes Watch-Testtarget
  werden soll, wird weiterhin separat entschieden.
