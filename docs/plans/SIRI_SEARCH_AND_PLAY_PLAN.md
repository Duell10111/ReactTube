# Plan: Siri „Search & Play“ für ReactTube

> Stand: 2026-10-15 · Branch: `yt-phone-adaptions`
> Scope: iOS/iPadOS-Phone-App (Musik-Wiedergabe über `MusicPlayerContext`),
> neues Intents-Extension-Target unter `targets/`, neues lokales Expo-Modul unter
> `modules/`, ein iOS-Config-Plugin unter `plugins/ios/`, JS-Bridge in `src/`.
> Später optional: tvOS und watchOS (Abschnitt 8).
> Nicht im Scope: Android (Google Assistant / `onPlayFromSearch`), CarPlay-UI.

---

## 0. Ziel in einem Satz

Man sagt „Hey Siri, spiele _Bohemian Rhapsody_ in ReactTube“ (oder „…suche
_Lo-Fi_ in ReactTube“) und ReactTube sucht auf YouTube Music, startet die
Wiedergabe samt Up-Next/Automix bzw. öffnet die Suchergebnisse — auch wenn die
App gerade nicht im Vordergrund ist.

---

## 1. Befund — was heute da ist

| Thema                         | Stand                                                                                                                                                                               | Fundstelle                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Musik-Wiedergabe              | `@rntp/player`, Playlist/Repeat/Shuffle/Automix leben **in React**                                                                                                                  | `src/context/MusicPlayerContext.tsx`, `src/utils/music/MusicInit.ts` |
| Einstiegspunkte zum Abspielen | `setPlaylistViaEndpoint(endpoint)`, `setCurrentItem(item)`, `setPlaylistViaLocalDownload(id)`, `addAsNextItem(item)`, `setShuffle`, `setRepeat`                                     | `MusicPlayerContext.tsx:479 ff.`                                     |
| Musiksuche                    | `youtube.music.search(query)` → `parseArrayHorizontalData`                                                                                                                          | `src/hooks/music/useMusicSearch.ts`                                  |
| Suchscreens                   | `Search` und `MusicSearchScreen` haben **keine** Route-Params (kein Initial-Query)                                                                                                  | `src/navigation/RootStackNavigator.tsx:52, 76`                       |
| Navigation von außen          | kein `navigationRef`, kein `linking`-Config                                                                                                                                         | `src/navigation/Navigation.tsx`                                      |
| YouTube-Zugriff               | ausschließlich JS (`youtubei.js`, PoToken über `PoTokenWebViewHost`)                                                                                                                | `App.tsx`, `src/utils/potoken/`                                      |
| App-Lebenszyklus              | Scene-basiert (`EXExpoAppSceneDelegate`, `enableSceneSupport: true`), `UIApplicationSupportsMultipleScenes = false`                                                                 | `app.json`, `ios/reacttube/Info.plist`                               |
| React-Start                   | `factory.startReactNative(...)` passiert erst in `scene(_:willConnectTo:)`                                                                                                          | `node_modules/expo/ios/AppDelegates/ExpoAppSceneDelegate.swift:59`   |
| Native Erweiterungen          | lokale Expo-Module (`modules/media-server`, `modules/botguard-webview`), Targets über `@duell10111/apple-targets` (unterstützt Typ `"intent"`), Config-Plugins unter `plugins/ios/` | —                                                                    |
| Siri / Intents                | **nichts** vorhanden: keine Entitlements, kein `NSSiriUsageDescription`, keine Extension                                                                                            | `ios/reacttube/reacttube.entitlements` ist leer                      |
| App-Name für Siri             | `CFBundleDisplayName = "reacttube"` — Siri muss das als „React Tube“ verstehen                                                                                                      | `Info.plist`                                                         |
| Lokalisierung                 | `src/localization/` mit `en`/`de` existiert bereits                                                                                                                                 | `src/localization/en.ts`, `de.ts`                                    |

### Kernproblem

Der natürliche Siri-Weg für Audio-Apps (`INPlayMediaIntent` →
`.handleInApp`) startet die App **im Hintergrund** und ruft nur
`application(_:handle:completionHandler:)` am App-Delegate auf. Dabei wird
**keine UIScene verbunden** — in unserem Setup startet React Native also gar
nicht, und ohne JS gibt es weder YouTube-Suche noch Stream-Auflösung noch
Playlist-Logik. Das bestimmt die Phasenreihenfolge (siehe Abschnitt 3).

---

## 2. Welche Apple-API?

| Option                                                                                                                                              | Freitext („spiele _X_“)                                                                                        | Hintergrund-Wiedergabe     | HomePod/CarPlay             | Bewertung                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| **SiriKit Media Intents** (`INPlayMediaIntent`, `INSearchForMediaIntent`, `INAddMediaIntent`, `INUpdateMediaAffinityIntent`) über Intents-Extension | ✅ `INMediaSearch` (Titel, Künstler, Album, Genre, Mood, Typ)                                                  | ✅ via `.handleInApp`      | ✅ (nur mit `.handleInApp`) | **Empfohlen** — einziger offizieller Weg für „spiele beliebiges _X_ in App Y“ |
| App Intents + App Shortcuts (`AppShortcutsProvider`)                                                                                                | ❌ Phrasen erlauben nur `AppEntity`/`AppEnum`-Parameter, Freitext nur per Rückfrage („Was möchtest du hören?“) | ✅ (`AudioPlaybackIntent`) | eingeschränkt               | Ergänzung für Kurzbefehle-App, Spotlight, Action Button (Phase 5)             |
| Universal Links / URL-Schema                                                                                                                        | ❌                                                                                                             | ❌                         | ❌                          | nur als interner Transport nützlich                                           |

> Vor Phase 0 kurz gegen das aktuelle SDK prüfen, ob Apple inzwischen ein
> Assistant-Schema für Medienwiedergabe in App Intents anbietet. Stand der
> Recherche: Media Intents sind weiterhin der Weg für Audio-Apps.
>
> **Geprüft in Phase 0 (iOS-27-SDK, Xcode 27):** Es gibt neu eine App-Schema-
> Domain `.audio` (`@available(anyAppleOS 27.0)`, nicht tvOS/watchOS) mit
> `playAudio` (`PlayAudioIntent`), `addToLibrary`, `addToPlaylist`,
> `createStation`, `updateAudioAffinity`, `warmupAudioQueue` und Entities
> (`song`, `album`, `artist`, `playlist`, …). Apple Music selbst
> (`_MusicKitInternal_AppIntents`) bildet seine Siri-Intents darauf ab, die
> Audio-Entity wird über eine `IntentValueQuery` aufgelöst. Ob Drittanbieter
> damit Freitext („spiele _X_“) bekommen und ob das an Apple Intelligence
> hängt, ist offen → eigener Spike, frühestens nach Phase 1. Media Intents
> bleiben der Weg, weil sie ab iOS 14 auf allen Geräten laufen.

**Video:** `INPlayMediaIntent` ist für Audio gedacht; Videos auf dem iPhone
starten wir nicht über Siri-Wiedergabe. „Suche _X_ in ReactTube“ darf aber den
Video-Suchscreen öffnen (Abschnitt 4).

---

## 3. Zielarchitektur

```
 "Hey Siri, spiele X in ReactTube"
            │
            ▼
 ┌──────────────────────────────┐   App Group (UserDefaults/JSON)
 │ Intents-Extension (Swift)    │◀── Library-Snapshot: Playlists, Downloads,
 │ targets/siri-intents/        │    zuletzt gespielt, Login-Status
 │  resolveMediaItems  ─ leicht,│
 │  kein youtubei.js            │
 │  handle → .handleInApp /     │
 │           .continueInApp     │
 └──────────────┬───────────────┘
                │ INPlayMediaIntent (+ resolved INMediaItem)
                ▼
 ┌──────────────────────────────┐
 │ Expo-Modul modules/siri-media│  AppDelegateSubscriber:
 │  - application(_:handle:)    │  - Intent in Pending-Queue legen
 │  - scene continue userActivity│ - React ggf. headless starten (Phase 2)
 │  - JS-Events + completeRequest│ - Completion erst nach JS-Antwort / Timeout
 └──────────────┬───────────────┘
                │ Event "onSiriMediaRequest" {requestId, request}
                ▼
 ┌──────────────────────────────┐
 │ JS: useSiriMediaBridge.ios   │  parseSiriRequest (pur, getestet)
 │  (in App.tsx innerhalb       │  → resolveSiriRequest (YT-Music-Suche,
 │   MusicPlayerContext)        │     Ranking, Library/Downloads)
 │                              │  → MusicPlayerContext.setPlaylistViaEndpoint
 │                              │  → completeRequest(requestId, "success")
 └──────────────────────────────┘
```

### 3.1 Aufgabenteilung Extension ↔ App

- **Extension löst nur „leicht“ auf.** Sie kann kein `youtubei.js` ausführen.
  Sie akzeptiert die `INMediaSearch` und baut ein `INMediaItem` mit
  - `identifier` = serialisierte Anfrage, z. B.
    `rt:search:song?q=Bohemian%20Rhapsody&artist=Queen` oder, wenn im
    App-Group-Snapshot gefunden, `rt:playlist:<id>` / `rt:download:<videoId>`;
  - `title`/`artist` aus der Anfrage (Siri liest das vor).
    Nur Login-pflichtige Fälle ohne Login (z. B. „meine Playlist _X_“) werden
    bereits hier mit `.unsupported` beantwortet.
