# Apple Watch: Fehlende Cover

Stand: 22. Oktober 2026. Diese Untersuchung dokumentiert mögliche Ursachen für
fehlende Cover in der nativen Watch-App.

**Umsetzungsstand:** C01 bis C04 sind in Commit `f912d8a` auf dem Branch
`watch-stability` umgesetzt. C04 ist dabei nur teilweise gelöst (siehe unten).
Die Änderungen sind durch TypeScript-Tests und einen `swiftc`-Typecheck aller
Watch-Quellen gegen das watchOS-Simulator-SDK abgesichert. Ein Test auf einer
echten Apple Watch steht noch aus.

## Ergebnis und Aussagekraft

Es gibt mehrere voneinander unabhängige Fehlerpfade. Besonders relevant sind
fehlende Wiederholungsversuche beim Laden von Online-Covern und das Überschreiben
lokaler Cover-Verweise durch Metadaten-Aktualisierungen.

Die Untersuchung umfasst Codeanalyse sowie isolierte Swift- und
TypeScript-Prüfungen. Die Swift-Prüfungen führten die betroffenen Methoden mit
einer temporären SwiftData-Datenbank und temporären Dateien aus. Sie prüften
Dateiverweise und Zustandsänderungen, nicht das Dekodieren echter Bilddaten.
Gerätelogs oder eine Reproduktion auf der betroffenen Apple Watch liegen nicht
vor. Welche Ursache dort den größten Anteil der Ausfälle erklärt, bleibt offen.

## C01: Online-Cover erhalten nach Verbindungsfehlern keinen erneuten Versuch

**Priorität:** Hoch. **Nachweis:** Codeanalyse und Apple-Dokumentation;
Verbindungsverhalten auf dem Gerät noch zu prüfen.

Betroffene Stellen:

- [`ArtworkCache.swift`](../targets/watch/ArtworkCache.swift): Sessionkonfiguration
  und `image(for:isLocal:completion:)`.
- [`VideoCoverView.swift`](../targets/watch/VideoCoverView.swift):
  `CoverImageView`, `.task(id: cover?.url)` und `loadCover()`.

