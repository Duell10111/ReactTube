# Plan: Phone-Musikplayer auf `@rntp/player` migrieren

## Ausgangslage

- Die Phone-Oberfläche und die Playlistlogik sind vorhanden, aber alle Aufrufe von
  `react-native-track-player` in `MusicPlayerContext.tsx`, `MusicInit.ts` und
  `MusicService.ts` sind auskommentiert. Dadurch bewirken Play/Pause/Seek aktuell
  keine Änderung am nativen Playerzustand.
- Das Projekt erfüllt die technischen Grundvoraussetzungen von `@rntp/player`:
  React Native 0.86, New Architecture und iOS 16.4. `UIBackgroundModes: audio`
  ist bereits in `app.json` gesetzt.
- `useVideoDataGenerator.ts` nutzt die Playback-Fixes bisher nicht: Streaming-Daten
  werden weiterhin fest über `getInfo(..., {client: "IOS"})` geladen. Damit fehlen
  Client-Fallback, die gemessene ungekappt ausgelieferte Quelle und URL-Refresh.
- V5 ist keine kompatible Umbenennung: Queue-, Event-, Hook- und Remote-Control-API
  müssen auf das neue Modell umgestellt werden.
- Die [V5-Lizenz](https://www.rntp.dev/pricing) ist für dieses persönliche,
  nicht-kommerzielle Open-Source-Projekt geklärt und kein Blocker. Falls sich der
  Einsatzzweck später in Richtung kommerzieller Nutzung ändert, ist sie erneut zu
  prüfen.
- TV bleibt außerhalb des Scopes; `MusicPlayerContext.tv.tsx` und
  `MusicInit.tv.ts` bleiben No-ops.

## Zielbild

`MusicPlayerContext` bleibt die fachliche Quelle für YouTube-Playlist, Automix,
Shuffle und Repeat. `@rntp/player` übernimmt auf iOS/Android die eigentliche
Wiedergabe, Audio-Fokus, Sperrbildschirm/Notification und Fortschritt. Für die
erste funktionierende Version hält RNTP genau den aktuell aufgelösten Titel;
eine vollständig native Queue folgt erst, wenn die App alle benötigten Stream-URLs
zuverlässig vorab auflösen kann. Die Stream-Auflösung verwendet dieselbe gehärtete
Grundlage wie der Videoplayer, aber mit einem eigenen Audio-Profil.

## Abgleich mit den Playback-Fixes

| Playback-Fix                                         | Relevanz für Musik  | Geplante Behandlung                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistente Session und serverseitiges `visitorData` | Ja                  | Wird über `useYoutubeContext()` bereits geerbt; bei `LOGIN_REQUIRED` muss auch der Musikpfad die bestehende Selbstheilung auslösen.                                                                                                                                                                                    |
| Anonyme Stream-Session / Auth-Trennung               | Ja, zwingend        | Audio-URLs ausschließlich über die anonyme `classicInnertube`-Instanz laden. Kontoaktionen und personalisierte Metadaten dürfen separat über die angemeldete Instanz laufen, aber deren OAuth-Daten nie in `/player`-Requests gelangen.                                                                                |
| Gemessene Client-Kette                               | Ja, derzeit fehlend | Den festen `IOS`-Abruf in `useVideoDataGenerator.ts` durch eine audio-spezifische Variante von `resolveStreamingSource` ersetzen. Für direkte Audiodateien zuerst einen Client mit vollständiger Byte-Range-Auslieferung (`VISIONOS`) verwenden; sonst können längere Titel nach wenigen hundert KB mit 403 abbrechen. |
| Formatwahl und Deciphering                           | Ja                  | Ein Audio-only-Format bevorzugen (AAC/MP4, Originalsprache, kein DRC sofern nicht gewünscht) und genau dessen URL mit dem Player der anonymen Session entschlüsseln. `decipherMany` ist für einen einzelnen Titel nicht nötig, dieselbe Player-/Cache-Härtung aber schon.                                              |
| Ablaufende Stream-URLs                               | Ja, derzeit fehlend | `expires` in das Musikmodell übernehmen und eine Minute vor Ablauf neu auflösen; Position sowie Play/Pause-Zustand beim Austausch erhalten.                                                                                                                                                                            |
| Fehler-Ladder und Stillstandserkennung               | Ja                  | Bei RNTP-Fehler oder ausbleibendem Fortschritt einmal kontrolliert neu auflösen und anschließend auf eine alternative Audioquelle bzw. YouTube-HLS zurückfallen. End-of-track und Fehler dürfen dabei nicht beide `next()` auslösen.                                                                                   |
| Eigenes Video-HLS (`GeneratedHls`)                   | Nein                | Nicht für Musik wiederverwenden: es erzeugt Video-Varianten und unnötigen Datenverkehr. RNTP erhält primär eine direkte Audio-only-URL; YouTube-HLS bleibt nur Rückfallstufe.                                                                                                                                          |
| SABR                                                 | Später relevant     | Wenn direkte Audioformate verschwinden, muss der geplante SABR-Proxy auch eine reine Audio-Rendition für RNTP anbieten. Die Source-Abstraktion jetzt so schneiden, dass dieser Pfad später ergänzt werden kann.                                                                                                        |
| PoToken und `react-native-video`-`data:`-Patch       | Aktuell nein        | PoToken ist laut Messung kein aktueller Blocker; der `data:`-Patch betrifft den Videoplayer und darf nicht als Voraussetzung für RNTP behandelt werden.                                                                                                                                                                |

## Umsetzung

### 1. Abhängigkeit und Startsequenz

- `@rntp/player` installieren und die aufgelöste Version im Lockfile fixieren;
  danach iOS-Pods bzw. Expo-Native-Projekte neu erzeugen und beide Phone-Builds
  prüfen.
- `MusicInit.ts` mit einem idempotenten `TrackPlayer.setupPlayer(...)` für Musik,
  Audio-Fokus und „headphones disconnected“ reaktivieren. Initialisierung einmal
  im Vordergrund vor dem ersten Player-Aufruf ausführen und Fehler sichtbar loggen.
- `MusicService.ts` auf die V5-Session-/Event-API umstellen. Falls Events unabhängig
  vom React-Baum laufen sollen, einen eigenen Expo-Entry-Point anlegen und die
  Playback-Session vor der App-Registrierung registrieren.

### 2. Gemeinsame Playback-Auflösung und Adapter für Musikquellen

- `PlaybackSource.ts` nicht unverändert wiederverwenden, da seine Annahmekriterien
  aktuell Videoformate verlangen. Eine gemeinsame Resolver-Basis plus Audio-Profil
  (`resolveAudioStreamingSource`) ergänzen: anonyme Session, Audioformat vorhanden,
  vollständige Byte-Ranges bevorzugt, Client-Versuche und `LOGIN_REQUIRED` wie im
  Videopfad protokollieren/behandeln.
- `useVideoDataGenerator.ts` weiter für YouTube-Music-Metadaten und Up-next nutzen,
  die `streaming_data` aber aus diesem Audio-Resolver einsetzen statt fest vom
  `IOS`-Client zu übernehmen. Streamdaten und Konto-/Playlistdaten bleiben damit
  bewusst getrennt.
- Einen kleinen Adapter aus aufgelöster Audioquelle und `YTTrackInfo` zu `MediaItem`
  einführen:
  `id -> mediaId`, Titel, Artist, Cover (`artworkUrl`), Dauer und MIME-Type.
- Die Quelle zentral auflösen: lokale Datei bevorzugen, sonst ein gültiges
  Audio-only-Format samt deciphertem URL verwenden; YouTube-HLS dient als
  Rückfall. Quelle, Client und Ablaufzeit als typisiertes Ergebnis zurückgeben,
  statt später erneut aus `originalData` zu raten.
- Alte V4-Annahmen entfernen (`Track`, `TrackType`, `load`, `artwork`, `type: "hls"`)
  und durch `MediaItem`, `setMediaItem`/`setMediaItems`, `artworkUrl` und `mimeType`
  ersetzen.

### 3. `MusicPlayerContext` wieder anbinden

- Beim Wechsel von `currentVideoData` das Media-Item setzen und erst nach
  erfolgreichem Laden abspielen. Ein Request-/Generation-Token verhindert, dass
  ein langsamer älterer Request einen neu gewählten Titel überschreibt.
- `play`, `pause` und `seek` direkt mit RNTP verbinden. `playing`, Position und
  Dauer aus `useIsPlaying`/`useProgress` ableiten; für den bestehenden Slider die
  Werte zunächst in die vorhandenen Reanimated-`SharedValue`s spiegeln.
- V5-Events verwenden (`PlaybackStateChanged`, `IsPlayingChanged`,
  `MediaItemTransition`, `PlaybackError`). Das Titelende genau einmal an
  `onEndReached` weiterleiten und Fehler inklusive Code/Track protokollieren sowie
  in der UI melden.
- Einen Ablauf-Timer und genau einen kontrollierten Fehler-Retry ergänzen. Beim
  Ersetzen einer abgelaufenen/defekten URL zuerst Position und Play/Pause-Zustand
  sichern, die Quelle neu auflösen, Media-Item ersetzen, zurückseeken und nur bei
  zuvor laufender Wiedergabe fortsetzen. Ein Generation-Token verwirft verspätete
  Refresh-Ergebnisse nach einem Titelwechsel.
- Repeat korrigieren: „Repeat one“ sucht auf Position 0 und startet erneut;
  „Repeat all“, Shuffle, Automix sowie Next/Previous bleiben zunächst in der
  bestehenden JS-Playlistlogik. Den bislang leeren lokalen Downloadpfad ebenfalls
  über denselben Media-Item-Adapter laden.

### 4. Remote Controls und Background Audio

- Die alte `updateOptions`-/`Capability`-Konfiguration durch `setCommands`
  ersetzen. Zuerst Play/Pause und Seek nativ aktivieren.
- Next/Previous sind über `handling: "hybrid"` mit `perCommandHandling` als
  JS-Kommandos freigeschaltet: Play/Pause und Seek laufen weiter nativ, die
  Sprungkommandos beantwortet der `MusicPlayerContext` über `Event.RemoteNext`
  bzw. `Event.RemotePrevious` mit derselben Playlistlogik wie die In-App-Buttons.
- Offen bleibt der Pfad ohne laufende JS-Umgebung (Android Auto, CarPlay und
  weggewischte App bei fortlaufender Wiedergabe). Dafür braucht es weiterhin
  entweder einen prozessweiten Player-Controller mit eigener Queue oder das
  Spiegeln der aufgelösten Titel in die native RNTP-Queue.
- Sperrbildschirm, Notification, Bluetooth/Headset, Audio-Unterbrechungen und
  App-Wechsel auf echten iOS- und Android-Geräten testen. Native Metadaten müssen
  bei jedem Titelwechsel aktualisiert werden.

### 5. Aufräumen und Absicherung

- Auskommentierten V4-Code, ungenutzte Imports und das tote `hlsAudio`-Fragment im
  Screen entfernen; Playerfehler und Lade-/Buffering-Zustand im Context typisieren.
- Unit-Tests für Media-Item-Mapping sowie Next/Previous/Repeat/Shuffle ergänzen.
  Resolver-Tests müssen zusätzlich sicherstellen, dass der Musikpfad nicht wieder
  auf einen festen Client oder die angemeldete Session zurückfällt.
- Für native Wiedergabe einen kleinen manuellen bzw. Maestro-Smoke-Test
  dokumentieren: langer Online-Titel (deutlich über der früheren Byte-Range-Grenze),
  lokaler Titel, Seek, Sperrbildschirm, Netzwechsel, künstlicher 403/abgelaufener
  URL und automatischer Titelwechsel.
- `npm run typecheck` und `npm run lint` ausführen, anschließend Development- und
  Release-Build auf iOS und Android prüfen.

#### Umsetzungsstatus Phase 5 (21. September 2026)

- Playerzustand und Fehler sind im Context typisiert; Full Player und Bottom Bar
  zeigen Laden/Buffering an, ein dauerhafter Fehler bleibt im Full Player sichtbar.
- Media-Item-Mapping, Next/Previous/Repeat/Shuffle und das anonyme Audio-Resolver-
  Profil werden mit `npm test` geprüft. Der Resolver-Test sichert sowohl
  `skipAuth: true` als auch die mehrstufige Client-Ladder ab.
- Der native Geräte-Smoke-Test ist unter
  `docs/MUSIC_PLAYER_NATIVE_SMOKE_TEST.md` dokumentiert.
- Typecheck, Unit-Tests und Lint (keine Fehler; bestehende projektweite Warnungen)
  laufen erfolgreich. Android Debug und Release bauen mit JDK 21 erfolgreich.
- iOS Debug und Release bauen für den Simulator erfolgreich; der Watch-Asset-
  Katalog meldet lediglich ein nicht zugewiesenes altes Icon als Warnung.
- Die Geräte-Smoke-Tests bleiben als manuelle Abnahme auf echter iOS- und
  Android-Hardware offen.

## Abnahmekriterien

- Online- und heruntergeladene Titel starten auf der Phone-Variante; Play/Pause,
  Seek, Next/Previous, Shuffle, Repeat und Automix funktionieren ohne Doppelwechsel.
- Fortschritt, Dauer, Buttonzustand und Metadaten bleiben zwischen Vollansicht,
  Bottom Bar und System-Mediacontrols synchron.
- Audio läuft mit gesperrtem Bildschirm und im Hintergrund weiter und reagiert auf
  Audio-Fokus, Headset sowie die freigegebenen Remote Controls.
- Fehlerhafte oder abgelaufene Streams führen zu einer verständlichen Meldung bzw.
  einem kontrollierten Neuversuch statt zu einem hängenden Player.
- Online-Audio wird über die anonyme Client-Kette bezogen; Anmeldung und
  Kontoaktionen verändern die Abspielbarkeit nicht. Ein langer Track spielt über
  die bisher beobachtete Byte-Range-Grenze hinaus vollständig.
- TV-Verhalten und Videoplayer bleiben unverändert.

## Relevante Referenzen

- [Installation und Plattformvoraussetzungen](https://www.rntp.dev/docs/installation)
- [V5 Quick Start](https://www.rntp.dev/docs/quick-start)
- [Queue/MediaItem API](https://www.rntp.dev/docs/queue)
- [Events und Playback Session](https://www.rntp.dev/docs/events)
