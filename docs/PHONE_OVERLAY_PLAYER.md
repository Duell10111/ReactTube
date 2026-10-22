# Native Overlay Player für Phone und Tablet

Dieses Dokument beschreibt, wie der YouTube-ähnliche Overlay-Player für Phone
und Tablet umgesetzt wurde, was er kann und warum die Lösung so aufgebaut ist.

## Ziel

- Phone und Tablet bekommen, wie die TV-Variante, einen eigenen Overlay-Player
  über dem nativen Video, der optisch dem mobilen YouTube-Player entspricht.
- Die klassischen YouTube-Gesten funktionieren, vor allem das Spulen durch
  Doppeltippen.
- Aktiviert wird er über die **bestehende** Player-Einstellung
  (_Einstellungen ▸ Video-Player_), genau wie auf dem TV. Es gibt keine neue
  Einstellung.

## Aktivierung

| Einstellung „Video-Player“      | TV (unverändert)            | Phone/Tablet (neu)                            |
| ------------------------------- | --------------------------- | --------------------------------------------- |
| Nativ                           | Native AVPlayer-Controls    | Native Controls (bisheriges Verhalten)        |
| Natives Overlay (experimentell) | Eigenes TV-Overlay + Native | **Neues Phone-Overlay + `VideoPlayerNative`** |
| VLC                             | Eigenes TV-Overlay + VLC    | **Neues Phone-Overlay + `VideoPlayerVLC`**    |

Ausgewertet werden dieselben Flags wie auf dem TV:
`appSettings.ownOverlayEnabled || appSettings.vlcEnabled`
(`src/screens/phone/VideoDetailScreen.tsx`).

**Warum auch VLC?** Auf dem TV läuft VLC immer hinter dem eigenen Overlay, weil
VLC keine eigenen Controls hat. Bisher hat der Phone-Screen die VLC-Einstellung
ignoriert und die VLC-Quelle (reiner Video-Stream ohne Ton) über
`react-native-video` abgespielt. Mit dem Overlay verhält sich die Einstellung
jetzt auf allen Oberflächen gleich. `MobileVLCKit` ist laut Podspec für iOS
eingebunden. Auf einem echten Phone ist diese Kombination aber noch nicht
getestet (siehe „Offene Punkte“).

## Funktionen