Der Bildlader verwendet eine Standard-`URLSession`, aktiviert aber
`waitsForConnectivity` nicht. Ist zum Startzeitpunkt keine Verbindung verfügbar,
kann die Anfrage sofort fehlschlagen. Apple beschreibt dieses Verhalten und das
Warten auf eine Verbindung ausdrücklich für
[Standard- und ephemere Anfragen unter watchOS](https://developer.apple.com/documentation/watchos-apps/making-default-and-ephemeral-requests).

Nach einem Fehler liefert der Cache `nil`. Solange die Ansicht bestehen bleibt
und die Cover-URL gleich bleibt, löst eine wieder verfügbare Verbindung keinen
neuen Ladeversuch aus. Das Platzhalterbild kann daher sichtbar bleiben, obwohl
die Watch inzwischen wieder Internetzugang hat.

Zusätzlich ignoriert der Bildlader den HTTP-Status. Wenn die Antwort kein
dekodierbares Bild enthält, wird dies ohne Transportfehler nicht protokolliert.
Das erschwert die Unterscheidung zwischen Verbindungsproblemen, HTTP-Fehlern und
Bildformatproblemen.

**Empfohlene Korrektur:** Auf verfügbare Konnektivität warten, begrenzte
Wiederholungsversuche vorsehen und beim erneuten Aktivieren der App fehlende
Cover nachladen. HTTP-Status und Dekodierfehler mit ausreichend Kontext
protokollieren.

**Umsetzung (umgesetzt):**

- `ArtworkCache` aktiviert `waitsForConnectivity` und begrenzt die Wartezeit
  über `timeoutIntervalForResource` auf 60 Sekunden.
- `CoverImageView` versucht ein fehlgeschlagenes Online-Cover nach 5 und nach
  20 Sekunden erneut. Lokale Cover werden nicht wiederholt, weil eine fehlende
  Datei durch Warten nicht entsteht. Wird die App wieder aktiv und fehlt ein
  Cover noch, startet ein neuer Ladeversuch.
- Transportfehler, HTTP-Status außerhalb von 2xx und nicht dekodierbare
  Bilddaten werden getrennt mit Host, Dateiname und gegebenenfalls Datenmenge
  protokolliert.

## C02: Metadaten-Aktualisierungen überschreiben lokale Cover-Verweise

**Priorität:** Hoch. **Nachweis:** Im isolierten Swift-Test reproduziert.

Betroffene Stellen:

- [`DBUtils.swift`](../targets/watch/DBUtils.swift): `addDownloadData(...)`.
- [`YoutubeAPI.swift`](../targets/watch/YoutubeAPI.swift): `saveVideoResponse(...)`
  und `savePlaylistResponse(...)`.

`addDownloadData(...)` übernimmt jedes übergebene `coverURL` bedingungslos. Eine
Metadaten-Antwort mit einer Internet-URL kann dadurch einen vorhandenen lokalen
Cover-Pfad ersetzen. Auch Playlist-Antworten verwenden diese Methode.

Reproduzierter Ablauf:

1. Ein heruntergeladener Titel verweist auf `probe/cover.png`.
2. Die Datei liegt im Download-Verzeichnis.
3. Eine Metadaten-Aktualisierung liefert `https://example.test/remote.jpg`.
4. Der gespeicherte Cover-Verweis wird durch diese URL ersetzt.
5. Die lokale Cover-Datei existiert weiterhin, wird über den gespeicherten
   Verweis aber nicht mehr verwendet.

Damit benötigt ein heruntergeladener Titel für sein Cover wieder Internetzugang.
Ohne Verbindung oder bei C01 bleibt das Cover leer, obwohl die lokale Datei
vorhanden ist.

**Empfohlene Korrektur:** Vorhandene, lesbare lokale Cover bei reinen
Metadaten-Aktualisierungen erhalten. Lokalen Dateipfad und entfernte Cover-URL
gegebenenfalls getrennt speichern, damit ein Fallback möglich bleibt.

**Umsetzung (umgesetzt):** `addDownloadData(...)` übernimmt eine neue
Cover-Angabe nur noch über `shouldReplaceCover(...)`. Eine Internet-URL ersetzt
keinen lokalen Cover-Pfad mehr, solange dessen Datei existiert. Lokale Pfade
(etwa ein vom iPhone übertragenes Cover) ersetzen weiterhin jede bisherige
Angabe. Eine getrennte Speicherung von lokalem Pfad und entfernter URL ist nicht
umgesetzt, weil sie eine Änderung am SwiftData-Schema erfordert.

## C03: Nach dem Entfernen eines Downloads bleiben ungültige Cover-Pfade zurück

**Priorität:** Mittel. **Nachweis:** Im isolierten Swift-Test reproduziert.

Betroffene Stellen:

- [`DownloadManager.swift`](../targets/watch/DownloadManager.swift):
  `complete(job:file:error:)` speichert relative Cover-Pfade ohne führenden Slash.
- [`DBUtils.swift`](../targets/watch/DBUtils.swift): `deleteDownloadedVideo(...)`.
- [`MetadataRefresher.swift`](../targets/watch/MetadataRefresher.swift):
  `isIncomplete(_:)`.

Cover werden beispielsweise als `videoId/cover.png` gespeichert. Beim Entfernen
des Downloads wird das gesamte Verzeichnis des Titels gelöscht. Der Cover-Verweis
wird allerdings nur dann zurückgesetzt, wenn er mit `/` beginnt.

Reproduzierter Ablauf:

1. Der Titel verweist auf `probe/cover.png`.
2. Der Download wird entfernt; die Cover-Datei wird dabei gelöscht.
3. Der gespeicherte Verweis bleibt `probe/cover.png`.
4. Die Ansicht versucht weiterhin, diese nicht mehr vorhandene Datei zu laden.

Der Metadaten-Check prüft nur, ob `coverURL` fehlt, nicht ob eine referenzierte
lokale Datei existiert. In einer separaten Prüfung wurde der Titel bei gesetztem
Download-Status und ansonsten vollständigen Metadaten deshalb nicht als
unvollständig erkannt, obwohl seine Cover-Datei fehlte.

**Empfohlene Korrektur:** Lokale Cover-Pfade unabhängig vom führenden Slash
erkennen und beim Löschen bereinigen. Bei Reparaturprüfungen auch die Existenz
lokaler Cover-Dateien berücksichtigen.

**Umsetzung (umgesetzt):**

- `deleteDownloadedVideo(...)` erkennt lokale Cover über
  `isLocalCoverPath(...)` unabhängig vom führenden Slash und setzt den Verweis
  zurück.
- `MetadataRefresher.isIncomplete(_:)` prüft mit `isCoverUsable(...)`, ob eine
  referenzierte lokale Cover-Datei existiert.
- Beim Empfang einer Videodatei vom iPhone und beim Playlist-Abgleich wird ein
  Cover jetzt auch dann ergänzt, wenn der vorhandene lokale Verweis ins Leere
  zeigt.

Nach dem Entfernen eines Downloads hat der Titel kein Cover mehr, bis neue
Metadaten eintreffen, da die ursprüngliche Internet-URL nicht separat
gespeichert ist (siehe C02).

## C04: Verknüpfte lokale Playlists übertragen fehlende Cover nicht vollständig

**Priorität:** Mittel. **Nachweis:** Verhalten der Metadaten-Erzeugung im
isolierten TypeScript-Test bestätigt; Gesamtablauf auf dem Gerät noch zu prüfen.

Betroffene Stellen:

- [`useLinkedPlaylists.ts`](../src/hooks/watchSync/useLinkedPlaylists.ts):
  `loadPhonePlaylist(...)` liest Cover-Pfade aus der lokalen iPhone-Datenbank.
- [`WatchLibraryProtocol.ts`](../src/hooks/watchSync/WatchLibraryProtocol.ts):
  `createUpsertPlaylistArgs(...)`.
- [`WatchLibraryContext.ios.tsx`](../src/context/WatchLibraryContext.ios.tsx):
  `sendVideoFile(...)` überträgt lokale Cover separat zusammen mit Videodateien.

Beim Playlist-Abgleich gelangen ausschließlich Cover-URLs mit `http://` oder
`https://` in die Metadaten. Lokale Pfade wie `videoId/cover.jpg` werden
herausgefiltert. Diese dürfen nicht unverändert auf der Watch verwendet werden,
weil sie auf Dateien des iPhones zeigen. Der Playlist-Metadatenabgleich selbst
überträgt dafür aber keine Ersatzdatei.

Die separate Cover-Übertragung ist an das Senden einer Videodatei gekoppelt.
Eine reine Playlist-Verknüpfung garantiert daher kein verfügbares Cover für einen
Titel mit lokalem iPhone-Cover. Ein späterer Video-Dateitransfer oder eine
Metadaten-Anfrage kann das Bild über einen anderen Weg bereitstellen.

Zusätzlich sendet `createUpsertPlaylistArgs(...)` Metadaten nur für Titel, die im
Watch-Snapshot noch nicht bekannt sind. Ein bereits bekannter Titel mit fehlendem
Cover erhält bei späteren Playlist-Abgleichen keine aktualisierten
Cover-Metadaten.

Im TypeScript-Test bestätigt:

- Ein lokaler Cover-Pfad wird aus den übertragenen Metadaten entfernt.
- Eine entfernte HTTPS-Cover-URL wird für einen unbekannten Titel übernommen.
- Ein bereits bekannter Titel wird auch bei fehlendem Cover aus der
  Metadatenliste ausgeschlossen.

**Empfohlene Korrektur:** Fehlende Cover bekannter Titel gezielt ergänzen. Für
lokale iPhone-Cover einen eigenen Dateiübertragungsweg oder eine verfügbare
entfernte Ersatz-URL vorsehen.

**Umsetzung (teilweise umgesetzt):**

- `createUpsertPlaylistArgs(...)` sendet für bekannte Titel ohne Cover im
  Watch-Snapshot einen Eintrag mit `id` und `coverUrl`. Unbekannte Titel
  erhalten wie bisher die vollständigen Metadaten.
- `getWatchCoverUrl(...)` liefert für lokale iPhone-Cover und fehlende Cover das
  YouTube-Vorschaubild `https://i.ytimg.com/vi/<id>/hqdefault.jpg` als
  entfernte Ersatz-URL.
- Die Watch übernimmt diese URL nur, wenn sie kein verwendbares eigenes Cover
  hat. Auch heruntergeladene Titel mit lokalem Watch-Cover erscheinen im
  Snapshot ohne `coverUrl` und erhalten deshalb die URL. Die Watch ignoriert sie
  in diesem Fall.

Offen:

- Das Vorschaubild ist ein Video-Thumbnail, kein quadratisches Musik-Cover. Ein
  eigener Übertragungsweg für lokale iPhone-Cover ist nicht umgesetzt.
- Ein Playlist-Abgleich wird nur gesendet, wenn sich Titel oder Reihenfolge der
  Playlist ändern. Fehlende Cover bekannter Titel werden daher erst beim
  nächsten solchen Abgleich ergänzt.

## Umsetzungsstand und ausstehende Prüfung

| Finding | Status              | Commit    |
| ------- | ------------------- | --------- |
| C01     | Umgesetzt           | `f912d8a` |
| C02     | Umgesetzt           | `f912d8a` |
| C03     | Umgesetzt           | `f912d8a` |
| C04     | Teilweise umgesetzt | `f912d8a` |

Ausgeführte Prüfungen: `npm test` (inklusive neuer Tests für
`createUpsertPlaylistArgs(...)` und `getWatchCoverUrl(...)`), `npm run typecheck`,
ESLint und Prettier für die geänderten TypeScript-Dateien sowie ein
`swiftc -typecheck` aller Dateien in `targets/watch/` gegen das
watchOS-Simulator-SDK. Ein Xcode-Build des Schemas `RT-Watch` war nicht möglich,
weil das generierte `ios/`-Projekt neuere Watch-Dateien noch nicht enthält.

Noch ausstehend:

1. Auf der Watch mit iPhone-Verbindung, eigenem WLAN und gegebenenfalls Mobilfunk
   prüfen. Zusätzlich Offline-Betrieb, Wiederverbindung, Metadaten-Aktualisierung,
   Playlist-Abgleich sowie Entfernen und erneutes Laden eines Downloads testen.

Für Bildformatfehler oder fehlerhafte YouTube-Cover-URLs liegt aus dieser
Untersuchung kein konkreter Nachweis vor. Die mit C01 ergänzten Bildlade-Logs
unterscheiden HTTP- und Dekodierfehler jetzt. Betroffene Beispiel-URLs aus
Gerätelogs werden für eine Bewertung weiterhin benötigt.