- **Die App macht die echte Suche** und startet die Wiedergabe. Findet sie
  nichts, antwortet sie mit `.failureNoUnplayedContent` bzw. `.failure`, Siri
  sagt das dann an.

### 3.2 Drei Startsituationen

| Situation                                                | Weg                                                                                                                                        | Phase |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| App läuft (Vorder- oder Hintergrund, JS lebt)            | `.handleInApp` → Modul feuert JS-Event sofort                                                                                              | 1     |
| App beendet, Gerät entsperrt                             | MVP: `.continueInApp` → App kommt in den Vordergrund, Scene verbindet, React startet, Modul liefert die Anfrage aus der Pending-Queue nach | 1     |
| App beendet, Hintergrund-/Sperrbildschirm-/HomePod-Start | `.handleInApp` → Modul startet React **headless** (ohne Window) und hält die Siri-Completion bis zur JS-Antwort (Timeout ~8 s)             | 2     |

Die Extension weiß nicht, ob die App läuft. Deshalb: **Phase 1** antwortet
immer mit `.continueInApp` (robust, öffnet die App), **Phase 2** stellt auf
`.handleInApp` um, sobald der Headless-Start zuverlässig funktioniert. Ein
rein nativer Fallback (Stream ohne JS auflösen) ist bewusst nicht vorgesehen:
PoToken, SABR und Cipher-Logik leben in JS.

---

## 4. Intent-Semantik

### 4.1 `INPlayMediaIntent` → Aktion

| Beispiel (de/en)                              | `INMediaSearch`                      | Aktion in der App                                                                          |
| --------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| „Spiele _Bohemian Rhapsody_ in ReactTube“     | `mediaType=.song`, `mediaName`       | YT-Music-Suche, Filter „Songs“, Top-Treffer → `setPlaylistViaEndpoint` (Up Next + Automix) |
| „Spiele _Queen_ in ReactTube“                 | `mediaType=.artist`, `artistName`    | Künstler-Treffer → Shuffle-/Radio-Endpoint des Künstlers                                   |
| „Spiele das Album _A Night at the Opera_“     | `mediaType=.album`, `albumName`      | Album-Playlist ab Titel 1                                                                  |
| „Spiele meine Playlist _Sport_“               | `mediaType=.playlist`, `mediaName`   | Abgleich lokal + Account-Playlists (Snapshot), sonst YT-Suche nach Playlists               |
| „Spiele entspannte Musik / Jazz in ReactTube“ | `moodNames` / `genreNames`           | Suche nach Mood/Genre bzw. „Moods & Genres“-Endpoint, Shuffle                              |
| „Spiele ReactTube“                            | leer                                 | zuletzt gespielten Titel fortsetzen, sonst erste „Quick Picks“ der Music-Home              |
| „Spiele mehr davon“                           | `reference=.currentlyPlaying`        | Automix/Radio vom aktuellen Titel                                                          |
| „…als Nächstes“ / „…danach“                   | `playbackQueueLocation=.next/.later` | `addAsNextItem` statt Ersetzen                                                             |
| „…zufällig“ / „…wiederholen“                  | `playShuffled`, `playbackRepeatMode` | `setShuffle`, `setRepeat`                                                                  |
| Offline / heruntergeladen                     | Treffer im Download-Snapshot         | `setPlaylistViaLocalDownload(id)` bevorzugen                                               |

### 4.2 `INSearchForMediaIntent`

„Suche _Lo-Fi_ in ReactTube“ → `.continueInApp` → `MusicSearchScreen` mit
`initialQuery`. Hinweise auf Video („…Videos von _X_“, `mediaType=.video` /
`.musicVideo`) → normaler `Search`-Screen mit `initialQuery`.

### 4.3 Später (Phase 4)

- `INUpdateMediaAffinityIntent`: „Ich mag diesen Song“ → Like über
  `youtubei.js` (nur mit Login), sonst lokale Bibliothek.
- `INAddMediaIntent`: „Füge diesen Song zu _Sport_ hinzu“ →
  `PlaylistManagerContext` (lokal oder Account).

---

## 5. Bausteine und Dateien

| Datei / Ordner                                                          | Art      | Inhalt                                                                                                                                                                                              |
| ----------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `targets/siri-intents/expo-target.config.js`                            | neu      | `type: "intent"`, Bundle-ID `com.duell10111.reacttube.siri-intents`, App Group, Siri-Entitlement                                                                                                    |
| `targets/siri-intents/IntentHandler.swift`                              | neu      | `INExtension`, verteilt auf die Handler                                                                                                                                                             |
| `targets/siri-intents/PlayMediaIntentHandler.swift`                     | neu      | `resolveMediaItems`, `handle` (Abschnitt 3.1)                                                                                                                                                       |
| `targets/siri-intents/SearchForMediaIntentHandler.swift`                | neu      | `handle` → `.continueInApp`                                                                                                                                                                         |
| `targets/siri-intents/LibrarySnapshot.swift`                            | neu      | liest den App-Group-Snapshot (Codable, versioniert)                                                                                                                                                 |
| `targets/siri-intents/Info.plist`                                       | neu      | `NSExtension` → `IntentsSupported`: `INPlayMediaIntent`, `INSearchForMediaIntent`; `SupportedMediaCategories`: `INMediaCategoryMusic` (+ ggf. `General`)                                            |
| `modules/siri-media/`                                                   | neu      | lokales Expo-Modul (Aufbau wie `modules/media-server`)                                                                                                                                              |
| `modules/siri-media/ios/SiriMediaAppDelegateSubscriber.swift`           | neu      | `ExpoAppDelegateSubscriber`: `application(_:handle:completionHandler:)`, Pending-Queue, Timeout, Headless-Start (Phase 2)                                                                           |
| `modules/siri-media/ios/SiriMediaModule.swift`                          | neu      | JS-API: Event `onSiriMediaRequest`, `getPendingRequests()`, `completeRequest(id, result)`, `writeLibrarySnapshot(json)`, `setVocabulary(kind, strings)`, `donatePlayback(item)`                     |
| `modules/siri-media/index.ts` + `src/*.ts`                              | neu      | Typen; No-op-Implementierung für Android/tvOS/Web                                                                                                                                                   |
| `plugins/ios/withSiri.js`                                               | neu      | Entitlements (`com.apple.developer.siri`, App Group), `NSSiriUsageDescription` (en/de via `InfoPlist.strings`), `INAlternativeAppNames` („React Tube“), Scene-`continue userActivity` weiterreichen |
| `app.json`                                                              | geändert | Plugin eintragen; Entitlements nicht direkt in `ios/` editieren (generiert)                                                                                                                         |
| `src/siri/parseSiriRequest.ts`                                          | neu      | **pure** Abbildung Intent-Payload → `SiriPlayRequest` (Discriminated Union)                                                                                                                         |
| `src/siri/rankSiriSearchResults.ts`                                     | neu      | **pure** Auswahl des besten Treffers (Typ-Match, Künstler-Match, Normalisierung von Groß-/Kleinschreibung, Akzenten, „feat.“)                                                                       |
| `src/siri/resolveSiriRequest.ts`                                        | neu      | YT-Music-Suche/Library/Downloads → Endpoint oder lokale ID                                                                                                                                          |
| `src/hooks/siri/useSiriMediaBridge.ios.tsx`                             | neu      | Event-Listener, Pending-Queue abholen, Player steuern, `completeRequest`                                                                                                                            |
| `src/hooks/siri/useSiriMediaBridge.tsx`                                 | neu      | No-op für Android/TV                                                                                                                                                                                |
| `src/hooks/siri/useSiriLibrarySync.ios.tsx`                             | neu      | schreibt Snapshot + `INVocabulary` (`.mediaPlaylistTitle`), wenn sich Playlists/Downloads ändern                                                                                                    |
| `src/navigation/Navigation.tsx`                                         | geändert | `createNavigationContainerRef` exportieren, damit die Bridge zu Suche/Player navigieren kann                                                                                                        |
| `src/navigation/RootStackNavigator.tsx`                                 | geändert | `Search: {initialQuery?: string} \| undefined`, `MusicSearchScreen: {initialQuery?: string} \| undefined`                                                                                           |
| `src/screens/phone/MusicSearchScreen.tsx`, `SearchScreen`               | geändert | `initialQuery` übernehmen und Suche auslösen                                                                                                                                                        |
| Settings (Phone)                                                        | geändert | Schalter „Siri-Wiedergabe“ und „Wiedergabe an Siri melden (Vorschläge)“                                                                                                                             |
| `src/localization/en.ts`, `de.ts`                                       | geändert | Keys z. B. `settings.siri.*`, `siri.errors.*` in beiden Sprachen                                                                                                                                    |
| `test/siri-request-parse.test.mjs`, `test/siri-result-ranking.test.mjs` | neu      | Node-Tests für die puren Module                                                                                                                                                                     |