| Geste / Element                     | Verhalten (wie YouTube)                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Einfaches Tippen                    | Controls ein-/ausblenden                                                                                                        |
| Doppeltippen links / rechts         | 10 s zurück / vor, mit halbrunder „Ripple“-Anzeige und Text „10 Sekunden“                                                       |
| Weitere Taps während der Seek-Kette | Je +10 s (Tap-Tap-Tap = 20 s); Tippen auf die andere Seite dreht die Richtung sofort um                                         |
| Gedrückt halten                     | 2×-Geschwindigkeit, solange der Finger liegt; Pill „2x ⏩“ oben                                                                 |
| Play/Pause in der Mitte             | Nach dem Ende zeigt der Button „Erneut abspielen“                                                                               |
| Roter Fortschrittsbalken            | Ziehen und Antippen springt; zeigt den gepufferten Bereich; dünne Linie auch bei ausgeblendeten Controls                        |
| Kapitel im Balken                   | Der Balken ist an den Kapitelgrenzen mit kleinen Lücken geteilt; das Segment unter dem Finger wird dicker                       |
| Kapiteltitel                        | Neben der Zeit steht `• Kapitelname`, beim Scrubben auch über dem Vorschaubild                                                  |
| Vorschaubilder beim Ziehen          | Beim Scrubben zeigt ein Storyboard-Frame über dem Finger, wohin gesprungen wird, mit Zeit und Kapitel                           |
| Wischen nach oben / unten           | Oben: Vollbild öffnen; unten (im Vollbild): Vollbild verlassen; auch ein schneller kurzer Flick zählt                           |
| Phone drehen                        | Querformat öffnet das Vollbild, Hochformat beendet es (nur Phone; nur echte Drehungen, siehe unten)                             |
| Endscreen-Karten                    | Die Karten des Creators erscheinen ab dem Endscreen-Start an YouTubes Position, sind antippbar und bleiben nach dem Ende stehen |
| Android-Navigationsleiste           | Im Vollbild ausgeblendet (immersiv); ein Wischen vom Rand holt sie vorübergehend zurück                                         |
| Autoplay-Schalter                   | Kleiner Schalter oben rechts (Knopf mit ▶/⏸), kurze Bestätigung „Autoplay ist aktiviert/deaktiviert“; auch im Zahnrad-Menü    |
| Autoplay am Ende                    | „Als Nächstes in 5“ über dem Vorschaubild des nächsten Videos, Titel und Kanal, Play-Button mit ablaufendem Ring, „Abbrechen“   |
| Zeit `1:05 / 10:00`                 | YouTube-Format, ab 1 h `h:mm:ss`                                                                                                |
| Vollbild-Button                     | Phone: Querformat-Vollbild; Tablet: Vollbild ohne erzwungene Drehung                                                            |
| CC-Button                           | Untertitel schnell an/aus (bevorzugte Sprache aus den Einstellungen)                                                            |
| Zahnrad                             | Bottom-Sheet mit Geschwindigkeit, Audiosprache und Untertiteln                                                                  |
| Chevron oben links                  | Player schließen (zurück navigieren)                                                                                            |
| Auto-Hide                           | Controls verschwinden während der Wiedergabe nach 3 s, bei Pause bleiben sie sichtbar                                           |
| Ladeanzeige                         | Spinner beim Laden und Puffern                                                                                                  |
| SponsorBlock, Untertitel-Overlay    | Dieselben Bausteine wie auf dem TV                                                                                              |
| Barrierefreiheit                    | Alle Buttons haben Labels; die Fläche bietet VoiceOver-/TalkBack-Aktionen „10 s zurück/vor“; der Balken ist `adjustable`        |

## Architektur

### Neue Dateien

