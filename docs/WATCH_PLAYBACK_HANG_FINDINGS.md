# Apple Watch: Hänger beim Abspielen und nicht abspielbare Downloads

Stand: 23. Oktober 2026, Branch `watch-stability` (HEAD `545bd8c`). Diese
Untersuchung behandelt zwei Symptome der nativen Watch-App:

1. Die App hängt sich auf, wenn ein nicht heruntergeladener Titel mit gültigem
   (nicht abgelaufenem) Stream abgespielt werden soll.
2. Heruntergeladene Titel lassen sich nicht mehr abspielen.

Es wurde nichts am Code geändert.

## Ergebnis und Aussagekraft

| ID  | Befund                                                                              | Nachweis                                  | Symptom     |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------- | ----------- |
| H01 | Deadlock in SwiftAudioEx zwischen Queue-Lock und `AVPlayerWrapper.stateQueue`       | **Bestätigt** durch zwei Watchdog-Reports | 1 (und 2)   |
| H02 | Synchroner `asset.duration`-Zugriff bei HLS-Streams verlängert das Deadlock-Fenster | Codeanalyse                               | 1           |
| H03 | Der Fix `c6407e1` behebt H01 nicht; der CI-Builder baut ihn nicht einmal mit        | Report-Symbolik, DerivedData              | 1           |
| P01 | Application Context vom iPhone bricht den lokalen Start still ab                    | Codeanalyse, auf dem Gerät noch zu prüfen | 2 (und 1)   |
| P02 | Titel mit `durationMillis == 0` werden bei Sekunde 0 abgeschnitten                  | Codeanalyse                               | 2           |
| P03 | Das erste `currentItem`-Event der Queue geht verloren                               | Codeanalyse                               | Nebenbefund |

Das Hängen ist eindeutig belegt. Die Ursache der nicht abspielbaren Downloads ist
nicht durch Gerätelogs belegt. P01 ist der wahrscheinlichste Kandidat, P02 ein
zusätzlicher Fehlerpfad. Der Abschnitt „Nächste Schritte“ beschreibt, wie sich
beides auf dem Gerät eingrenzen lässt.

## Quellen

Vom gekoppelten iPhone wurden mit `xcrun devicectl device copy from
--domain-type systemCrashLogs` die weitergeleiteten Reports der Watch geladen
(`ProxiedDevice-9b67…/`):

| Report                           | Build                                           | Ergebnis                         |
| -------------------------------- | ----------------------------------------------- | -------------------------------- |
| `RT-Watch-2026-10-22-220557.ips` | Debug, `RT-Watch.debug.dylib` UUID `1A70D617-…` | `0x8BADF00D`, Watchdog nach 10 s |
| `RT-Watch-2026-10-21-201928.ips` | älterer Build (noch mit `music.player.queue`)   | `0x8BADF00D`, Watchdog nach 10 s |

Der Report vom 22.10. passt per UUID zum lokalen Build in
`DerivedData/reacttube-hgsexrtoqqlvicagqjdwgynumuyy/Build/Products/Debug-watchos`
(gebaut am 22.10. um 19:47, SwiftAudioEx `c6407e1`) und ließ sich mit `atos`
vollständig symbolisieren. Für den Report vom 21.10. liegt kein passender Build
mehr vor. Er zeigt aber dasselbe Muster.

Die übrigen Reports aus diesem Zeitraum (Jetsam, `mediaremoted`, `apsd`) haben
keinen Bezug zu RT-Watch.

## H01: Deadlock zwischen Queue-Lock und `stateQueue` (bestätigt)

**Priorität:** Kritisch. **Nachweis:** symbolisierter Watchdog-Report.

Symbolisierter Stack vom 22.10. (gekürzt):