Hinweise aus `AGENTS.md`: alle Code-Kommentare englisch; sichtbare Texte nur
über `src/localization`; nichts in `ios/` von Hand ändern — alles über
Config-Plugin, Expo-Modul und `targets/`.

### 5.1 Request-Lebenszyklus im Modul

1. Intent kommt an → `requestId` vergeben, in Pending-Queue (Speicher +
   App-Group, damit `.continueInApp`-Kaltstarts sie finden).
2. Ist ein JS-Listener registriert → Event sofort senden, sonst warten.
3. JS meldet `completeRequest(id, "success" | "notFound" | "loginRequired" |
"failure")` → Modul ruft die Siri-Completion mit passendem
   `INPlayMediaIntentResponseCode` auf.
4. Timeout (≈ 8 s, Siri gibt nicht viel länger) → `.failure`; die Anfrage wird
   verworfen, damit sie nicht Minuten später überraschend losspielt.
5. Bei `.success` liefert die Antwort die tatsächlich gespielten
   `INMediaItem`s zurück (Siri kann dann „Spiele _Titel_ von _Künstler_“ sagen).

---

### 5.2 Optionaler Siri-Build für kostenlose Apple-Konten (implementiert; Gerätetest offen)

Die Siri-Integration muss beim Prebuild abschaltbar sein, damit ein Personal
Team die App ohne Siri signieren kann. Ein Laufzeit-Schalter in den
App-Einstellungen reicht dafür nicht. Die Build-Option wird über `enabled`
in `app.json` gesetzt; der eingecheckte Wert `true` erhält die bisherigen Siri-Builds. Für ein Personal Team auf
`false` setzen.

- [x] Siri direkt in `app.json` über die Plugin-Option steuern:
      `["./plugins/ios/withSiri.js", {"enabled": false}]`. Ohne Angabe bleibt
      Siri für bestehende Builds aktiviert. Keine Umgebungsvariable oder
      dynamische Expo-Konfiguration erforderlich.
- [x] `plugins/ios/withSiri.js` um die Option `enabled` erweitern. Bei
      `enabled: false` keine Siri-Entitlements, App Group, Siri-Plist-Einträge,
      AppDelegate-Erweiterungen oder App-Intents-Dateien hinzufügen.
- [x] Beim vorhandenen `@duell10111/apple-targets`-Plugin über `match` die
      Extension ausnehmen: aktiviert `"*"`, deaktiviert `"!(siri-intents)"`.
      Diese Option wird von Version `0.0.6-alpha.1` bereits unterstützt;
      das Watch-Target bleibt dabei enthalten. Ein `enabled`-Feld in
      `targets/siri-intents/expo-target.config.js` wird derzeit nicht ausgewertet.
      Dafür den bisherigen Plugin-Eintrag durch einen lokalen Wrapper
      `plugins/ios/withAppleTargets.js` ersetzen, der die vorhandenen Optionen
      (`appleTeamId`, `isTV`) an das Paket weitergibt. Ein gemeinsamer Helper
      liest die Siri-Option aus `config.plugins`, sodass der Wrapper vor dem
      Aufruf des Pakets den passenden `match`-Filter setzen kann. Das
      Siri-Plugin verwendet dieselbe Auswertung. Damit muss lokal nur ein
      Boolean geändert werden, unabhängig von der Reihenfolge der Einträge;
      weder das Paket noch generierte native Dateien werden dafür editiert.
- [x] Den Build-Status für Hooks und Einstellungen verfügbar machen:
      Siri-Einstellungen ausblenden und native Siri-Aufrufe einschließlich
      Autorisierungsanfragen, Donations und App-Group-Zugriffen verhindern,
      auch wenn gespeicherte Siri-Einstellungen noch aktiviert sind. Das
      bloße Vorhandensein des optionalen nativen Moduls ist kein ausreichender
      Verfügbarkeitstest, wenn es weiterhin mitgelinkt wird.
- [x] Beim Wechsel der Flag einen sauberen iOS-Prebuild verlangen, weil das
      Überspringen der Plugins bereits generierte Targets, Entitlements und
      AppDelegate-Erweiterungen nicht entfernt. Beispiel nach Implementierung:
      nach Setzen von `enabled: false`:
      `npx expo prebuild --clean --platform ios`.
      Dafür müssen native Anpassungen wie bisher in Plugins oder Modulen liegen.
- [x] Beide Varianten und den Wechsel in beide Richtungen durch saubere,
      isolierte Expo-Prebuilds prüfen: Extension, Entitlements, Plist-Einträge,
      AppDelegate-Erweiterung und App-Intents-Dateien nur mit Siri;
      Watch-Target bleibt enthalten. tvOS enthält weder Siri noch Watch.
- [ ] Geräte-Build mit Personal Team ohne Siri testen. Andere
      Signing-Voraussetzungen wie Team-Auswahl und verfügbare Bundle-IDs gelten
      weiterhin. Die Geräteprüfung ist hier noch offen.

**Verwendung:** In `app.json` den Eintrag
`["./plugins/ios/withSiri.js", {"enabled": true}]` auf `false` setzen, um ohne
Siri zu bauen. Nach **jedem Wechsel in beide Richtungen** ist zwingend ein
sauberer Prebuild erforderlich:

```sh
npx expo prebuild --clean --platform ios
```

Dabei wird das generierte iOS-Projekt neu erstellt; native Anpassungen müssen
in Plugins oder Modulen liegen. Ein inkrementeller Prebuild entfernt alte
Siri-Targets und Berechtigungen nicht. Keine weiteren Plugin-Optionen ändern:
`withAppleTargets.js` liest denselben Schalter und erhält die bisherigen
`appleTeamId`-/`isTV`-Optionen. Ohne `enabled` bleibt Siri auf iPhone/iPad aktiv.

Der Build-Status liegt als `ReactTubeSiriEnabled` in der App-`Info.plist` und
als `SiriMedia.isSiriEnabled` im nativen Modul vor. Das JS-Modul liefert bei
fehlendem oder deaktiviertem Status `null`; dadurch entfallen Siri-Hooks und
Siri-Einstellungen auch bei früher gespeicherten Opt-ins. Native
Einstiegspunkte und App-Group-Zugriffe prüfen denselben Build-Status zusätzlich.
Android-, TV- und Watch-Verhalten bleibt getrennt.

**Validierung (2026-10-17):** 427 Node-Tests erfolgreich, einschließlich
Build-Flag, Plugin-Reihenfolge, sauberem Variantenwechsel und gespeicherten
Opt-ins. Isolierte Expo-Prebuilds ohne Pods-Installation für beide iOS-Varianten
und tvOS geprüft. Geänderte JS-/TS-Dateien einschließlich Tests bestehen ESLint
und Prettier. Swift-Syntax geprüft; `SiriMediaBuild.swift` besteht den
Typecheck gegen das iOS-SDK. Beide vollständigen unsigned iOS-Archive und
fertigen IPAs wurden inzwischen mit Xcode 27.1 erfolgreich geprüft (siehe 5.3).
Personal-Team-Signing bleibt offen; beim ersten Gerätecheck
konnte `devicectl` den CoreDeviceService nicht starten.
Der vollständige JS-Lint scheitert an vorhandenen Dateien unter `vendor/bundle/`.
Der Projekt-Typecheck meldet unverändert zwei `TS2578`-Fehler (ungenutztes
`@ts-expect-error`) in `src/utils/RequireCycleWarnings.ts:40` und
`node_modules/@rntp/player/src/trackPlayerModule.ts:14`; gegen den ursprünglichen
Stand der geänderten TS-Dateien reproduziert.

### 5.3 Repository-Dokumentation und GitHub-Actions-Builds (implementiert; GitHub-/Signing-Abnahme offen)

**Dokumentation**

- [x] `README.md` im Abschnitt „Building“ um die beiden iOS-Buildvarianten
      ergänzen: ohne Siri für kostenlose Personal Teams und mit Siri für ein
      berechtigtes bezahltes Entwicklerteam. Auf eine neue Anleitung unter
      `docs/IOS_LOCAL_BUILD.md` verlinken.
- [x] In `docs/IOS_LOCAL_BUILD.md` die vollständigen lokalen Schritte für
      kostenlose Konten dokumentieren: `enabled: false` in `app.json`, sauberer
      iOS-Prebuild, Workspace in Xcode öffnen, eigenes Personal Team auswählen,
      bei Bedarf verfügbare Bundle-IDs für App und eingebettete Targets setzen
      und auf dem eigenen Gerät bauen. Die Grenzen des kostenlosen Signings
      und die erforderliche erneute Bereitstellung anhand aktueller
      Apple-Dokumentation erläutern.
- [x] In derselben Anleitung den Siri-Build mit `enabled: true`, bezahltem
      Team sowie passenden Siri- und App-Group-Provisioning-Profilen erklären.
      Account-/Team-bezogene Bundle- und App-Group-IDs müssen für eigene Builds
      konfigurierbar und zwischen App und Extension konsistent sein. Keine
      persönlichen Signing-Daten ins Repository übernehmen.
- [x] `LOCALBUILD.md` an den lokalen Apple-Targets-Wrapper anpassen und den
      tvOS-Ausschluss von Siri erklären. Die Anleitung bleibt auf Apple TV
      ausgerichtet und verweist für iPhone/iPad auf die neue iOS-Anleitung.