| Datei                                                    | Aufgabe                                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/video/phone/phoneOverlayGestures.ts`     | Reine Logik ohne React Native: Tap-Zonen, Erkennen von Doppeltipps und Seek-Ketten, Seek-Ziele, Balkenposition ↔ Zeit, Zeitformat |
| `src/components/video/phone/PhoneOverlayPlayer.tsx`      | Overlay-Komponente: Video-Backend, Gesten, Controls, Seek-Ripple, 2×-Pill, Fortschrittsbalken                                      |
| `src/components/video/phone/PhoneVideoSettingsSheet.tsx` | Zahnrad-Menü als Bottom-Sheet (Geschwindigkeit, Audiosprache, Untertitel)                                                          |
| `src/hooks/video/usePlayerFullscreen.ts`                 | Vollbild-Zustand und alles, was zum Screen drumherum gehört                                                                        |
| `src/hooks/video/useSubtitleOptions.ts`                  | Gemeinsame Untertitel-Optionsliste für das TV-Menü und das Phone-Sheet                                                             |
| `src/components/video/phone/PhoneSeekBar.tsx`            | Fortschrittsbalken mit Kapitel-Segmenten, Pufferanzeige, Scrubbing und Storyboard-Vorschau                                         |
| `src/components/video/phone/phoneSeekBarModel.ts`        | Reine Logik: Kapitel-Segmente, Füllstand pro Segment, Position der Vorschau                                                        |
| `src/extraction/storyboard.ts`                           | Reine Logik: passende Storyboard-Stufe auswählen, Sprite-Sheet und Zelle für eine Zeit berechnen                                   |
| `test/ui-phone-overlay.test.mjs`                         | 22 Tests für Gesten, Wischen, Zeitformat, Kapitel-Segmente und Vorschau-Position                                                   |
| `test/extraction-storyboard.test.mjs`                    | 6 Tests für Storyboard-Auswahl und Frame-Berechnung                                                                                |
| `src/components/video/phone/phoneAutoplayModel.ts`       | Reine Logik: ob Autoplay an ist, welches Video als Nächstes kommt und welche Vorschaudaten schon bekannt sind                      |
| `src/components/video/phone/PhoneUpNextOverlay.tsx`      | Autoplay-Bildschirm am Videoende mit Countdown-Ring                                                                                |
| `test/ui-phone-autoplay.test.mjs`                        | 6 Tests für Autoplay-Standard und Auswahl des nächsten Videos                                                                      |
| `src/components/video/phone/phoneRotationModel.ts`       | Reine Logik: Lage des Phones aus der Schwerkraft, Beruhigungszeit, Drehung → Vollbild                                              |
| `test/ui-phone-rotation.test.mjs`                        | 10 Tests für Lage-Erkennung, Beruhigung und Vollbild-Regel                                                                         |

### Geänderte Dateien

- `src/screens/phone/VideoDetailScreen.tsx`: wählt je nach Einstellung Overlay
  oder native Controls, reicht Wiedergabe-Fallback (`reportPlaybackFailure`),
  Startzeit und Fortschritt durch, schaltet Vollbild und rendert das
  Einstellungs-Sheet.
- `src/components/video/VideoPlayerNative.tsx`: optionale Props
  `playInBackground`, `enterPictureInPictureOnLeave` und `ignoreSilentSwitch`
  (der TV lässt sie leer, das TV-Verhalten bleibt also gleich), dazu
  `onBuffer` für den Spinner.
- `src/components/video/videoPlayer/VideoPlayer.tsx`: optionales `onBuffer` im
  gemeinsamen `VideoComponentType`.
- `VideoPlayerSpeed.tsx`: exportiert `PLAYBACK_SPEEDS`, damit TV und Phone
  dieselben Stufen anbieten.
- `VideoPlayerSubtitles.tsx`: nutzt den neuen Hook `useSubtitleOptions`.
- `src/extraction/Types.ts` / `YTElements.ts`: `YTVideoInfo.storyboard`, aus
  `videoInfo.storyboards` extrahiert (nur `PlayerStoryboardSpec`; Livestreams
  haben keine festen Boards).
- `src/hooks/useVideoDetails.ts`: Der bisher TV-only Nachlade-Request
  (`getBasicInfo`) läuft jetzt auch für das Phone-Overlay und übernimmt außer
  dem Endscreen auch das Storyboard.
- `src/hooks/video/usePlayerFullscreen.ts`: verlässt das Vollbild, sobald ein
  anderer Screen darübergeschoben wird.
- `package.json`: neue Abhängigkeit `expo-navigation-bar` (~57.0.3, passend zu
  Expo SDK 57, installiert mit `npx expo install`).
- `src/context/AppDataContext.tsx`: neue Einstellung `autoplayEnabled`
  (nicht gesetzt = an, wie bei YouTube).
- `src/hooks/useVideoDetails.ts`: Die Startzeit wird nur noch für dasselbe
  Video beibehalten (Stream neu laden, geänderte Einstellung). Ein neues Video
  auf demselben Screen startet mit seiner eigenen Zeit statt mit der des
  vorherigen.
- `PhoneVideoSettingsSheet.tsx`: Autoplay-Zeile im Zahnrad-Menü.
- `src/localization/en.ts` / `de.ts`: neue Schlüssel `video.player.*` (Play,
  Pause, Vollbild, Seek-Labels usw.) sowie `video.autoplay*` und
  `video.upNext.in` in beiden Sprachen.

### Warum diese Entscheidungen?

**Eigener Phone-Player statt Wiederverwendung von `videoPlayer/VideoPlayer.tsx`.**
Der TV-Player ist ganz auf Fernbedienung und Fokus ausgelegt (Remote-Events,
Fokus-Wiederherstellung, Endscreen-Browse-Modus, Scrubbing mit gehaltener
Taste). Touch-Gesten dort einzubauen hätte das TV-Verhalten gefährdet. Laut
`AGENTS.md` sind TV- und Phone-Bedienung getrennte Oberflächen. Gemeinsam
genutzt werden deshalb nur die Teile, die wirklich gleich sind: das
`VideoComponentType`-Interface und damit beide Backends
(`VideoPlayerNative` und `VideoPlayerVLC`), `SubtitleOverlay`,
`useSponsorBlock` und `VideoPlayerSettingsContext`.

**Gesten-Logik als reines Modul.** Ob ein Tap ein einfacher Tap, ein Doppeltipp
oder Teil einer Seek-Kette ist, hängt nur von Position, Breite und Zeitstempel
ab. Diese Logik steckt in `interpretTap()` und lässt sich mit dem Node-Testrunner
ohne Gerät testen, wie schon `tvRemoteSeek.ts` auf dem TV. Die Komponente
startet nur noch Timer und Seeks.

**Gestenfläche und Buttons sind Geschwister, nicht verschachtelt.** Ein
Gesture-Recognizer auf einem Eltern-View sieht auch Taps auf Kind-Buttons. Dann
würde jeder Button-Druck zusätzlich die Controls umschalten. Deshalb liegt die
`GestureDetector`-Fläche als eigene Ebene unter der Controls-Ebene
(`pointerEvents="box-none"`). Freie Bereiche reichen Taps nach unten durch,
Buttons fangen sie selbst ab.

**Verzögerter Single-Tap nur an den Seiten.** Ein Tap links oder rechts könnte
die erste Hälfte eines Doppeltipps sein. Deshalb wartet er 300 ms, bevor er die
Controls umschaltet, wie bei YouTube. Ein Tap in der Mitte kann nie spulen und
wirkt sofort. So reagiert die Bedienung nicht träge.

**Seek-Ziel ab dem ersten Tap der Kette.** Die gemeldete Position hinkt einem
Seek hinterher. Würde jeder Tap auf die aktuelle Position aufaddieren, gingen
bei schnellen Ketten Taps verloren (dasselbe Problem wurde auf dem TV mit
`TV_SEEK_CHAIN_WINDOW_MS` gelöst). Darum merkt sich der Player die Position beim
ersten Tap und springt auf `Start ± Summe`. Das Ziel bleibt 1 s vor dem Ende,
damit ein Sprung das Video nicht als „beendet“ zählt.

**`react-native-gesture-handler` statt `PanResponder`.** Die App ist bereits in
`GestureHandlerRootView` eingebettet (`VideoProvider`). `Gesture.Race(LongPress,
Tap)` trennt sauber zwischen Halten (2×) und Tippen, und `Pan` mit
`minDistance(0)` ergibt einen Balken, der auf Antippen und Ziehen reagiert. Die
Callbacks laufen mit `runOnJS(true)`, weil sie React-State setzen.

**Vollbild ohne Remount.** Der bestehende Kommentar im `VideoDetailScreen`
warnt: Wird der Player in einem anderen Zweig gerendert, baut React das native
Video neu auf und die Wiedergabe startet von vorn. Für das Vollbild ändern sich
deshalb nur Styles. Der Player-Container nimmt `flex: 1` statt des
16:9-Verhältnisses, der Feed wird mit `display: "none"` versteckt (bleibt
gemountet und behält seine Scrollposition), und das Split-Layout wird
ausgesetzt.

**`usePlayerFullscreen` kümmert sich um den Screen drumherum.** Er blendet den
Navigation-Header und die Zurück-Wischgeste aus, lässt die Android-Zurücktaste
zuerst das Vollbild verlassen und dreht nur auf dem Phone ins Querformat. Die
vorherige Orientierungssperre (meist die Portrait-Sperre des Home-Screens) wird
vorher gelesen und beim Verlassen wiederhergestellt, damit der Rest der App
nicht plötzlich frei rotiert. `OTHER`/`UNKNOWN` lassen sich nicht an
`lockAsync` zurückgeben und fallen auf Portrait zurück. Tablets drehen nicht
zwangsweise, weil 16:9 dort in beiden Orientierungen Platz hat.

**Einstellungen als Bottom-Sheet statt TV-Routen.** Auf dem TV sind
Geschwindigkeit, Audiosprache und Untertitel eigene transparente Modal-Routen,
die nur für `Platform.isTV` registriert sind. Auf einem Touchscreen öffnet
YouTube ein Sheet über dem weiterlaufenden Video. Das bestehende `SheetPanel`
(wie bei Beschreibung und Kommentaren) liefert dafür das gleiche Aussehen. Die
Werte kommen aus demselben `VideoPlayerSettingsContext`, damit Auswahlen wie die
Untertitelsprache für spätere Videos erhalten bleiben.

**Verhalten des alten Phone-Players bleibt erhalten.** Der native
Phone-Player hatte `playInBackground` (Android), `enterPictureInPictureOnLeave`
(iOS) und `ignoreSilentSwitch="ignore"` (sonst kein Ton bei
Stumm-Schalter). `VideoPlayerNative` reicht diese Werte jetzt optional durch.

**Endscreen und Storyboard kommen aus einer zweiten Antwort.** Die Metadaten
des Phones stammen vom Streaming-Client (iOS/Android usw.). Endscreen und
Storyboards liefert aber nur die WEB-`/player`-Antwort. Für den TV gab es dafür
schon einen separaten `getBasicInfo`-Request nach dem Laden der Metadaten. Den
nutzt jetzt auch das Phone-Overlay, sodass der Start der Wiedergabe nicht
verzögert wird. Mit nativen Controls entfällt der Request, weil dort nichts
davon angezeigt wird. Vorhandene Werte werden nie überschrieben.

**Storyboard-Stufe.** YouTube liefert mehrere Stufen (L0 bis L3) mit
unterschiedlicher Bildgröße. Gewählt wird die schärfste Stufe mit höchstens
320 px Breite. Größere Sheets wären für eine 160 px breite Vorschau nur
unnötiger Download beim Scrubben. Ein Frame wird gezeigt, indem das ganze
Sprite-Sheet in einem Rahmen mit `overflow: hidden` verschoben wird. Ein Sheet
deckt viele Sekunden ab und ist nach dem ersten Laden im Cache von
`expo-image`.

**Kapitel als Segmente.** Jedes Segment hat einen eigenen Füllstand für Puffer
und Fortschritt, statt eine durchgehende Füllung über Lücken zu legen. So
bleiben die Lücken auch im roten Bereich sichtbar, wie bei YouTube. Die aktive
Kapitelsuche nutzt `findActiveChapterIndex` aus dem TV-Kapitelmodell (reine
Logik, keine TV-Abhängigkeit).

**Wischen als dritte Geste im selben `Race`.** Der vertikale Pan startet erst
ab 20 pt vertikaler Bewegung und scheitert bei seitlicher Bewegung. Tippen,
Doppeltippen und Halten bleiben dadurch unberührt. Nach unten außerhalb des
Vollbilds passiert nichts: YouTube minimiert dort in einen Mini-Player, den es
in der App nicht gibt.

**Endscreen-Karten wiederverwendet.** `VideoEndCard`/`EndscreenCard` vom TV
werden mit `browsing` (antippbar) gerendert. Die Ebene liegt über der
Gestenfläche, damit Karten ihre Taps selbst bekommen, und unter den Controls,
damit die Buttons erreichbar bleiben. Nach dem Ende bleiben die Karten stehen
(`ignoreTiming`), wie bei YouTube. Öffnet eine Karte einen Kanal, pausiert das
Video über das bestehende `PausePlayerEvent`, und das Vollbild endet, weil der
Screen den Fokus verliert.

**Navigationsleiste deklarativ.** `<NavigationBar hidden={fullscreen} />` neben
`<StatusBar hidden={fullscreen} />` im Screen. Auf iOS ist die Komponente ein
No-op. Auf Android setzt das Modul `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`,
also echten Immersive-Modus.

**Autoplay: welches Video?** Wie auf dem TV gilt `resolveNextVideo`: zuerst
der nächste Playlist-Eintrag, sonst YouTubes eigene Autoplay-Wahl
(`autoplay_video_endpoint`). Die Streaming-Clients des Phones liefern diese
Wahl nicht immer mit. Dann nimmt `resolveUpNext` das erste Video des
Watch-Next-Feeds, das YouTube dort ohnehin als „Als Nächstes“ zeigt. Titel,
Kanal und Vorschaubild kommen aus Playlist oder Feed, wenn das Video dort
steht. Nur wenn nicht, lädt das Overlay die Daten nach; der Countdown wartet
darauf nicht.

**Autoplay: 5 Sekunden, abbrechbar.** Die YouTube-App zählt fünf Sekunden
herunter (der TV nutzt 8, weil man dort mit der Fernbedienung erst zum Button
navigieren muss). Der Countdown läuft über den vorhandenen
`useAutoplayCountdown`, der von einem Startzeitpunkt aus rechnet und genau
einmal auslöst. „Abbrechen“ gilt nur für dieses Videoende: Nach einem Replay
erscheint der Countdown beim nächsten Ende wieder. Solange der Countdown
sichtbar ist, werden Endscreen-Karten ausgeblendet, damit sich nichts
überlagert.

**Vollbild beim Drehen über die Schwerkraft.** Der Home-Screen sperrt das
Phone auf Hochformat und bleibt unter dem Video-Screen gemountet. Die
Oberfläche dreht sich auf dem Video-Screen also nie, und `useWindowDimensions`
sowie `expo-screen-orientation` melden keine Drehung. Auch das `orientation`
von `DeviceMotion` hilft nicht: Android liefert dort die Display-Rotation, iOS
die Interface-Ausrichtung. Deshalb wertet `usePlayerFullscreen` den
Schwerkraftvektor (`accelerationIncludingGravity`, Gerätekoordinaten) des schon
installierten `expo-sensors` aus. Daraus ergibt sich die Lage:

- Es zählen nur Beträge, weil iOS und Android unterschiedliche Vorzeichen
  haben. Links/rechts und Kopfüber spielen keine Rolle.
- Bis 30° gilt Hochformat, ab 60° Querformat. Dazwischen und flach liegend
  bleibt die alte Lage, damit schräg gehaltene Phones nicht hin- und
  herspringen.
- Eine neue Lage zählt erst, wenn sie 400 ms hält. Ein Schwung durchs
  Querformat beim Ablegen öffnet kein Vollbild.

Wie bei YouTube zählt nur eine echte Drehung, nie die aktuelle Lage. Wer das
Vollbild per Button verlässt, während er das Phone quer hält, bleibt im
Hochformat, bis er das Phone wieder dreht. Die erste Messung nach dem Öffnen
eines Videos ist keine Drehung. Der Sensor läuft nur, solange der Screen
fokussiert ist und der Overlay-Player aktiv ist. Tablets sind ausgenommen,
weil sie sich frei drehen und im Querformat das geteilte Layout zeigen.

**Autoplay: gleicher Screen statt `replace`.** Der TV ersetzt den Screen mit
`navigation.replace`. Auf dem Phone würde das das Vollbild beenden: Der alte
Screen verliert den Fokus, gibt die Querformat-Sperre zurück, und der neue
startet im Hochformat. Die YouTube-App bleibt beim Autoplay im Vollbild.
Deshalb setzt das Phone mit `navigation.setParams` nur die Video-Parameter
neu. Der Verlauf bleibt dabei gleich wie bei `replace`: Zurück führt zum
Screen vor dem ersten Video. Damit kein Zustand vom vorherigen Video übrig
bleibt, bekommt der Player `key={YTVideoInfo.id}` und startet pro Video
frisch. Außerdem behält `useVideoDetails` die Startzeit jetzt nur noch beim
selben Video.

**Autoplay-Einstellung.** `autoplayEnabled` ist eine eigene, persistierte
Einstellung und standardmäßig an, wie in der YouTube-App. Geändert wird sie
direkt im Player (Schalter oben und Zahnrad-Menü), nicht in den
App-Einstellungen, weil YouTube sie ebenfalls dort anbietet.

**Feste Farben.** Das Overlay liegt über beliebigen Videobildern. Es nutzt
deshalb YouTubes Farben (Weiß, Rot `#FF0000`, halbtransparentes Schwarz) und
nicht das App-Theme, genauso wie `SubtitleOverlay`.