```text
Thread 0 (main) – wartet in dispatch_sync
  AVPlayerWrapper.state.getter            AVPlayerWrapper.swift:61   stateQueue.sync
  AVPlayerWrapper.load()                  AVPlayerWrapper.swift:235  if (state == .failed)
  AVPlayerWrapper.load(from:…)            AVPlayerWrapper.swift:326/353
  AudioPlayer.load(item:playWhenReady:)   AudioPlayer.swift:216
  QueuedAudioPlayer.onCurrentItemChanged  QueuedAudioPlayer.swift:210
  QueueManager.skip(direction:wrap:)      QueueManager.swift:177     delegate inside the lock
  QueueManager.synchronize                QueueManager.swift:31      holds recursiveLock
  QueueManager.next(wrap:)                QueueManager.swift:190
  QueuedAudioPlayer.next()                QueuedAudioPlayer.swift:110
  MusicPlayerManager.nextTrack()          MusicPlayerManager.swift:751
  ActionButton (Weiter-Button)            MusikPlayer.swift:52

Thread 2 (AVPlayerWrapper.stateQueue, Barrier-Block) – wartet auf NSRecursiveLock
  QueueManager.synchronize                QueueManager.swift:29      recursiveLock.lock()
  QueueManager.current.getter             QueueManager.swift:87
  QueuedAudioPlayer.currentItem.getter    QueuedAudioPlayer.swift:28
  AudioPlayer.setTimePitchingAlgorithmForCurrentItem()
  AudioPlayer.AVWrapper(didChangeState:)
  closure in AVPlayerWrapper.state.setter AVPlayerWrapper.swift:73   barrier block
```

Der Ablauf ist eine klassische Lock-Order-Inversion innerhalb von SwiftAudioEx:

1. Ein Zustandswechsel (`.loading` oder `.ready`) setzt `state` über
   `stateQueue.async(flags: .barrier)`. Im Barrier-Block ruft
   `AudioPlayer.AVWrapper(didChangeState:)` den Getter `currentItem` auf, der den
   `QueueManager`-Lock braucht.
2. Gleichzeitig hält der Main-Thread diesen Lock. `QueueManager.skip` ruft
   `delegate?.onCurrentItemChanged()` **innerhalb** von `synchronize` auf
   (`QueueManager.swift:160–193`). Darüber lädt `AVPlayerWrapper.load()` den
   nächsten Titel und liest `state`, also `stateQueue.sync`.
3. Der Main-Thread wartet auf die Barrier, die Barrier wartet auf den Lock des
   Main-Threads. Nach 10 Sekunden beendet watchOS die App (`0x8BADF00D`).

Dieselbe Konstellation (Delegate-Aufruf bei gehaltenem Queue-Lock, danach
`stateQueue.sync`) gibt es an mehreren Stellen:

- `next()` und `previous()`: Buttons, Fernbedienung und Steuerzentrale.
- **Automatischer Titelwechsel am Ende eines Titels:**
  `QueuedAudioPlayer.AVWrapperItemDidPlayToEndTime()` ruft `queue.next(wrap:)`
  auf. Das betrifft also auch normales Durchhören ohne Benutzereingabe.
- `items.didSet` → `onReceivedFirstItem()` → `jump(to: 0)` → Laden, wenn Titel in
  eine leere Queue eingefügt werden (`add`, `add(_:at:)` und
  `replaceCurrentItem` bei `currentIndex == -1`).

Der Deadlock tritt nur auf, wenn in diesem Moment ein Zustandswechsel auf der
`stateQueue` läuft oder wartet, der `currentItem` liest (`.loading`/`.ready`).
Bei Streams ist das deutlich häufiger als bei lokalen Dateien. Siehe H02.

Der Report vom 21.10. stammt noch aus der Zeit vor W01 (`7b2fa7f`) und zeigt
dasselbe Bild: Main-Thread und `music.player.queue` hängen in `dispatch_sync`
(gleiche Rücksprungadresse wie der `state`-Getter), die `stateQueue` wartet auf
einen Lock. Der Fehler ist also nicht durch den Stabilitäts-Branch entstanden.
Seit W01 läuft aber die gesamte Player-Steuerung auf dem Main-Thread. Ein
Deadlock legt deshalb immer die UI lahm und löst den Watchdog aus.

## H02: Synchrones `asset.duration` bei HLS-Streams

**Priorität:** Hoch. **Nachweis:** Codeanalyse.

