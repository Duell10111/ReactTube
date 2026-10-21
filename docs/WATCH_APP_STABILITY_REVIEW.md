# Watch-App: Stabilitätsprüfung

Prüfdatum: 21. Oktober 2026 (überarbeitet am 22. Oktober 2026: W03–W06)  
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
| W05 | Hoch               | Hintergrunddownloads gehen nach Prozessneustart verloren       | Codeanalyse, Bibliotheksquelltext und -dokumentation           |
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

Auch eine eintreffende Antwort beendet den Wartezustand nicht in jedem Fall:

- Der zweite Zweig von `saveVideoResponse`
  ([YoutubeAPI.swift](../targets/watch/YoutubeAPI.swift), Zeilen 127–128) speichert
  eine Antwort ohne Stream-Daten, ruft aber `videoMetadataUpdated` nicht auf.
- `enqueue` prüft nicht, ob die ID bereits in `awaitingMetadata` steht. Wiederholte
  Aufrufe senden deshalb doppelte Anfragen an das iPhone.
- Scheitert auf dem iPhone `decipher`, fehlt `downloadURL` in der Antwort
  ([WatchYoutubeAPI.ts](../src/hooks/watchSync/WatchYoutubeAPI.ts), Zeile 294).
  `addDownloadData` ([DBUtils.swift](../targets/watch/DBUtils.swift), Zeilen
  104–119) behält dann die alte, abgelaufene `downloadURL`, setzt aber ein neues
  `validUntil`. `enqueue` und `downloadVideo` halten den veralteten Link dadurch
  für gültig; der Download scheitert anschließend mit einem HTTP-Fehler, dessen
  Ursache im UI falsch zugeordnet ist.

**Auswirkung:** Ein Titel bleibt als wartend sichtbar, ohne einen abschließenden
Fehlerzustand zu erreichen. Eine erneute Verbindung allein startet keinen
koordinierten Wiederholungsversuch.

**Vorschlag:** Metadatenanfragen mit Anfragekennung, Zeitlimit und expliziten
Erfolgs- beziehungsweise Fehlerantworten versehen. Wiederholungen begrenzen,
identische Anfragen zusammenfassen und bei wiederhergestellter Verbindung erneut
prüfen. Im UI zwischen fehlender Verbindung und endgültigem Fehler unterscheiden.
Jede Antwort, auch eine unvollständige, muss den Wartezustand auflösen. Eine
fehlende `downloadURL` in einer Antwort muss die gespeicherte URL invalidieren,
statt sie zu behalten.

## W04: Löschaktionen lassen Downloadaufträge weiterlaufen

**Code:** [LibraryView.swift](../targets/watch/LibraryView.swift), Zeilen 125–133;
[PlaylistListView.swift](../targets/watch/PlaylistListView.swift), Zeilen 36–39;
[DBUtils.swift](../targets/watch/DBUtils.swift), Zeilen 315–335, 370–394 und 454–467;
[DownloadManager.swift](../targets/watch/DownloadManager.swift), Zeilen 53–69,
123–149, 162–184 und 224–226;
[RemoteLibraryCommands.swift](../targets/watch/RemoteLibraryCommands.swift),
Zeilen 275–289 und 311–321.

Das lokale Löschen einer Playlist, das Entfernen ihres letzten Verweises auf
einen Titel und das Leeren der Datenbank koordinieren sich nicht durchgängig mit
laufenden Downloadaufträgen. Der Audio-Abschluss verarbeitet weiterhin das
erfasste `Video` und ruft bei Erfolg `addDownloadData` auf. Diese Funktion legt
einen fehlenden Eintrag neu an und hängt ihn wieder an jede Playlist, deren
`videoIDs` die ID noch enthalten.

Auch die Pfade, die `DownloadManager.cancel(ids:)` aufrufen (Remote-Löschen einer
Playlist, `freeVideos`, `deleteDownload`), brechen nur den Audio-Download ab. Der
parallel gestartete Cover-Download wird ohne Schlüssel gestartet
(`_ = SDDownloadManager.shared.downloadFile(...)`) und ist dadurch nicht
abbrechbar. Sein Abschluss ruft `receiveFileUploadImage` und damit ebenfalls
`addDownloadData` auf und liest `video.durationMillis` vom erfassten, inzwischen
gelöschten Modell. Nur `clearDownloads` erfasst über `cancelAll` auch die
Cover-Downloads.

**Auswirkung:** Ein gelöschter Titel kann wieder auftauchen oder ein verspäteter
Abschluss greift auf ein bereits gelöschtes Modell zu. Das betrifft alle
Löschpfade außer `clearDownloads`; die genaue Auswirkung hängt vom Zeitpunkt des
Abschlusses ab.

**Vorschlag:** Löschen über einen gemeinsamen Ablauf koordinieren: benötigte IDs
ermitteln, betroffene Aufträge abbrechen, verspätete Rückmeldungen entwerten und
erst danach Dateien und Modelle entfernen. Geteilte Titel anderer Playlists
erhalten. Laufende Playerreferenzen ebenfalls berücksichtigen. Auch die Schlüssel
der Cover-Downloads speichern und beim Abbrechen berücksichtigen. Abschlüsse sollen
nur mit der Video-ID arbeiten, nicht mit dem erfassten Modell, und einen fehlenden
Eintrag nicht neu anlegen.