## Qualitätschecks

- `npx prettier --check` auf allen geänderten Dateien: ok
- `npx eslint` auf allen geänderten Dateien: keine neuen Fehler oder Warnungen
  (die Warnungen zu `_muted`/`setMuted` in `VideoPlayer.tsx` und zu
  `parseYTComments` in `YTElements.ts` gab es schon vorher)
- `npm run lint` für das ganze Projekt schlägt fehl, aber mit **derselben**
  Fehlerzahl wie vor der Änderung (1467 Probleme, u. a. im ungetrackten
  `vendor/bundle`)
- `npm run typecheck`: ok
- `npm test`: 369/369 grün, davon 44 neue Tests in
  `test/ui-phone-overlay.test.mjs`, `test/extraction-storyboard.test.mjs`,
  `test/ui-phone-autoplay.test.mjs` und `test/ui-phone-rotation.test.mjs`

## Offene Punkte / nicht umgesetzt

- **Nicht auf dem Gerät getestet.** Das Overlay wurde nicht im Simulator
  bedient, weil der Maestro-iOS-Treiber hier nicht startete. Bitte manuell
  prüfen: Doppeltippen, Halten, Balken ziehen, Vollbild hin und zurück
  (Orientierung wird wiederhergestellt), Sheet, PiP beim Verlassen der App.