- [x] Dokumentieren, welche Actions-Artefakte Siri enthalten, wie sie signiert
      bzw. installiert werden und dass ein unsigniertes IPA allein keine
      Installation auf einem Gerät ermöglicht. Kostenlose Konten werden
      zunächst über den lokalen Xcode-Build unterstützt; die Installation
      nachträglich signierter CI-Artefakte separat prüfen.

**Standardbuilds ohne Siri**

- [x] `.github/actions/prebuild/action.yml` um einen Input `siri-enabled`
      mit Standardwert `false` erweitern. Vor dem Prebuild die entsprechende
      Plugin-Option in `app.json` setzen; lokal bleibt derselbe Schalter direkt
      in der Datei bedienbar, ohne Umgebungsvariable. Plugin-Einträge nach
      ihrem Namen statt über feste Array-Indizes bearbeiten, auch beim
      vorhandenen `isTV`-Schalter und beim neuen Apple-Targets-Wrapper.
- [x] In `.github/workflows/build.yml` alle regulären Apple-Builds explizit
      ohne Siri konfigurieren. Der CI-Standard muss unabhängig davon gelten,
      ob Siri in der eingecheckten `app.json` für lokale Builds aktiviert ist.
      tvOS bleibt ohne Siri; Android behält sein bisheriges Verhalten.
- [x] Den zuvor auskommentierten iOS-Phone-Job gesondert prüfen: Der lokale
      unsigned Archive-Build ohne Siri läuft mit Xcode 27.1 durch; die alten
      Compilerfehler sind dort nicht reproduzierbar. Als experimenteller Job
      über `build-ios-phone` wieder ausführbar, bis zur Runner-Abnahme weiterhin
      standardmäßig aus und ausdrücklich ohne Siri. Der Job hat jetzt eine
      explizite Xcode-Auswahl, genau einen sauberen Prebuild und schaltet
      Signing einschließlich `CODE_SIGNING_ALLOWED` aus.

**Zusätzlicher Siri-Build für bezahlte Entwicklerteams (optional)**

- [x] Einen zusätzlichen iOS-Phone-Job mit `siri-enabled: true` vorsehen,
      beispielsweise separat über `workflow_dispatch` aktivierbar. Dieser Job
      ergänzt den Standardbuild und ersetzt ihn nicht. Ein normaler manueller
      Workflow-Lauf startet standardmäßig nur die Builds ohne Siri.
- [x] Artefakte und Release-Dateien eindeutig unterscheiden, zum Beispiel
      `reacttube-ios-no-siri.ipa` und `reacttube-ios-siri.ipa`, damit Uploads
      einander nicht überschreiben und die benötigte Account-Art erkennbar ist.
- [x] Festlegen und dokumentieren, ob das Siri-Artefakt unsigniert für späteres
      Signing durch ein bezahltes Team bereitgestellt oder mit konfigurierten
      CI-Signing-Secrets signiert wird. Auch die eingebettete Extension muss
      mit passenden Profilen signiert werden. Der zusätzliche Build verschafft
      einem kostenlosen Konto keine Siri-Berechtigung.
- [x] Automatische Prüfung beider Buildvarianten integrieren:
      `scripts/verify-apple-build.js` prüft den generierten Projektstand und das
      gepackte IPA; ohne Siri fehlen Extension, Entitlement und Siri-App-Group,
      mit Siri stimmen Gruppe und native Build-Marker überein. `--signed`
      prüft zusätzlich Signaturen und Provisioning-Profile von App, Extension
      und Watch. Jeder Apple-Job hat ein eigenes Checkout und einen sauberen
      Prebuild. Unsignierte IPAs werden über Projekt-Entitlements und
      Bundle-Metadaten geprüft; sie enthalten keine verwendbaren signierten
      Entitlements oder Profile.
- [x] Echte unsigned Archive und IPAs beider iOS-Varianten lokal vollständig
      bauen und prüfen (Xcode 27.1): ohne Siri keine Extension/Gruppe;
      mit Siri passende Extension und eigene App Group. Watch-Payload und
      Companion-ID in beiden IPAs geprüft.
- [ ] Die neuen Jobs auf GitHub und signierte Exporte mit den tatsächlichen
      Profilen abnehmen. Lokale unsigned Archive ersetzen diese Runner- und
      Signing-Abnahme nicht.

#### Umsetzung und Prüfstand (2026-10-17)

- `docs/IOS_LOCAL_BUILD.md` enthält beide lokalen Varianten, aktuelle
  Apple-Quellen zu Personal-Team-Grenzen, konfigurierbare IDs und App Group
  sowie die Grenzen unsignierter CI-Artefakte. README und tvOS-Anleitung
  verweisen darauf.
- `scripts/configure-build.js` setzt `isTV` und Siri nach Plugin-Namen;
  Standard `siri-enabled: false`, Androids Siri-Option bleibt unverändert.
- `.github/actions/apple-archive/` verwendet für alle Apple-Jobs dieselben
  unsigned Archive-/Paketprüfungen und lädt bei Fehlschlag Diagnosen hoch.
  Die Phone-Varianten sind unabhängig per `workflow_dispatch` opt-in;
  Standardläufe und Releases behalten die bisherigen TV-/Android-Builds.
- App Group: standardmäßig `group.<ios.bundleIdentifier>`, optional
  `appGroup` bei `withSiri`. Die Extension liest dieselbe statische
  `app.json`, beide Swift-Prozesse lesen die Gruppe aus ihrem gebauten
  `Info.plist`. Die Extension-ID folgt der installierten Apple-Targets-Version:
  `<ios.bundleIdentifier>.siriIntents` (nicht `.siri-intents`).
- 444 Node-Tests, ESLint für die geänderten Dateien und `actionlint` erfolgreich.
  Isolierte saubere Prebuilds für iOS ohne Siri, iOS mit eigener Bundle-ID/App
  Group, Wechsel zurück ohne Siri sowie tvOS erfolgreich geprüft.
- Beide realen Archive mit `CODE_SIGNING_ALLOWED=NO` erfolgreich gebaut und
  mit dem bestehenden Skript als IPA gepackt. Beide fertigen IPAs bestehen
  `verify-apple-build.js`; die Siri-Variante verwendet zum Nachweis der
  Konfigurierbarkeit `com.example.reacttube` und `group.example.music`.
  Die CI-Paketprüfung liest erwartete Bundle-ID und App Group zusätzlich über
  `--config app.json`, damit eigene Gruppen auch im Workflow geprüft werden.
  Die alten Phone-Compilerfehler sind auf Xcode 27.1 nicht aufgetreten.
- Gesamt-Lint und Projekt-Typecheck haben weiterhin die unter 5.2 genannten
  bestehenden Fehler. Swift wird durch die vollständigen Archive mitgeprüft.

---

## 6. Phasen

### Phase 0 — Spike (Machbarkeit, 1–2 Tage)

- [x] Klären: Apple-Developer-Programm (bezahlt) und echte `appleTeamId` —
      das Siri-Entitlement gibt es **nicht** mit einem Personal Team
      (`app.json` hat aktuell `XXXXXXXXXX`).
- [x] Minimal-Extension über `@duell10111/apple-targets` (`type: "intent"`)
      bauen, signieren, auf Gerät installieren; Siri antwortet auf
      „Spiele Test in ReactTube“.
- [~] `.continueInApp`: prüfen, dass die `NSUserActivity` mit der Interaction
  über `EXExpoAppSceneDelegate` (`scene(_:continue:)` bzw.
  Connection-Options beim Kaltstart) im Modul ankommt.
  → warm ✅, Kaltstart noch nicht getestet.
- [~] `.handleInApp` bei beendeter App: Kann das Modul im
  `application(_:handle:)` den `RCTReactNativeFactory`-Host ohne Window
  starten (Root-View offscreen bzw. Surface ohne Window)? Laufen
  `YoutubeContextProvider` und `PoTokenWebViewHost` (WKWebView) dabei?
  Funktioniert danach ein späterer Scene-Connect ohne zweiten JS-Start?
  → Headless-Start war gar nicht nötig (siehe Ergebnis); Wiedergabe aus
  dem beendeten Zustand funktioniert, **sobald Siri die Anfrage an
  ReactTube schickt** (1 von 5 Versuchen).
- [x] Ergebnis hier im Plan festhalten; davon hängt Phase 2 ab.

#### Ergebnis Phase 0 (2026-10-16, iPhone 15 Pro, iOS 27, Release-Build)

Spike-Code liegt auf `siri-extension`: `targets/siri-intents/`,
`modules/siri-media/`, `plugins/ios/withSiri.js`,
`src/hooks/siri/useSiriMediaBridge*.tsx`. Diagnose-Log:
`Documents/siri-spike.log` im App-Container
(`xcrun devicectl device copy from --domain-type appDataContainer …`). Die
Extension schreibt `siri-extension.log` in die App Group
`group.com.duell10111.reacttube`; die App kopiert beim Start beide Dateien
nach `Documents/group-*.log`, weil `devicectl` Dateien im
App-Group-Container nicht anzeigt.

**Account/Signing**

