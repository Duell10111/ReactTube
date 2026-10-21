# Watch-App: Stabilitätsprüfung

Prüfdatum: 21. Oktober 2026  
Geprüfter Stand: `e4b57b3e317829cd1feb1d04321949b563324903`  
Umfang: native Watch-App unter `targets/watch/` und zugehörige
iPhone-Kommunikation unter `src/hooks/watchSync/` und
`src/context/WatchLibraryContext.ios.tsx`.

Diese Prüfung dokumentiert Fehler und Stabilitätsrisiken sowie Vorschläge für
deren Behebung. Die Anwendung wurde dabei nicht verändert. Die Befunde beruhen
auf Codeanalyse, vorhandenen Node-Tests und isolierten Swift-Prüffällen auf macOS.
Ein vollständiger watchOS-Build oder ein Test auf einer echten Watch erfolgte
nicht. Risiken für Abstürze oder Verhalten im Hintergrund sind deshalb nicht als
auf watchOS reproduzierte Abstürze zu verstehen.

## Übersicht

| ID  | Priorität          | Befund                                                         | Nachweis                                                       |
| --- | ------------------ | -------------------------------------------------------------- | -------------------------------------------------------------- |
| W01 | Hoch               | Konkurrierende Player- und SwiftData-Zugriffe                  | Codeanalyse                                                    |
| W02 | Hoch               | Neue Stream-Links erreichen die laufende Wiedergabeliste nicht | Codeanalyse                                                    |
| W03 | Hoch               | Downloads warten unbegrenzt auf Metadaten                      | Codeanalyse                                                    |
| W04 | Hoch               | Löschaktionen lassen Downloadaufträge weiterlaufen             | Codeanalyse                                                    |
| W05 | Hoch               | Unvollständige Wiederherstellung von Hintergrunddownloads      | Codeanalyse und Bibliotheksdokumentation                       |
| W06 | Mittel             | Fortsetzen übernimmt Position oder Playlist-Zuordnung falsch   | Isolierte Swift-Prüffälle mit Originalmethoden und Testdoubles |
| W07 | Mittel             | Leere Playlist kann den vorherigen Player wiederverwenden      | Codeanalyse; Erhalt der Playerinstanz isoliert bestätigt       |
| W08 | Mittel             | Unterschiedliche Home-Einträge überschreiben sich              | Isolierter SwiftData-Prüffall                                  |
| W09 | Hoch im Fehlerfall | Nicht lesbare Datenbank führt zu wiederholtem Startabbruch     | Codeanalyse                                                    |

Die Code-Verweise und Zeilennummern beziehen sich auf den oben genannten Stand.

## W01: Konkurrierende Player- und SwiftData-Zugriffe

**Code:** [MusicPlayerManager.swift](../targets/watch/MusicPlayerManager.swift),
insbesondere Zeilen 92–119, 172–298 und 509–524;
[DBUtils.swift](../targets/watch/DBUtils.swift), Zeilen 275–299.

`updatePlaylist(playlist:...)` übergibt ein SwiftData-Modell an `queue.async`.
Dort werden Beziehungen gelesen, der Player eingerichtet und beobachtbare
Zustände verändert. Andere Einstiegspunkte, beispielsweise
`updatePlaylist(newPlaylist:)`, Pause, Seek und Player-Rückmeldungen, verwenden
denselben Zustand auf dem Hauptthread. Auch `checkPlaylist` und
`checkVideosForExpiration` lesen SwiftData-Modelle auf einer Hintergrundqueue.

Bei schnellen Playlistwechseln oder gleichzeitigen Synchronisierungs- und
Löschvorgängen können diese Zugriffe kollidieren. Mögliche Folgen sind falsche
Playerzustände und Probleme beim Zugriff auf kontextgebundene Modelle. Ein
konkreter Absturz wurde nicht reproduziert.

Zusätzlich prüft der asynchrone Abschluss von `AVAudioSession.activate` nicht,
ob der Wiedergabewunsch inzwischen durch Pause oder einen Playlistwechsel
überholt wurde.

**Vorschlag:**

- Playersteuerung und Zugriffe auf Modelle des `mainContext` auf dem `MainActor`
  bündeln.