## W05: Hintergrunddownloads gehen nach Prozessneustart verloren

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

Der Quelltext der eingebundenen Bibliothek (SDDownloadManager, Revision
`4cbd4468947b3f6226cfb17f16024248df81f678`, `SDDownloadManager.swift`) zeigt, dass
das Problem über eine bloße Zustandsabweichung hinausgeht:

- Ein abgeschlossener Task wird über `_ongoingDownloads[key]` zugeordnet; der
  Schlüssel ist die Anfrage-URL. Dieses Dictionary liegt nur im Speicher. Nach
  einem Prozessneustart ist es leer, und `didFinishDownloadingTo` kehrt ohne
  Verarbeitung zurück (Zeilen 200–205). Die temporäre Datei wird danach vom
  System verworfen.
- `urlSessionDidFinishEvents` ruft `backgroundCompletionHandler` auf (Zeilen
  281–292). Die Watch-App setzt diesen Handler nicht. Der
  `.backgroundTask(.urlSession)`-Handler kehrt sofort zurück, ohne die
  Hintergrundsession neu aufzubauen oder auf die Ereignisse zu warten.

**Auswirkung:** Ein Download, der nach einer vom System veranlassten
Prozessbeendigung abgeschlossen wird, geht nach dieser Codeanalyse
verloren. Der Titel bleibt nicht heruntergeladen und erhält keinen Fehlerzustand.
Dieses Szenario wurde nicht auf einem Gerät getestet.

**Vorschlag:** Downloadaufträge samt Video-ID, Status und Task-Zuordnung
persistieren. Beim Start vorhandene URLSession-Aufgaben und gespeicherte Dateien
abgleichen. Hintergrundarbeit bis zur tatsächlichen Verarbeitung der Ereignisse
offenhalten. Da die Bibliothek abgeschlossene Tasks ohne bekannten Schlüssel
verwirft, ist dafür entweder eine Anpassung der Bibliothek (Patch oder Fork) oder
ein eigener `URLSessionDownloadDelegate` nötig. Den Fall einer systembedingten
Prozessbeendigung getrennt von einem bewussten Beenden durch den Benutzer testen.

## W06: Fortsetzen übernimmt Position oder Playlist-Zuordnung falsch

**Code:** [MusicPlayerManager.swift](../targets/watch/MusicPlayerManager.swift),
Zeilen 98–103, 124–145, 152–169, 288–297 und 319–324.

Ist der gespeicherte Titel nicht spielbar, wählt `queueIndex` einen anderen
verfügbaren Titel. `pendingSeek` enthält nur eine Zeitposition und wird ohne
Abgleich der Video-ID auf den Player angewendet. Dadurch kann der nächste Titel
beispielsweise direkt bei 123 Sekunden starten.

Beim Playlistwechsel werden außerdem `currentPlaylistID` und
`currentPlaylistTitle` der neuen Playlist gesetzt, bevor `setupPlayer` den alten
Player abbaut. `currentVideo` stammt zu diesem Zeitpunkt noch aus den alten
`playerPlaylistItems`. `deinitPlayer` speichert dadurch zwischenzeitlich die alte
Video-ID mit der neuen Playlist-Zuordnung.

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
| Playlist oder Datenbank während eines Downloads löschen           | Betroffene Downloads einschließlich Cover werden abgebrochen; verspätete Rückmeldungen legen nichts neu an.                      |
| iPhone liefert eine Videoantwort ohne `downloadURL`               | Der Wartezustand endet; ein veralteter Download-Link wird nicht weiterverwendet.                                                 |
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

## Umsetzung und Nachprüfung

Die folgenden Nachprüfungen beziehen sich auf die jeweilige Umsetzung. Native
Prüffälle laufen auf macOS mit Originalmethoden und Testdoubles. Der watchOS-
Typecheck prüft alle Swift-Dateien mit dem watchOS-SDK und den vorhandenen
Swift-Package-Modulen; er ersetzt keinen Geräte- oder vollständigen Xcode-Build.

- **W01 behoben:** Player und PlaylistManager sind MainActor-isoliert;
  SwiftData-Prüfungen verwenden keine Hintergrundqueue mehr. Ereignisse sind an
  die Playersitzung gebunden, Audioaktivierungen zusätzlich an die letzte
  Wiedergabeaktion. Regressionstest bestätigt: Pause und Sitzungswechsel
  entwerten einen verspäteten Start; der aktuelle Start funktioniert weiterhin.
  watchOS-Typecheck und `npm test` (498 Tests) bestanden. Projektweites ESLint
  meldet bereits im Ausgangsstand 630 Fehler und 832 Warnungen; die neuen
  Testdateien werden separat geprüft.