Das iPhone liefert als `streamURL` seit `cd9db6c` das HLS-Manifest
(`resolveStreamingSource(..., {mode: "youtube-hls"})` in
`src/hooks/watchSync/WatchYoutubeAPI.ts`). Gestreamte Titel sind auf der Watch ein
einfacher `Track` ohne `EndTiming` (`PlaylistManager.swift:125`).

`AudioPlayer.AVWrapper(didChangeState:)` ruft bei `.ready`, `.loading`,
`.playing` und `.paused` im Barrier-Block `updateNowPlayingPlaybackValues()` auf.
Das liest `wrapper.duration` (`AVPlayerWrapper.swift:115–130`):

- Für heruntergeladene Titel (`TrackEndtime`) ist `forwardPlaybackEndTime` gesetzt
  und die Abfrage endet sofort.
- Für Streams ist `forwardPlaybackEndTime` ungültig. Dann folgt ein
  **synchroner** Zugriff auf `currentItem?.asset.duration`. Das `AVPlayerItem`
  lädt automatisch nur `playable`. Bei einem HLS-Asset kann dieser Zugriff
  blockieren, bis die Playlist über das Netz geladen ist.

Das hat zwei Folgen:

- Jede `state`-Abfrage auf dem Main-Thread (`play()`, `pause()`,
  `playbackActive`, `load()`, die `print("Player state: …")`-Zeilen in
  `MusicPlayerManager.playMusic/pauseMusic`) wartet so lange mit.
- Bei Streams wechselt `playbackLikelyToKeepUp` beim Puffern häufig, was
  zusätzliche `.ready`-Barriers erzeugt. Das Zeitfenster für H01 ist dadurch
  viel größer. Drückt man während eines anlaufenden Streams auf „Weiter“ (oder
  endet ein Titel, während der nächste puffert), ist der Deadlock
  wahrscheinlich.

Das erklärt, warum das Hängen vor allem bei nicht heruntergeladenen Titeln
auftritt, obwohl deren Stream gültig ist. Mit Ablaufen hat es nichts zu tun.

## H03: Der Fix `c6407e1` reicht nicht und fehlt im CI-Build

**Priorität:** Mittel. **Nachweis:** Report-Symbolik und
`SourcePackages/workspace-state.json`.

- `c6407e1` („release queue lock when a queue operation throws“) im Fork
  `Duell10111/SwiftAudioEx` (`watchos-support-add-crop`) behebt den Fall, dass
  ein werfender Queue-Aufruf den Lock nicht freigibt. Der Report vom 22.10.
  stammt aus einem Build **mit** diesem Fix. H01 ist ein anderer Fehler und
  bleibt bestehen.
- Der CI-Builder (`DerivedData/reacttube-firiumjqrxdnezfrgrtyarfctxzi`,
  Workspace `…/frozenfaces/reacttube-builder/…`, zuletzt am 22.10. um 19:13)
  hat SwiftAudioEx noch auf `ce0c6d7` aufgelöst. Builds von dort enthalten auch
  den Lock-Fix nicht. Branch-Abhängigkeiten werden über die gecachte
  `Package.resolved` nicht automatisch aktualisiert.

## P01: Application Context vom iPhone bricht den lokalen Start ab

**Priorität:** Hoch. **Nachweis:** Codeanalyse. Auf dem Gerät noch nicht
reproduziert.

Betroffene Stellen:

- [`SessionSync.swift`](../targets/watch/SessionSync.swift):
  `session(_:didReceiveApplicationContext:)`, Zeilen 142–155.
- [`MusicPlayerManager.swift`](../targets/watch/MusicPlayerManager.swift):
  `applyPhonePlaybackState`, Zeilen 640–663, und `playMusic`, Zeilen 705–717.

Ablauf:

1. `playMusic()` startet `AVAudioSession.activate`. `isPlaying` bleibt `false`,
   bis der Callback kommt. Das kann dauern, vor allem wenn watchOS erst den
   Bluetooth-Kopfhörer verbinden oder die Routenauswahl zeigen muss.