- Bezahltes Team vorhanden. Automatisches Signing legt die App-IDs mit
  Siri-Capability und die App Group per `-allowProvisioningUpdates` an (nötig
  war nur ein erneuter Login in Xcode). Das Wildcard-Profil reicht nicht.
- Die Team-ID gehört nicht ins Repo: `app.json` behält den Platzhalter
  `XXXXXXXXXX`, den `expo prebuild` ins Projekt schreibt. Gebaut wird mit
  `xcodebuild … -allowProvisioningUpdates DEVELOPMENT_TEAM=<Team-ID>` (oder das
  Team in Xcode setzen).

**Integration in Expo (erkannte Hürden, gelöst)**

- `ExpoAppDelegate` leitet `application(_:handlerFor:)` **nicht** an
  Subscriber weiter → `withSiri.js` ergänzt die Methode im `AppDelegate.swift`
  (`internal import SiriMedia`, weil `ExpoModulesProvider` das Modul so
  importiert).
- `.continueInApp`-Activities kommen über `ExpoAppSceneDelegate` →
  `application(_:continue:)` korrekt bei einem `ExpoAppDelegateSubscriber` an.
- Für einen eventuellen Headless-Start gibt es mit
  `ExpoReactDelegateHandler.createReactRootView` einen sauberen Haken, um die
  Root-View später an die Scene zu übergeben (implementiert, aber nicht
  gebraucht — s. u.).

**Messungen**

| Fall                       | Weg             | Ergebnis                                                                                                                                                                                                                                                       |
| -------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App im Vordergrund         | `handleInApp`   | ✅ Request +25 ms in JS, Suche fertig +440 ms, Siri-Completion +460 ms, Ton nach ~2,7 s                                                                                                                                                                        |
| App im Hintergrund         | `handleInApp`   | ✅ gleiche Zeiten, Wiedergabe startet im Hintergrund (`appState=background`)                                                                                                                                                                                   |
| App beendet, 1. Lauf       | `handleInApp`   | ❌ Siri bot Amazon Music an; zusätzlich kamen drei leere `.music`-Requests (kein `mediaName`) an, JS antwortete `notFound`. Erster Start nach Installation: JS bereit erst nach ≈ 6 s                                                                          |
| App beendet, 2. Lauf (5×)  | `handleInApp`   | 1× ✅, 3× Amazon Music („in deiner Region nicht unterstützt“), 1× Websuche. **Nur beim Erfolg wurde die Extension überhaupt aufgerufen**                                                                                                                       |
| App beendet, Erfolgsfall   | `handleInApp`   | ✅ Extension → App-Start +0,2 s, Scene verbunden, JS bereit +0,17 s, Suche +0,9 s, Siri-Completion +0,9 s, Ton nach ~3,6 s (Siri sagt dabei nichts)                                                                                                            |
| App beendet, 3. Lauf (4×)  | `handleInApp`   | Nach Anzeigename „ReactTube“ + Spenden: **4/4 an ReactTube**, aber `mediaName` enthielt den App-Namen („Bohemian Rhapsody in React Tube“, „Paparazzi von React Tube“) → Cover/Fremdtitel gespielt. Gespendete Originale kamen nicht zurück (`mediaItems` leer) |
| App beendet, 4. Lauf (4×)  | `handleInApp`   | ✅ **4/4 an ReactTube, 4/4 Originale** mit `normalizeSiriQuery`. Extension → Siri-Completion 0,7–1,1 s. Siri hörte zweimal „in the Tube“ statt „in React Tube“ (danach ebenfalls bereinigt)                                                                    |
| „Spiele Test …“ (App lief) | `continueInApp` | ✅ App in den Vordergrund, Siri verstand „Test Tube“, Wiedergabe gestartet                                                                                                                                                                                     |
| „Suche Lo-Fi …“            | `continueInApp` | – kein `INSearchForMediaIntent` im Log, nicht angekommen oder nicht getestet                                                                                                                                                                                   |

**Wichtigste Erkenntnisse**

1. **Unter iOS 27 verbindet das System beim Siri-Hintergrundstart eine Scene**
   (`connectedScenes=1`, `applicationState=background`, schon beim ersten
   `handlerFor`). React startet also ganz normal über `ExpoAppSceneDelegate`,
   inklusive `YoutubeContextProvider`/PoToken — **ein Headless-Start ist nicht
   nötig**. Das Kernproblem aus Abschnitt 1 tritt so nicht auf; Phase 2
   schrumpft auf Timeout/Fehlerpfade. (Auf älteren iOS-Versionen und am
   Sperrbildschirm noch prüfen; der Headless-Pfad bleibt als Fallback im
   Modul.)
2. **Kaltstart ist schnell genug:** Im Erfolgsfall vergehen vom Aufruf der
   Extension bis zur Siri-Completion ≈ 1,1 s (JS bereit nach 0,17 s). Die
   ≈ 6 s aus dem ersten Lauf waren der erste Start nach der Installation; das
   8-s-Timeout ist im Normalfall unkritisch.
3. **Siris App-Zuordnung im beendeten Zustand:** Im 2. Lauf wurde die
   Extension bei den Fehlschlägen gar nicht aufgerufen; Siri leitete an Amazon
   Music weiter oder machte eine Websuche. **Behoben im 3. Lauf (4/4)** durch
   `CFBundleDisplayName` „ReactTube“ (vorher „reacttube“; in `app.json` unter
   `ios.infoPlist`, gilt auch für tvOS) **und** Spenden jedes gespielten Titels
   als `INPlayMediaIntent`-Interaction (`SiriMedia.donatePlayback`, Phase 5
   vorgezogen). Welche der beiden Maßnahmen den Ausschlag gab, ist nicht
   getrennt gemessen. Die leeren `.music`-Requests aus dem 1. Lauf traten
   nicht wieder auf; leere Anfragen trotzdem wie in 4.1 beantworten statt mit
   `notFound`.
4. **Siri lässt den App-Namen im Suchbegriff** („… in React Tube“, „… von
   React Tube“, „Test Tube“). → `src/siri/normalizeSiriQuery.ts` (getestet in
   `test/siri-query-normalize.test.mjs`) schneidet den App-Namen samt
   Verbindungswort am Ende ab; Teil von Phase 1 (`parseSiriRequest`) und im
   Spike schon aktiv. Auch „… in the Tube“ wird entfernt (nur mit
   Verbindungswort davor, damit Titel wie „Down the Tube“ bleiben). „Test
   Tube“ (Name verschmolzen) lässt sich so nicht sicher erkennen.
5. **Gespendete Items kommen nicht als `mediaItems` zurück**, Siri schickt
   weiterhin nur `mediaName`. Um bereits gespielte Originale zu bevorzugen,
   braucht es den lokalen Abgleich (Verlauf/Bibliothek) im Ranking (Phase 1/3).

**Fazit:** Siri-Wiedergabe funktioniert in allen drei App-Zuständen
(Vordergrund, Hintergrund, beendet) über `.handleInApp`, ohne Headless-Start.
Phase 1 kann direkt mit `.handleInApp` statt `.continueInApp` starten; Phase 2
reduziert sich auf Timeout-/Fehlerpfade und den Sperrbildschirm.

**Offen (in Phase 1 aufgenommen):** `.continueInApp` beim Kaltstart,
`INSearchForMediaIntent`, Sperrbildschirm/AirPods, Siri-Ansage des gespielten
Titels (Response ohne `INMediaItem` → Siri schweigt).

### Phase 1 — MVP: „Spiele _X_“ und „Suche _X_“

Abweichung vom ursprünglichen Plan nach Phase 0: Wiedergabe läuft direkt über
`.handleInApp` (funktioniert auch bei beendeter App), nicht über
`.continueInApp`.

- [x] Extension mit `INPlayMediaIntent` + `INSearchForMediaIntent`,
      leichte Auflösung; Wiedergabe `.handleInApp`, Suche `.continueInApp`.
      Ist Siri-Wiedergabe in den Einstellungen aus (App-Group-Wert
      `siriPlaybackEnabled`), antwortet sie `.failureRequiringAppLaunch`.
- [x] Expo-Modul mit Pending-Queue, Event, `completeRequest` (inkl.
      `nowPlayingInfo` für Siris Ansage), `setPlaybackEnabled`,
      `donatePlayback`.
- [x] `parseSiriRequest` + `rankSiriSearchResults` + Tests
      (`test/siri-request-parse.test.mjs`, `test/siri-result-ranking.test.mjs`,
      Fixtures aus den Phase-0-Logs).
- [x] `resolveSiriRequest` für Song (Fallback Video), Künstler (Shuffle,
      sonst Radio), Album, öffentliche Playlist und leere Anfrage (laufende
      Wiedergabe fortsetzen, sonst erster Titel der Music-Startseite).
- [x] Bridge-Hook in `App.tsx` innerhalb von `MusicPlayerContext`. Nach dem
      Start erscheint nur der Mini-Player (Entscheidung zu Frage 3).
- [x] `initialQuery` für beide Suchscreens; „Suche _X_“ öffnet die
      Musiksuche, bei Musikvideo-Hinweis die Videosuche (Frage 2), über den
      neuen `navigationRef` (`src/navigation/navigationRef.ts`).