- **W02 behoben:** Metadatenantworten ergänzen ausschließlich die aktuelle
  Warteschlange in ihrer gewählten Reihenfolge. Ein leerer Start wird nachgeholt;
  Pause und Playlistwechsel bleiben wirksam. Stream-Gültigkeit wird beim
  Titelwechsel und vor dem Start erneut geprüft; abgelaufene Playeritems werden
  nach der Antwort ersetzt. Native Regressionen prüfen Reihenfolge, aktive
  Position, leeren Start und verspätete Antworten nach Pause/Wechsel.

- **W03 behoben:** Videoanfragen werden zusammengefasst, mit Kennung versehen
  und nach jeweils 20 Sekunden höchstens dreimal versucht. Wiederverbindung
  prüft offene Anfragen erneut; alte Antworten werden verworfen. Das iPhone
  antwortet auch bei fehlenden Daten oder Exceptions. Unvollständige Antworten
  lösen den Download-Wartezustand in einen Fehler auf; fehlende Download-URLs
  löschen den alten Link. Regressionen prüfen Erfolg, Fehler, Zusammenfassung,
  Timeout, Wiederverbindung und veraltete Antworten. `npm test` (503 Tests),
  Typecheck und Plattformprüfung bestanden; watchOS-Typecheck ebenfalls.

- **W04 behoben:** Lokale und entfernte Löschpfade brechen Audio-, Cover- und
  Metadatenaufträge vor dem Entfernen exklusiver Titel ab. Geteilte Titel
  bleiben erhalten. Playerreferenzen werden vor Modell-/Dateilöschung
  freigegeben. Abschlüsse verwenden unveränderliche IDs und eine
  Auftragsgeneration und aktualisieren nur vorhandene Modelle. Der native
  Regressionstest liefert alte Audio-/Coverabschlüsse nach Abbruch, Löschung
  und Neustart desselben Titels: keine Datei und kein Modell werden angelegt;
  aktuelle Abschlüsse funktionieren. `npm test` (505 Tests), Typecheck,
  Plattformprüfung und watchOS-Typecheck bestanden.

- **W05 behoben (Code und isolierte Nachprüfung):** Die Watch verwendet einen
  eigenen URLSessionDownloadDelegate statt SDDownloadManager. Aufträge mit
  Video-ID, Generation und Taskkennung sowie Warteschlange/Fehler werden atomar
  gespeichert. Delegate-Dateien werden vor Rückkehr aus dem Callback dauerhaft
  zwischengespeichert und erst nach Datei-/Datenbankspeicherung freigegeben.
  Appstart gleicht Journal, Systemtasks, Zwischendateien und lokale Audiodateien
  ab. Der SwiftUI-Hintergrundhandler wartet auf verarbeitete Sessionereignisse.
  Native Regressionen prüfen Neustart, fehlenden Task, fehlgeschlagene
  Verbuchung, erneute Verarbeitung und verspäteten Abschluss nach Abbruch.
  `npm test` (507 Tests), Typecheck, Plattformprüfung und watchOS-Typecheck
  bestanden. Systembedingte Prozessbeendigung und Hintergrundlaufzeit müssen
  zusätzlich auf einer echten Watch geprüft werden; dies wurde hier nicht
  als Geräteerfolg verifiziert.

- **W06 behoben:** Fortsetzungspositionen enthalten die Video-ID, gelten nur
  für denselben aktuellen Titel und werden gegen dessen Dauer begrenzt. Ein
  normaler Start verwirft alte Seek-Wünsche. Der alte Wiedergabestand wird
  vor Änderung der Playlist-Metadaten gespeichert. Native Regressionen prüfen
  Playlist-Zuordnung, Ersatztitel, passende Position, Überlänge und ungültige
  Zahlenwerte. `npm test` (508 Tests), Typecheck, Plattformprüfung und
  watchOS-Typecheck bestanden.

- **W07 behoben:** Der Abbau entfernt Listener und Fernsteuerungsbefehle,
  pausiert/leert den Player, gibt seine Instanz frei und setzt Queue, Cover,
  Position und Seek-Wunsch zurück. `setupPlayer` meldet Erfolg; nur eine
  erfolgreich eingerichtete Queue startet. Eine Playlist mit ausstehenden
  Streamdaten behält lediglich den Startwunsch für W02. Der native
  Regressionstest wechselt von einem Titel zu einer leeren Playlist und prüft
  freigegebene Instanz, leere Queue und unveränderte Anzahl von Startaufrufen.
  `npm test` (509 Tests), Typecheck, Plattformprüfung und watchOS-Typecheck
  bestanden.

- **W08 behoben:** Home-Elemente verwenden typisierte Schlüssel (`video:` /
  `playlist:`) und gesetzte ID-Felder. Es gibt keinen optionalen ODER-Vergleich
  mehr. Inkonsistente alte Home-Caches werden beim Datenbankstart verworfen;
  Videos und Playlists bleiben erhalten. Ein echter SwiftData-In-Memory-Test
  prüft zwei Videos, zwei Playlists, gleiche IDs über Typgrenzen, wiederholtes
  Aktualisieren und die Bereinigung eines alten Cacheeintrags. `npm test`
  (510 Tests), Typecheck, Plattformprüfung und watchOS-Typecheck bestanden.