2. Kommt in diesem Zeitfenster ein Application Context vom iPhone an, greift die
   Bedingung `type == .phone || !isPlaying`. `applyPhonePlaybackState` erhöht
   `playbackRevision` und setzt `type = .phone`.
3. Der Activation-Callback prüft seit W01
   `guard revision == playbackRevision, type == .local` und verwirft den Start
   **ohne Log**. Vor W01 hat der Callback in jedem Fall `player?.play()`
   aufgerufen.
4. Danach steht der Player im Telefonmodus. Der Play-Button schickt nur noch
   `PhonePausePlay` ans iPhone (`playMusic` → `pausePlayOnPhone()`), und der
   Titel der Watch wird durch den Telefon-Titel ersetzt. Lokal wird nichts mehr
   abgespielt, bis erneut ein Titel aus der Liste gestartet wird.

Warum der Context gerade beim Start oft kommt: Das iPhone setzt den Context in
`src/hooks/watchSync/useWatchSync.ios.tsx` bei jeder Änderung von Titel,
Wiedergabestatus und `installed`. Startet man auf der Watch eine Playlist, fordert
`PlaylistManager.getFirstBatchOfAvailable()` Metadaten für fehlende oder
abgelaufene Titel an. Das kann die iPhone-App im Hintergrund wecken. Beim Start
der JS-Umgebung wechselt `installed` und ein neuer Context geht raus. Ob
WatchConnectivity einen unveränderten Context erneut zustellt, ist nicht geprüft.

Das betrifft heruntergeladene Titel genauso wie Streams. Für Downloads ist es der
naheliegendste Grund für „lässt sich nicht abspielen“: Es gibt keine
Fehlermeldung, keinen Log-Eintrag, und der Play-Button scheint wirkungslos.

## P02: Downloads mit `durationMillis == 0` enden sofort

**Priorität:** Mittel. **Nachweis:** Codeanalyse.

Heruntergeladene Titel werden als `TrackEndtime` mit
`endTiming = CMTime(value: durationMillis / 1000, timescale: 1)` abgespielt
(`PlaylistManager.swift:116`). SwiftAudioEx setzt daraus
`forwardPlaybackEndTime`. Bei `durationMillis == 0` endet das Item bei Sekunde 0,
der Player springt sofort weiter und am Ende der Queue passiert nichts.

So kann ein Download die Dauer 0 bekommen:

- `addDownloadData` überschreibt bei gesetztem `fileURL` die Dauer
  **ohne Prüfung auf > 0** (`DBUtils.swift:94–97`).
  `RemoteLibraryCommands.handleReceivedVideoFile` übergibt `0`, wenn das iPhone
  weder `durationMillis` noch `duration` mitsendet
  (`RemoteLibraryCommands.swift:102–111`; auf dem iPhone lässt
  `getStoredDurationMillis` das Feld bei fehlender Dauer weg). Damit wird auch
  eine bereits bekannte, korrekte Dauer gelöscht.
- Platzhalter aus `upsertPlaylist`/`downloadVideos` ohne Dauer behalten 0, bis
  eine Metadatenantwort kommt.

Die Bulk-Aktualisierung aus `2bbf8de` repariert solche Einträge zwar
(`MetadataRefresher.isIncomplete` prüft `durationMillis <= 0`), aber nur bei
erreichbarem iPhone und nur nach manuellem Auslösen.

## P03: Das erste `currentItem`-Event geht verloren

**Priorität:** Niedrig. **Nachweis:** Codeanalyse.

`setupPlayer()` fügt die Titel ein (`MusicPlayerManager.swift:356`), bevor der
Listener registriert wird (Zeile 370). `Event.emit` und `addListener` laufen
beide asynchron auf derselben seriellen Queue. Das Event für den ersten Titel
wird also abgearbeitet, bevor es einen Listener gibt.
`handleAudioPlayerCurrentItemChange` läuft für den Starttitel daher nicht, wenn
nicht gesprungen wird. Für diesen Titel fehlen Lautstärkenormalisierung,
`validateCurrentStream`, Resume-State und das Cover in der Player-Ansicht. Die
Ursache für die beiden Symptome ist das nicht, es verfälscht aber Beobachtungen
beim Testen.