- Für Arbeit außerhalb dieses Actors unveränderliche Werte statt SwiftData-Modelle
  übergeben; bei eigener Datenbankarbeit einen passenden eigenen Kontext verwenden.
- Playerwechsel mit einer Generation beziehungsweise Sitzungskennung versehen.
  Veraltete Ereignisse und Aktivierungsabschlüsse dürfen keinen neueren Zustand
  verändern.

## W02: Neue Stream-Links erreichen die laufende Wiedergabeliste nicht

**Code:** [PlaylistManager.swift](../targets/watch/PlaylistManager.swift),
Zeilen 53–69 und 96–98;
[YoutubeAPI.swift](../targets/watch/YoutubeAPI.swift), Zeilen 117–131;
[MusicPlayerManager.swift](../targets/watch/MusicPlayerManager.swift), Zeilen 186–204.

Beim Aufbau einer Wiedergabeliste werden Titel ohne gültigen Stream-Link
ausgelassen und über `requestVideo` erneut angefordert. Die spätere Antwort
speichert die Metadaten und informiert ausschließlich den `DownloadManager`.
Der laufende Player erhält keine entsprechende Aktualisierung;
`checkForNewVideos` ist noch nicht implementiert.

**Auslöser:** Eine Playlist nach Ablauf der Stream-Links starten, ohne dass ihre
Titel lokal heruntergeladen sind. Die Warteschlange bleibt leer oder enthält nur
einen Teil der Titel, auch wenn anschließend neue Links eintreffen.

**Vorschlag:** Metadatenaktualisierungen auch an die aktuelle Playersitzung melden.
Fehlende Titel geordnet ergänzen und einen ausstehenden Startwunsch fortsetzen.
Dabei einen zwischenzeitlichen Playlistwechsel oder eine Pause berücksichtigen.
Stream-Gültigkeit auch vor einem späteren Titelwechsel erneut prüfen.

## W03: Downloads warten unbegrenzt auf Metadaten

**Code:** [DownloadManager.swift](../targets/watch/DownloadManager.swift),
Zeilen 22–49;
[WatchYoutubeAPI.ts](../src/hooks/watchSync/WatchYoutubeAPI.ts), Zeilen 120–143;
[useWatchSync.ios.tsx](../src/hooks/watchSync/useWatchSync.ios.tsx), Zeilen 95–107.

Ein Download ohne gültige URL landet in `awaitingMetadata`. Dieser Zustand wird
bei einer passenden vollständigen Videoantwort oder durch Abbrechen verlassen.
Ein Zeitlimit und eine automatische Wiederholung fehlen. Auf iPhone-Seite können
fehlende Initialisierung, ein fehlendes HLS-Manifest oder ein Fehler dazu führen,
dass keine Antwort an die Watch zurückgeht.

**Auswirkung:** Ein Titel bleibt als wartend sichtbar, ohne einen abschließenden
Fehlerzustand zu erreichen. Eine erneute Verbindung allein startet keinen
koordinierten Wiederholungsversuch.

**Vorschlag:** Metadatenanfragen mit Anfragekennung, Zeitlimit und expliziten
Erfolgs- beziehungsweise Fehlerantworten versehen. Wiederholungen begrenzen,
identische Anfragen zusammenfassen und bei wiederhergestellter Verbindung erneut
prüfen. Im UI zwischen fehlender Verbindung und endgültigem Fehler unterscheiden.

## W04: Löschaktionen lassen Downloadaufträge weiterlaufen

**Code:** [LibraryView.swift](../targets/watch/LibraryView.swift), Zeilen 125–133;
[PlaylistListView.swift](../targets/watch/PlaylistListView.swift), Zeilen 36–39;
[DBUtils.swift](../targets/watch/DBUtils.swift), Zeilen 315–335, 370–394 und 454–467;
[DownloadManager.swift](../targets/watch/DownloadManager.swift), Zeilen 123–149.

Das lokale Löschen einer Playlist, das Entfernen ihres letzten Verweises auf
einen Titel und das Leeren der Datenbank koordinieren sich nicht durchgängig mit
laufenden Downloadaufträgen. Der Audio-Abschluss verarbeitet weiterhin das
erfasste `Video` und ruft bei Erfolg `addDownloadData` auf. Diese Funktion kann
einen inzwischen gelöschten Eintrag neu anlegen.