- [x] `INAlternativeAppNames` („React Tube“), `NSSiriUsageDescription`
      in en/de (`assets/locales/*.json` → `InfoPlist.strings`);
      Siri-Berechtigung beim ersten Aktivieren des Schalters.
- [x] Settings „Siri“ (nur iPhone/iPad) mit „Musik mit Siri abspielen“ und
      „Wiedergabe an Siri melden“, beide standardmäßig **aus** (Opt-in,
      Entscheidung des Nutzers); Texte in en/de.
- [x] Spike-Reste entfernt: „test“-Schalter, Berechtigungsabfrage beim
      Start, Logdateien (nur noch `os_log` / `Logger.extend("SIRI")`).
- [~] Gerätetest (2026-10-16, iPhone 15 Pro, App beendet):
  Song ✅ (Original), Künstler ✅, Album ❌ → behoben (Album-/Playlist-
  Treffer haben nur eine `playlistId`; Start jetzt mit dem ersten Track,
  Playlist bleibt Warteschlange), „Spiele ReactTube“ ❌ → behoben
  (kam als `mediaName` „Red Tube“), „Suche …“ ❌ (s. u.), Schalter aus ✅
  (Siri öffnet die App; jetzt direkt in den Siri-Einstellungen). Siri sagt
  den gestarteten Titel trotz `nowPlayingInfo` nicht an.
- [x] Nachtest (2026-10-16): Album ✅ (erster Track, Album als
      Warteschlange), „Spiele ReactTube“ ✅ (setzt die Wiedergabe fort).
      `CFBundleSpokenName` „React Tube“ hilft **nicht**: „Suche …“ landet
      weiter bei Apple Music → Suche per Sprache über App Shortcuts
      (Phase 5); die Suche per Media Intent bleibt eingebaut und greift,
      sobald Siri den Namen erkennt.

#### Erkenntnis aus den Systemlogs: Siri erkennt „ReactTube“ nicht als Namen

Ausgewertet mit `sudo log collect --device-udid …` (Prozess
`assistant_service`, Subsystem `com.apple.siri.audio`):

- Bei jeder Wiedergabe wählte Siri ReactTube nur per **Vorhersage**
  (`resolutionResultType: Inferred`, `appInferred: true`) aus Signalen wie
  Now Playing, Nutzung und Spenden — nie als ausdrücklich genannte App.
  Deshalb wirken die Spenden, und deshalb landet der App-Name im
  `mediaName` („… in React Tube“, „… in the Tube“, „Red Tube“, „A nightat the
  Opera Cube“).
- `INSearchForMediaIntent` hat keine Vorhersage: Siri bestimmt die App nur aus
  der Äußerung und fällt sonst auf Apple Music zurück
  (`resolutionResultType: Default`), obwohl ReactTube mit
  `INSearchForMediaIntent` registriert ist. „Suche … in ReactTube“ kann so
  nicht funktionieren, solange Siri den Namen nicht erkennt.
- Versuch: `CFBundleSpokenName` „React Tube“ (`app.json`, neben
  `INAlternativeAppNames`) — ohne Wirkung auf die Suche (ohne iPhone-Neustart
  getestet). Nächster Schritt: App Shortcuts (Phase 5).
- Die Info-Logs von App/Extension landen nicht im persistenten Log; die
  Siri-Meldungen loggen deshalb auf `notice` (inkl. gemeldetem Titel beim
  Abschluss).

### Phase 2 — Echte Hintergrund-Wiedergabe

- [x] Extension auf `.handleInApp` umstellen (bereits in Phase 0/1
      vorgezogen; Voraussetzung für Sperrbildschirm, AirPods, HomePod,
      CarPlay-Sprachbefehl).
- [x] Audio-Session: `index.js` ruft `setupMusicPlayer()` schon beim Laden des
      Bundles auf, also vor jedem Screen und auch beim Headless-Start; die
      Bridge ruft es vor der Wiedergabe zusätzlich auf (idempotent).
- [x] Timeout-/Fehlerpfade:
  - Das Modul gibt Requests, auf die Siri wartet, eine `deadline` mit (8 s
    für Media Intents, 20 s für App Intents). JS prüft sie vor der Suche und
    vor dem Start (`src/siri/siriRequestDeadline.ts`) und spielt nach Siris
    Timeout nichts mehr ab;
  - `completeRequest` hat ein `detail` (Grund und Dauer), das nativ im
    Systemlog landet (`complete … detail=song, 412 ms`); auch verspätete
    Antworten werden mit Grund geloggt;
  - JS loggt jeden Ausgang über `Logger.extend("SIRI")` mit Quelle, Weg und
    Dauer.
- [x] Gerätetest (2026-10-17, iPhone gesperrt, App beendet): „Spiele
      Bohemian Rhapsody in ReactTube“ ✅ (Kaltstart bis Antwort 739 ms),
      „Setze ReactTube fort“ ✅ (letzter Track nach Kaltstart). AirPods noch
      nicht getestet.
- [x] Headless-React-Start: Auch bei gesperrtem iPhone verbindet iOS 27 eine
      Scene (`startIfNeeded scenes=1 jsRuntime=false`), der Headless-Pfad
      wird dort nicht gebraucht. Der Code (`SiriHeadlessHost`, Übernahme der
      Root-View durch die Scene) bleibt als Absicherung für iOS 16.4–26 und
      Starts ohne Scene (z. B. HomePod/CarPlay), ist dort aber ungetestet.

### Phase 3 — Bibliothek, Downloads, Vokabular

Abweichung vom ursprünglichen Plan: Der Abgleich mit Playlists und Downloads
läuft in der App (JS) statt in der Extension, ein App-Group-Snapshot entfällt.
Die Extension kann ohnehin nichts abspielen; seit Phase 0 übernimmt die App
jede Anfrage per `.handleInApp`. So gibt es nur eine Abgleichslogik (mit
`normalizeSiriQuery`/`normalizeForMatch` und Tests), und sie arbeitet immer
auf dem aktuellen Stand der Datenbank statt auf einem womöglich veralteten
Snapshot.

- [x] `matchSiriLibrary` (`src/siri/matchSiriLibrary.ts`, Tests in
      `test/siri-library-match.test.mjs`):
  - Playlist-Anfragen gegen lokale und Account-Playlists (exakter Name nach
    Normalisierung, Füllwörter wie „meine Playlist“ entfernt, lokale
    gewinnen);
  - Song-Anfragen ohne Künstler auch gegen Playlist-Namen (Siri meldet sie
    oft ohne Typ);
  - Song-Anfragen gegen Downloads (Ranking-Score ≥ 100, also exakter Titel
    und kein abweichender Künstler).
- [x] `resolveSiriRequest` prüft die Bibliothek vor der YouTube-Suche:
  - ein Download wird bevorzugt, sobald er eindeutig passt
    (`setPlaylistViaLocalDownload`, funktioniert auch offline);
  - lokale Playlist: Start mit dem ersten Track, die Warteschlange kommt aus
    der Datenbank;
  - Account-Playlist: `music.getPlaylist` (ohne „VL“-Präfix), erster Track.
- [x] `loadSiriLibrary` liest lokale Playlists und Downloads bei jeder Anfrage
      frisch aus SQLite; die erste Seite der Account-Playlists lädt
      `useSiriLibrarySync` einmal pro Start (nur angemeldet und mit
      aktivierter Siri-Wiedergabe).
- [x] `INVocabulary.setVocabularyStrings` (`.mediaPlaylistTitle`) mit allen
      Playlist-Namen und `INMediaUserContext.numberOfLibraryItems`
      (Playlists + Downloads) über `updateLibraryContext`; beides wird
      geleert, wenn die Siri-Wiedergabe aus ist.
- [x] Gerätetest (2026-10-17): lokale Playlist „Test“ ✅ (10 ms),
      heruntergeladener Song „Bleed It Out“ ✅ (21 ms).
  - Account-Playlist: Siri meldete „Today Hardstyle“ statt „hardstyle
    today“; ohne exakten Treffer lief die öffentliche Suche → Playlist-Namen
    werden jetzt unabhängig von der Wortreihenfolge verglichen.
  - Der erste Versuch scheiterte an „Die Netzwerkverbindung wurde
    unterbrochen“ (Verbindung aus dem Hintergrund) → einmalige Wiederholung,
    solange Siris Frist nicht abgelaufen ist.
  - Das Log nennt jetzt `account playlist` statt nur `playlist`.
  - Flugmodus ❌: Siri erkennt die Sprache auf dem Gerät, gibt die Anfrage
    aber nicht an ReactTube weiter (keine App-Auswahl, kein Aufruf der
    Extension). Media Intents brauchen offenbar Siris Server; in der App ist
    das nicht lösbar. Zu prüfen: der Kurzbefehl „Spiele Musik in ReactTube“,
    den Siri auf dem Gerät erkennt (`PARSER_IDENTIFIER_SHORTCUTS_EXACT`).