## Geprüft und ausgeschlossen

- **Pfade der Downloads:** Alte (`/ID/audio.m4a`) und neue (`ID/audio.mp4`)
  relative `fileURL`-Werte werden von `DownloadManager.restore()` und
  `PlaylistManager.getPlayerItem` korrekt aufgelöst (mit `swiftc` geprüft).
- **Dateiformat der Watch-Downloads:** `chooseFormat({type: "audio", quality:
"best"})` filtert in youtubei.js standardmäßig auf `mp4`
  (`FormatUtils.js:129`). Gespeichert wird also AAC/MP4 und kein Opus/WebM.
- **ArtworkCache:** Lädt asynchron und blockiert den Main-Thread nicht.
- **Ablauf des Streams:** Spielt für das Hängen keine Rolle. Der Deadlock hängt
  am Zustandswechsel des Players, nicht an `validUntil`.

## Empfohlene Korrekturen

1. **SwiftAudioEx-Fork (behebt H01):**
   - In `QueueManager.skip`, `next`, `previous` und im `items.didSet`-Pfad den
     Wechsel nur innerhalb des Locks merken und
     `delegate?.onCurrentItemChanged()` / `onReceivedFirstItem()` **erst nach
     `unlock`** aufrufen (so wie es `jump`, `removeItem` und `clearQueue` schon
     tun).
   - Im Setter von `AVPlayerWrapper.state` den Delegate nicht im Barrier-Block
     aufrufen. Den neuen Zustand in der Barrier setzen und den Delegate danach
     asynchron (z. B. auf `.main`) benachrichtigen.
   - Einen Regressionstest ergänzen, der `next()` auf einem Thread mit einem
     gleichzeitigen `.ready`-Zustandswechsel kombiniert.
2. **SwiftAudioEx-Fork (H02):** `duration` nicht synchron über
   `asset.duration` lesen. Stattdessen `currentItem.duration` verwenden oder
   `duration` in `automaticallyLoadedAssetKeys` aufnehmen.
3. **CI-Builder (H03):** Die SwiftPM-Auflösung für SwiftAudioEx aktualisieren
   (`Package.resolved` bzw. `SourcePackages` neu auflösen) oder die Abhängigkeit
   in `expo-target.config.js` auf einen Commit statt auf einen Branch pinnen.
4. **Application Context (P01):** Einen eingehenden Context nur dann in den
   Telefonmodus übernehmen, wenn das iPhone tatsächlich spielt (`playing ==
true`) und keine lokale Wiedergabe gewünscht ist (`wantsPlayback == false`).
   Einen verworfenen Activation-Callback per `WatchLog` protokollieren.
5. **Dauer (P02):** In `addDownloadData` nur `duration > 0` übernehmen und
   `TrackEndtime` nur bei `durationMillis > 0` erzeugen, sonst einen `Track` ohne
   Endzeit.
6. **Listener-Reihenfolge (P03):** Listener in `setupPlayer()` vor
   `player.add(items:at:)` registrieren.

## Nächste Schritte zur Bestätigung auf dem Gerät

- **H01:** Einen Stream starten und während der ersten Sekunden mehrfach
  „Weiter“ drücken. Nach einem Hänger den neuen Report mit `devicectl … copy
from --domain-type systemCrashLogs` holen und mit `atos` gegen
  `RT-Watch.debug.dylib` symbolisieren.
- **P01:** Vorübergehend im Activation-Callback von `playMusic` einen
  `WatchLog`-Eintrag schreiben, wenn `revision`/`type` nicht passen, und in
  `applyPhonePlaybackState` den bisherigen `type` und `wantsPlayback` loggen.
  Dann bei geschlossener iPhone-App einen heruntergeladenen Titel aus einer
  Playlist mit abgelaufenen Titeln starten und den Diagnosebildschirm prüfen.
- **P02:** Auf dem Diagnosebildschirm bzw. per Datenbankexport die
  heruntergeladenen Titel mit `durationMillis == 0` zählen.