**Auswirkung:** Ein gelöschter Titel kann wieder auftauchen oder ein verspäteter
Abschluss greift auf ein bereits gelöschtes Modell zu. Die genaue Auswirkung
hängt vom Zeitpunkt des Abschlusses ab.

Der Remote-Pfad für das Löschen einer Playlist bricht betroffene Downloads
bereits ab. Auch `clearDownloads` ruft `cancelAll` auf. Die Lücke betrifft die
anderen genannten Löschpfade.

**Vorschlag:** Löschen über einen gemeinsamen Ablauf koordinieren: benötigte IDs
ermitteln, betroffene Aufträge abbrechen, verspätete Rückmeldungen entwerten und
erst danach Dateien und Modelle entfernen. Geteilte Titel anderer Playlists
erhalten. Laufende Playerreferenzen ebenfalls berücksichtigen.

## W05: Unvollständige Wiederherstellung von Hintergrunddownloads

**Code:** [watchApp.swift](../targets/watch/watchApp.swift), Zeilen 33–35;
[DownloadManager.swift](../targets/watch/DownloadManager.swift), Zeilen 19–29 und
119–149.

Downloads werden mit `shouldDownloadInBackground: true` gestartet. Der
`.backgroundTask(.urlSession)`-Handler protokolliert jedoch lediglich die Kennung
und enthält noch einen TODO zur Anbindung des DownloadManagers. Warteschlangen,
Task-Schlüssel und Abschlusszuordnungen liegen ausschließlich im Speicher;
eine Wiederherstellung beim Appstart ist nicht erkennbar.