- [x] Nachtests (2026-10-17):
  - Kurzbefehl „Spiele Musik in ReactTube“ → „Bleed It Out“ im Flugmodus ✅
    (Download, 21 ms): offline geht nur der Kurzbefehl, nicht der freie
    Satz.
  - Account-Playlists kamen anfangs nicht an (`0 account playlists`): Die
    TV-Bibliothek liefert eigene Playlists als Kacheln mit Watch-Endpunkt
    (Extraktion: `"mix"`), und die Abfrage lief vor der Anmeldung
    (`autoLoginFinished`). Beides behoben; danach `15 account playlists`,
    19 Namen im Vokabular.
  - Siri verhörte „Today's Hardstyle“ trotz Vokabular ständig („Today's
    Hits“, „Today's Hits Hardstyle Inacio“, „Today Hardstyle Indirect Tube“,
    „Today Hardstyle Interactive“). Deshalb:
    - Playlist-Wörter ohne Apostroph und End-„s“, Reihenfolge egal;
    - eine Playlist mit mindestens zwei Wörtern passt auch, wenn alle ihre
      Wörter im Gesprochenen stecken (die meisten Treffer gewinnen,
      Ein-Wort-Titel nur exakt);
    - „Indirect Tube“/„in direct Tube“ gilt als App-Name.
  - Danach dreimal hintereinander ✅ („Today's Hardstyle“, 17–34 ms).
  - Das Log nennt beim Rückfall auf die Suche die Bibliotheksgröße
    (`library: 5 local, 15 account playlists, 3 downloads`).

### Phase 4 — Queue, Optionen, Affinität

- [x] Wiedergabe-Optionen (`src/siri/parseSiriPlaybackOptions.ts`, Tests in
      `test/siri-playback-options.test.mjs`):
  - `playShuffled` → `setShuffle`, `playbackRepeatMode` → `setRepeat`
    (`RepeatOne`/`RepeatAll`/aus), beides nur, wenn Siri es mitschickt, und
    vor dem Start gesetzt;
  - `playbackQueueLocation` `.next`/`.later` → `addAsNextItem` hinter dem
    aktuellen Titel (Song oder Download; „später“ wie „als Nächstes“, der
    Player kann nicht ans Ende anhängen). Läuft nichts oder ist es eine
    Playlist, startet die Wiedergabe sofort.
  - `reference=.currentlyPlaying` ohne Namen („Spiele mehr davon“) → Radio
    des aktuellen Titels (`RDAMVM<videoId>`).
- [x] `INUpdateMediaAffinityIntent` (Like/Dislike) und `INAddMediaIntent`:
  - Beide kennen kein `.handleInApp`, deshalb meldet die App sie selbst an
    (`INIntentsSupported` in der App-`Info.plist` über `withSiri.js`), und
    `SiriMediaIntentRouter` behandelt sie in der App;
  - Ziel ist ein gespendetes Element (`rt:video:`) oder der laufende Titel;
  - Like/Dislike über `youtubeTV.interact.like/dislike` wie die Buttons;
  - „Zu meiner Playlist _X_“ über `findSiriLibraryPlaylist` und
    `saveVideoToPlaylist` (lokal oder Account), „zur Mediathek“ als Like
    (YouTube Music führt Songs dort unter „Mag ich“).
- [x] Gerätetest (2026-10-17):
  - „Spiele Queen zufällig“: Zufall ✅, aber Siri schickte „Queen“ ohne Typ
    → Song „QUEEN“ (Kanaria) → ein bloßer Name mit Zufall gilt jetzt als
    Künstler.
  - „Spiele Take on Me als Nächstes“: angenommen (`queued next`), stand aber
    nicht in Up Next → ohne Warteschlange startet der Song jetzt sofort; das
    Log nennt Länge der Warteschlange und Position. Nachtest offen.
  - „Spiele mehr davon“: Siri schickte Künstler „Ina Tube“ (verhörtes „in
    ReactTube“) → INNA; „Ina Tube“ gilt jetzt als App-Name (dann: weiter
    abspielen). Siri setzt `reference=.currentlyPlaying` nicht, der
    Radio-Pfad bleibt ungetestet.
  - „Dieser Song gefällt mir nicht“ ✅ (Dislike, in der App behandelt).
  - „Füge das zu meiner Playlist Test hinzu“: Siri machte daraus eine
    Erinnerung (`INAddTasksIntent`, Liste „Playlist Test“). Außerdem führt
    Siris Media-Flow ReactTube nur mit den Intents der Extension → Die
    Extension meldet `INAddMediaIntent` jetzt an (`.handleInApp`, Ziel
    ohne Playlist = Mediathek); in der App-`Info.plist` steht nur noch
    `INUpdateMediaAffinityIntent`.
- [x] Nachtest (2026-10-17): „Spiele Queen zufällig“ ✅ (Künstler Queen),
      „Ich mag diesen Song“ ✅ (Like), „Füge diesen Song … zu meiner
      Playlist Test hinzu“ ✅ (lokale Playlist, 137 ms).
  - „Als Nächstes“ klappte erst beim zweiten Versuch (nach dem Fix
    nachgetestet ✅). Ursache in
    `MusicPlayerContext.fetchMorePlaylistData`: Das Nachladen der
    Warteschlange (hier 50 → 350 Einträge) schrieb sie aus einem veralteten
    Stand zurück und verwarf den eingefügten Titel; betraf auch „Als Nächstes
    spielen“ in der App → hängt jetzt an den aktuellen Stand an.
  - Die Position in der lokalen Playlist wirkte willkürlich:
    `insertVideosIntoPlaylist` vergab die Anzahl der Einträge als Position,
    nach einem Entfernen also doppelte Werte → jetzt höchste Position + 1,
    nacheinander eingefügt.
  - Siri schickte einmal „React Tube“ als Playlist-Namen; der Name läuft
    jetzt durch `normalizeSiriQuery`, ein reiner App-Name antwortet mit
    „nicht gefunden“.

### Phase 5 — Vorschläge und Kurzbefehle

- [x] Gespielte Titel als `INPlayMediaIntent`-Interaction spenden
      (in Phase 0/1 vorgezogen, Schalter „Wiedergabe an Siri melden“).
- [ ] **App Shortcuts, damit Siri den App-Namen erkennt** (vorgezogen nach
      Phase 1, höchste Priorität dieser Phase). Siri ordnet ReactTube bisher
      nur per Vorhersage zu (siehe Erkenntnis in Phase 1); App-Shortcut-
      Phrasen mit `\(.applicationName)` registrieren den Namen ausdrücklich.
      Umfang:
  - App Intents im App-Target (Swift, über das Config-Plugin bzw. das
    Expo-Modul): `SearchMusicIntent` (Suchbegriff als Parameter, öffnet die
    Musiksuche mit `initialQuery`), `PlayMusicIntent` (`AudioPlaybackIntent`,
    Suchbegriff per Rückfrage, nutzt dieselbe JS-Bridge wie die Media
    Intents), `ResumeIntent`.
  - `AppShortcutsProvider` mit Phrasen in en/de
    (`AppShortcuts.xcstrings`), z. B. „Suche in \(.applicationName)“,
    „Spiele Musik in \(.applicationName)“, „Weiter in
    \(.applicationName)“.
  - Prüfen, ob die Shortcut-Registrierung auch die Erkennung für die
    Media Intents verbessert (`resolutionResultType` im Systemlog wird dann
    `Explicit` statt `Inferred`).
  - Ab iOS 27 alternativ die App-Schema-Domain `.audio` (`PlayAudioIntent`)
    prüfen (siehe Abschnitt 2).

#### Umsetzung App Shortcuts (2026-10-17)

- [x] `plugins/ios/siri/ReactTubeAppIntents.swift`, vom Config-Plugin ins
      App-Target kopiert (Metadaten werden nur dort extrahiert, nicht aus dem
      Pod):
  - `SearchMusicIntent` (öffnet die App, Suchbegriff per Rückfrage, Musiksuche
    mit `initialQuery`),
  - `PlayMusicIntent` (Suchbegriff per Rückfrage, spielt im Hintergrund, Siri
    sagt „_Titel_ von _Künstler_ wird abgespielt“),
  - `ResumeMusicIntent` (wie „Spiele ReactTube“),
  - `ReactTubeShortcuts` mit je drei Phrasen.
- [x] Beide Wiedergabe-Intents sind ab iOS 17 per bedingter Konformanz
      `AudioPlaybackIntent`. `if #available` im `AppShortcutsBuilder` braucht
      iOS 17.4, das Deployment-Target ist 16.4.
- [x] Phrasen in en (Code) und de (`plugins/ios/siri/AppShortcutPhrases.json`
      → `Supporting/de.lproj/AppShortcuts.strings`; `AppShortcuts.xcstrings`
      verlangt iOS 17). Titel, Rückfragen, Ansagen und Fehler in
      `Localizable.xcstrings`.
- [x] Gleiche JS-Bridge wie die Media Intents:
  - `SiriMediaAppIntentBridge` (Pod) legt Requests mit `source: "appIntent"`
    in die Pending-Queue, Timeout 20 s statt 8 s;
  - ist React noch nicht gestartet, greift der Headless-Start
    (`AppDelegate.makeHeadlessReactRootView()`);
  - Siri-Wiedergabe aus: Wiedergabe-Intents sagen das an, die Suche öffnet die
    Siri-Einstellungen;
  - `parseSiriRequest` behandelt die Requests wie Media Intents ohne Typ.
- [x] Tests: Plugin (App-Target statt Watch-Target, String-Katalog-Dateityp,
      idempotent, jede Phrase übersetzt), Parser für App-Shortcut-Requests.
- [x] Gerätetest (2026-10-17, iPhone 15 Pro, iOS 27): „Suche in ReactTube“
      ✅, „Spiele Musik in ReactTube“ ✅ (auch bei beendeter App), drei
      Einträge in der Kurzbefehle-App ✅. Siri erkennt die Phrasen exakt
      (`PARSER_IDENTIFIER_SHORTCUTS_EXACT`).
  - „Setze ReactTube fort“ bei beendeter App spielte den ersten Titel der
    Startseite, weil der Musik-Player nichts über einen Neustart speichert →
    behoben: Die Bridge merkt sich den zuletzt gespielten Track
    (`src/siri/lastPlayedTrack.ts`, MMKV, unabhängig von den Spenden) und
    startet ihn neu (ohne Position). Nachtest ✅.
  - „Suche Queen in ReactTube“ ❌ → Apple TV. Unter iOS 27 übernimmt der
    neue Planer solche freien Sätze (`PARSER_IDENTIFIER_PSC`,
    `intelligenceflowd`, `appintents:fetch actions by protocol`) statt der
    Media Intents. Er sucht Aktionen nach System-Protokollen; unsere Intents
    erfüllen keines. Nächster Schritt: App-Schema-Domain `.audio` (s. u.).
    Ein freier Suchbegriff in der Phrase selbst geht mit App Shortcuts nicht,
    die erlauben dort nur `AppEntity`/`AppEnum`-Parameter.

#### Umsetzung App Schemas für iOS 27 (2026-10-17)

- [x] `plugins/ios/siri/ReactTubeAudioSchemaIntents.swift` (nur iOS 27, vom
      Config-Plugin ins App-Target kopiert):
  - `.system.searchInApp` (`SystemSearchInAppIntent`) öffnet die Musiksuche
    mit `criteria.term`; gedacht für „Suche _X_ in ReactTube“;
  - `.audio.playAudio` (`PlayAudioIntent`) mit `AudioItem` (Union aus Song,
    Album, Künstler, Playlist), gedacht für „Spiele _X_ in ReactTube“;
  - Entities `.audio.song/.album/.artist/.playlist`. Ihre `EntityStringQuery`
    liefert nur einen Platzhalter mit dem gesprochenen Namen
    (`search:<Name>`); YouTube Music ist nur aus JavaScript erreichbar, die
    Suche läuft deshalb erst beim Ausführen über die bestehende Bridge (mit
    dem Medientyp aus dem Union-Fall);
  - Pflichttypen des Schemas: `WarmupAudioQueueResult`,
    `PlaybackAttributes`, `QueueInsertionLocation`, `PlaylistOwner` (Union
    aus `IntentPerson` und `String`). Shuffle, Wiederholen und Queue-Position
    werden noch nicht ausgewertet.
- [x] Das Makro prüft das Schema nicht; Fehler meldet erst
      `appintentsmetadataprocessor` beim Build (z. B. falscher Typ von
      `owner`, fehlende Query für `WarmupAudioQueueResult`). Die Metadaten
      enthalten beide Intents mit `assistantDefinedSchemas` (`system`/`audio`).
- [~] Gerätetest (2026-10-17): Keine der fünf Anfragen erreichte die
  Schema-Intents.
  - Die drei Wiedergaben (Bohemian Rhapsody, Queen, Queen bei beendeter App)
    liefen weiter über SiriKit (`play from siriKit`,
    `resolutionResultType: Inferred`).
  - Beide Suchversuche kamen nicht in ReactTube an: einer ging per Media
    Intent an Apple Music (`Default`), einer an Apple TV.
  - Bei jeder Anfrage meldet `intelligenceflowd` „Tool retrieval failed“ /
    „Tool Retrieval Model not found in OTA asset“ (dazu fehlt das
    `planner.patches`-Asset). Der Planer kann auf diesem Gerät also gar keine
    App-Intents von Dritt-Apps finden, die Schema-Intents bleiben unsichtbar.
    Ursache liegt auf Systemseite (Asset nicht geladen, evtl. Beta oder
    Sprache de-DE); erneut testen, sobald das Asset da ist.
- [ ] Optional Siri-Vorschläge/„Zuletzt gespielt“ auf Sperrbildschirm und
      Watch über `INUpcomingMediaManager`.

### Phase 6 — Weitere Plattformen (optional, eigener Spike)

Siehe Abschnitt 8.

---

## 7. Tests

| Ebene           | Was                                                                    | Wie                                                              |
| --------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Unit (Node)     | `parseSiriRequest`, `rankSiriSearchResults`, Identifier-Serialisierung | `test/*.test.mjs`, `npm test`                                    |
| Extension       | Auflösung mit Beispiel-Utterances                                      | Xcode-Scheme der Extension, „Siri Intent Query“ im Scheme setzen |
| Manuell (Gerät) | Matrix unten                                                           | Siri auf Deutsch **und** Englisch                                |
| Regression      | normale Musik-Wiedergabe, Watch-Sync, Downloads                        | bestehende Maestro-Flows                                         |

Testmatrix (manuell):

|                                     | App im Vordergrund | App im Hintergrund | App beendet | Gesperrt | Offline              |
| ----------------------------------- | ------------------ | ------------------ | ----------- | -------- | -------------------- |
| Song                                |                    |                    |             |          | (nur Download)       |
| Künstler                            |                    |                    |             |          | –                    |
| Playlist (Account/lokal)            |                    |                    |             |          | (nur lokal/Download) |
| Leere Anfrage                       |                    |                    |             |          |                      |
| Suche                               |                    |                    |             | –        | –                    |
| Nicht eingeloggt + „meine Playlist“ |                    |                    |             |          |                      |

Maestro kann Siri nicht ansprechen; die Siri-Strecke bleibt manuell.

---

## 8. Plattformen

- **iPhone/iPad:** Hauptziel dieses Plans.
- **tvOS:** Media Intents existieren seit tvOS 14 (Siri Remote: „Spiele _X_ in
  ReactTube“). Eigene Extension im TV-Build (`isTV: true`), Ziel ist
  `MusicPlayerContext.tv.tsx`. Fokus-/Remote-Verhalten darf dadurch nicht
  leiden. Eigener Spike, erst nach Phase 2.
- **watchOS:** Siri auf der Uhr könnte heruntergeladene Titel/Playlists direkt
  im Swift-Player (`MusicPlayerManager.swift`) abspielen — ohne iPhone. Für
  Streaming hängt das an `WATCH_YOUTUBE_API_PLAN.md`. Eigener Plan, wenn
  gewünscht.
- **Android:** nicht im Scope; der passende Weg wäre
  `MediaSession.onPlayFromSearch` (Assistant/Android Auto).

---

## 9. Risiken

| Risiko                                                                           | Auswirkung                                         | Gegenmaßnahme                                                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Headless-React-Start funktioniert mit Scene-Lifecycle/Expo nicht sauber          | kein `.handleInApp` → kein Sperrbildschirm/HomePod | Phase 1 mit `.continueInApp` liefert trotzdem Nutzen; Spike entscheidet                                                   |
| JS-Kaltstart + YouTube-Session + PoToken zu langsam für Siri-Timeout             | Siri meldet Fehler, obwohl es später spielt        | Completion früh mit „wird gestartet“ beantworten, wenn Suche erfolgreich; Sessions/Visitor-Data cachen; Timeout-Verwerfen |
| Siri versteht „reacttube“ nicht                                                  | Intent landet bei Apple Music                      | `INAlternativeAppNames`, ggf. `CFBundleDisplayName` „ReactTube“                                                           |
| Siri-Entitlement ohne bezahlten Account nicht verfügbar                          | keine Umsetzung möglich                            | in Phase 0 klären                                                                                                         |
| Mehrdeutige Suchtreffer (Cover, Live, Remix)                                     | falscher Titel                                     | Ranking mit Typ- und Künstler-Match, Tests mit realen Fixtures                                                            |
| `INMediaSearch.mediaName` unzuverlässig bei Playlists (bekanntes Siri-Verhalten) | Playlist wird nicht gefunden                       | Vokabular registrieren, Fallback auf Freitextsuche                                                                        |
| App-Group-Snapshot veraltet                                                      | Extension löst falsch auf                          | Snapshot versionieren, App prüft IDs beim Abspielen erneut                                                                |

---

## 10. Offene Fragen

1. Gibt es einen bezahlten Apple-Developer-Account mit echter Team-ID für
   Siri-Entitlement und App Group?
2. Soll Siri nur Musik starten, oder soll „Suche _X_“ standardmäßig die
   Video-Suche statt der Musik-Suche öffnen?
3. Soll nach einem Siri-Start im Vordergrund automatisch der
   `MusicPlayerScreen` geöffnet werden oder nur der Mini-Player erscheinen?
4. Prioritäten nach dem MVP: Hintergrundstart (Phase 2) vor
   Bibliothek/Vokabular (Phase 3), oder umgekehrt? Und tvOS/watchOS überhaupt?