- **VLC auf dem Phone** ist ungetestet (Ton über den Audio-Slave, Performance).
- **Autoplay gilt nur für das Phone-/Tablet-Overlay.** Der TV startet am Ende
  weiterhin immer seinen 8-s-Countdown, unabhängig von `autoplayEnabled`. Mit
  nativen Controls gibt es kein Autoplay.
- **Autoplay im Hintergrund/PiP:** Der Countdown läuft auch, wenn die App im
  Bild-in-Bild oder im Hintergrund ist. Ob der Videowechsel dort sauber klappt,
  ist ungetestet.
- **Native Abhängigkeit:** `expo-navigation-bar` braucht einen neuen nativen
  Build (`npx expo prebuild` bzw. `npm run android` / `npm run ios`). Ein reines
  Metro-Reload reicht nicht.
- **Storyboards und Endscreen** hängen am zusätzlichen WEB-Request. Liefert er
  nichts (z. B. bei Altersbeschränkung oder ohne PoToken), fehlen nur
  Vorschaubild bzw. Karten; Zeit und Kapitel erscheinen trotzdem.
- Keine Vor/Zurück-Buttons in der Mitte, kein Mini-Player beim Wischen nach
  unten.
- **Drehen ist nur über Tests geprüft.** Die Schwellen (30°/60°, 400 ms) sind
  Erfahrungswerte und sollten auf einem echten Phone überprüft werden. Im
  Simulator gibt es keinen Beschleunigungssensor.
- Die Corner-Video-Funktion (Long-Press im nativen Modus) gibt es im Overlay
  nicht. Long-Press ist dort mit 2× belegt, wie bei YouTube.
- Endscreen-Karten zeigen ihren Titel nur bei Fokus (TV-Verhalten der
  geteilten Komponente), auf dem Phone also nur das Bild.