Die [Dokumentation von SDDownloadManager](https://github.com/SagarSDagdu/SDDownloadManager#downloading-files-in-background)
beschreibt eine zusätzliche Anbindung für den Abschluss von Hintergrundereignissen.
Das dortige AppDelegate-Beispiel ist für iOS geschrieben; die Watch benötigt eine
passende watchOS-/SwiftUI-Integration.

**Risiko:** Nach einer vom System veranlassten Prozessbeendigung passen
weiterlaufende Systemdownloads und der neu initialisierte Appzustand nicht mehr
zusammen. Dieses Szenario wurde nicht auf einem Gerät getestet.

**Vorschlag:** Downloadaufträge samt Video-ID, Status und Task-Zuordnung
persistieren. Beim Start vorhandene URLSession-Aufgaben und gespeicherte Dateien
abgleichen. Hintergrundarbeit bis zur tatsächlichen Verarbeitung der Ereignisse
offenhalten. Den Fall einer systembedingten Prozessbeendigung getrennt von einem
bewussten Beenden durch den Benutzer testen.

## W06: Fortsetzen übernimmt Position oder Playlist-Zuordnung falsch

**Code:** [MusicPlayerManager.swift](../targets/watch/MusicPlayerManager.swift),
Zeilen 98–103, 124–145, 152–169, 288–297 und 319–324.

Ist der gespeicherte Titel nicht spielbar, wählt `queueIndex` einen anderen
verfügbaren Titel. `pendingSeek` enthält nur eine Zeitposition und wird ohne
Abgleich der Video-ID auf den Player angewendet. Dadurch kann der nächste Titel
beispielsweise direkt bei 123 Sekunden starten.

Beim Playlistwechsel werden außerdem die neue Playlist-ID und der neue Titel
gesetzt, bevor `setupPlayer` den alten Player abbaut. `deinitPlayer` speichert
dadurch zwischenzeitlich die alte Video-ID mit der neuen Playlist-Zuordnung.

Beide Zustandsfehler wurden mit extrahierten Originalmethoden und Testdoubles in
einem isolierten Swift-Prüffall bestätigt:

```text
TEARDOWN_PROBE retainsOldPlayer=true, savedTrack=old-title, savedPlaylist=new-playlist
RESUME_PROBE requested=expired-title, actual=next-title, seek=123.0
```

**Vorschlag:** Ausstehende Position als Paar aus Video-ID und Zeit speichern und
nur beim passenden aktuellen Titel anwenden. Bei einem Ersatztitel bei null
beginnen oder auf den angeforderten Titel warten. Den alten Fortsetzen-Zustand
vor dem Austausch der Playlist-Metadaten speichern. Positionen gegen die bekannte
Titeldauer begrenzen.

## W07: Leere Playlist kann den vorherigen Player wiederverwenden

**Code:** [MusicPlayerManager.swift](../targets/watch/MusicPlayerManager.swift),
Zeilen 172–188, 288–298 und 473–481.

`deinitPlayer` pausiert den Player, setzt `player` aber nicht auf `nil` und leert
`playerPlaylistItems` nicht. Bei einer anschließend ausgewählten leeren Playlist
kehrt `setupPlayer` vorzeitig zurück. Der Aufrufer führt trotzdem `playMusic`
aus. Dessen Prüfung sieht weiterhin die Einträge des vorherigen Players.

**Auswirkung:** Statt einer leeren Wiedergabeliste kann erneut die alte
Warteschlange gestartet werden. Der Erhalt der alten Playerinstanz wurde im
isolierten Prüffall bestätigt; ein vollständiger Audiotest erfolgte nicht.

**Vorschlag:** Beim Abbau Player, Listener und Warteschlangenzustand vollständig
zurücksetzen. Die Einrichtung soll Erfolg oder Misserfolg zurückgeben; nur bei
erfolgreicher Einrichtung anschließend starten.

## W08: Unterschiedliche Home-Einträge überschreiben sich

**Code:** [DBUtils.swift](../targets/watch/DBUtils.swift), Zeilen 229–265;
[DBData.swift](../targets/watch/DBData.swift), Zeilen 87–101.

Die Suche nach einem vorhandenen Home-Eintrag verwendet
`$0.videoID == videoID || $0.playlistID == playlistID` mit jeweils einem optionalen
Suchwert. Der Vergleich des nicht verwendeten Feldes mit `nil` kann fremde
Einträge treffen. Zusätzlich werden die Felder `videoID` und `playlistID` beim
Anlegen nicht gesetzt, obwohl spätere Suchvorgänge darauf beruhen.

Ein isolierter Prüffall mit den Originalmodellen, der Originalfunktion und einem
SwiftData-In-Memory-Container bestätigte den Fehler. Nach dem Hinzufügen von
`video-a` und `video-b` existierte nur ein Home-Eintrag:

```text
HOME_PROBE count=1, sameObject=true, id=video-a, video=video-b, storedVideoID=nil
```

**Vorschlag:** Nach dem konkreten Typ und der zugehörigen nicht leeren ID suchen,
beispielsweise über getrennte Suchpfade für Video und Playlist. Die ID-Felder
setzen und vorhandene inkonsistente Cache-Einträge neu aufbauen. Auch gleiche
IDs über unterschiedliche Elementtypen hinweg berücksichtigen.

## W09: Nicht lesbare Datenbank führt zu wiederholtem Startabbruch

**Code:** [DataController.swift](../targets/watch/DataController.swift), Zeilen 31–38;
[watchApp.swift](../targets/watch/watchApp.swift), Zeile 29.

Scheitert die Erstellung des persistenten `ModelContainer`, beendet `fatalError`
die App unmittelbar. Eine dauerhaft beschädigte oder inkompatible Datenbank
kann dadurch jeden Start verhindern. Die Wartungsoberfläche ist in diesem Fall
nicht mehr erreichbar.

**Vorschlag:** Den Startzustand explizit als ladend, bereit oder fehlgeschlagen
abbilden. Bei Fehlern Diagnose und Wiederholungsversuch anbieten. Eine gezielte
Wiederherstellung beziehungsweise ein vom Benutzer bestätigtes Zurücksetzen
ermöglichen, ohne die bestehende Datenbank automatisch zu löschen. Schemaänderungen
mit gespeicherten Daten vorheriger Versionen testen.

## Durchgeführte Prüfungen und Grenzen

- `node --test test/watch-library-protocol.test.mjs test/watch-playlist-merge.test.mjs`:
  **59 Tests bestanden**, keine Fehler. Diese Tests prüfen die TypeScript-Seite
  des Protokolls und die Playlist-Zusammenführung, nicht die native Playerlogik.
- `npm test`: **454 erfolgreich, vier fehlgeschlagene Testdateien**. Die vier
  Dateien konnten wegen fehlender Abhängigkeiten nicht regulär laufen:
  - `test/apple-build.test.mjs`: `@expo/plist` fehlt.
  - `test/database-recovery.test.mjs`: `drizzle-orm` fehlt.
  - `test/siri-build-availability.test.mjs`: `typescript` fehlt.
  - `test/siri-config-plugin.test.mjs`: `glob` fehlt.
- Isolierter SwiftData-Prüffall auf macOS: W08 bestätigt.
- Isolierte Swift-Prüffälle mit extrahierten Player-Originalmethoden und
  Testdoubles: W06 sowie der Erhalt der Playerinstanz aus W07 bestätigt.
- Die temporären Prüffälle lagen unter `/private/tmp/reacttube-watch-review/`
  und sind keine dauerhaft eingebundenen Regressionstests.
- Xcode 27.1 war vorhanden. Der Simulator war über `simctl` nicht erreichbar
  (`CoreSimulatorService connection became invalid`, `Connection refused`).
  Im Worktree fehlten außerdem das generierte Xcode-Projekt und installierte
  npm-Abhängigkeiten. Ein vollständiger Watch-Build wurde nicht durchgeführt.
- Es wurden keine Quellcodedateien geändert. Lint und Typecheck wurden für diese
  reine Prüfung nicht ausgeführt.

## Empfohlene Umsetzung und Regressionstests

Zuerst W01–W05 beheben: Playerzugriffe serialisieren, den Metadatenkreislauf
abschließen sowie Downloadabbruch und Wiederherstellung zuverlässig machen.
Anschließend W06–W09 mit gezielten Regressionstests absichern.

| Szenario                                                          | Erwartetes Verhalten                                                                                                             |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Mehrfach schnell Playlist wechseln, dann Pause drücken            | Nur die letzte Sitzung bleibt gültig; ein alter Aktivierungsabschluss startet nichts neu.                                        |
| Playlist mit ausschließlich abgelaufenen Links starten            | Metadaten werden nachgeladen; die aktuelle Startabsicht wird korrekt fortgesetzt oder verständlich als fehlgeschlagen angezeigt. |
| iPhone während einer Metadatenanfrage nicht erreichbar            | Wartestatus bleibt nachvollziehbar; Zeitlimit und erneute Verbindung führen zu einem kontrollierten Folgeversuch.                |
| Playlist oder Datenbank während eines Downloads löschen           | Betroffene Downloads werden abgebrochen; verspätete Rückmeldungen legen nichts neu an.                                           |
| Display während eines Downloads ausschalten                       | Hintergrundabschluss wird verarbeitet; Datei und Datenbankzustand stimmen überein.                                               |
| System beendet die Watch-App während eines Downloads              | Beim nächsten Start werden Aufträge, Systemtasks und vorhandene Dateien abgeglichen.                                             |
| Flugmodus, WLAN-Abbruch oder Bluetooth-Ausfall während Wiedergabe | Playerzustand bleibt korrekt; es gibt einen begrenzten Wiederanlauf oder einen verständlichen Fehler.                            |
| Gespeicherten Titel fortsetzen, der momentan nicht spielbar ist   | Eine Ersatzwiedergabe erhält nicht dessen gespeicherte Zeitposition.                                                             |
| Nach laufender Wiedergabe eine leere Playlist auswählen           | Die vorherige Warteschlange startet nicht erneut.                                                                                |
| Zwei Videos und zwei Playlists in den Home-Cache aufnehmen        | Jeder Eintrag bleibt eigenständig und verweist auf das passende Modell.                                                          |
| Datenbank lässt sich nicht öffnen                                 | Die App zeigt einen erreichbaren Fehler- und Wiederherstellungszustand statt einer Startabsturzschleife.                         |

Die Hintergrund-, Verbindungs- und Audio-Routing-Szenarien sollten auf einer
echten Apple Watch geprüft werden; die isolierten macOS-Prüffälle ersetzen diese
Tests nicht.
