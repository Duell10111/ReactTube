# Plan: Videowiedergabe reparieren (SmartTube-Niveau) + SABR-Support

> Stand: 2026-09-18 · Branch: `sdk-57-migration`
> Betroffene Repos:
> - App: `/Users/kospaeth/Git/React-Native/reacttube` (GPL-3.0)
> - Library-Fork: `/Users/kospaeth/Git/YouTube.js` (`@duell10111/youtubei.js@18.0.0-beta.1`, MIT)
> - Referenz: `/Users/kospaeth/Git/SmartTube` (MIT; `exoplayer-amzn-2.10.6/**` Apache-2.0)

## 0. Getroffene Entscheidungen

| # | Entscheidung | Konsequenz für den Plan |
|---|---|---|
| 1 | **Apple TV hat Priorität** | Der HLS-Pfad (Phase 3) ist der kritische Pfad. Android/DASH läuft als Mitnahme nebenher und wird in Phase 7 auf Parität gebracht. |
| 2 | **Fork via `file:`-Dependency** | `"youtubei.js": "file:../../YouTube.js"` + Metro `watchFolders`; npm-Beta-Releases erst zum Abschluss. |
| 3 | **Lokaler Server als lokales Expo-Modul (Nitro)** | Eigenes Modul `modules/media-server/` statt `react-native-tcp-socket`. Swift/`NWListener` für tvOS, Kotlin/NanoHTTPD für Android. |
| 4 | **SABR sofort mitziehen** | SABR ist kein optionaler Anhang mehr, sondern Phase 6 auf dem Hauptpfad. Damit wird PoToken (Phase 5) zur Pflicht, und der HLS-Generator wird von Anfang an mit zwei Ausgabemodi gebaut (Byte-Range *und* Segment-URLs). |
| 5 | **Lizenzen unkritisch** | SmartTube ist MIT, die SABR-Library Apache-2.0 — beides in GPL-3.0-App **und** MIT-Fork verwendbar. Direkte Portierung erlaubt, Copyright-Header/NOTICE erhalten. |

---

## 1. Ausgangslage (Ist-Analyse)

### 1.1 Wie die App heute abspielt

| Schritt | Ort | Verhalten |
|---|---|---|
| Session | `src/hooks/useYoutube.ts:26` | `Innertube.create({lang})` — **ohne** `cache`, **ohne** `visitor_data`, **ohne** `po_token`, kein Session-Reuse über App-Starts |
| Player-Response | `src/hooks/useVideoDetails.ts:47-99` | TV-Pfad: `tv.getInfo()` + optional `getInfo({client:"IOS"})` nur für HLS/Chapters. Phone-Pfad: `getInfo({client: hlsEnabled ? "IOS" : undefined})` |
| Formatwahl | `src/extraction/YTElements.ts:61-73` und `:132-144` | `chooseFormat({type:"video+audio", quality:"best"})` → **nur muxed Formate** (itag 18/22 ⇒ max. 360p/720p), Fallback audio-only |
| URL | `src/hooks/useVideoDetails.ts:114-131` | `format.decipher(session.player)` |
| Quelle | `src/screens/VideoScreen.tsx:102` (analog Phone/Tablet/Reel) | `hlsManifestUrl ?? httpVideoURL` |
| Player | `src/components/video/VideoPlayerNative.tsx:36` | `react-native-video` 6.19.2, eine einzige URI |

### 1.2 Die konkreten Defekte

1. **Kein adaptives Streaming.** Es wird immer genau *eine* URL an den Player gegeben. Ohne YouTube-HLS bedeutet das muxed ⇒ 360p/720p, kein Audio-Sprachwechsel, kein Qualitätswechsel. (Das `PlayerResolutionSelector`-Setting "HTTP vs HLS" ist genau dieser Workaround.)
2. **Kein Client-Fallback.** Liefert der TV-Client keine Formate (zunehmend häufig: nur noch `server_abr_streaming_url`), ist das Video tot — es gibt keine zweite Chance. SmartTube rotiert über 9 Clients (`VideoInfoService.java:34-52`).
3. **Decipher ist unter Hermes fragil.** Der RN-Shim nutzt `new Function(code)()` (`src/ytjs/react-native.ts:106-124`). Hermes unterstützt kein `eval`/`new Function` aus Strings ⇒ jeder Client, dessen Formate `signatureCipher`/`n`-Param brauchen (alle WEB-Varianten), fällt hart aus. Nur Clients mit Klartext-URLs (IOS/VISIONOS/ANDROID_VR/TV) funktionieren zufällig. **In Phase 0 zu verifizieren.**
4. **Kein PoToken / kein stabiles visitorData.** Damit sind WEB/WEB_EMBEDDED (Altersfreigabe, Geo-Fixes) faktisch gesperrt und Streams werden schneller mit 403 gedrosselt. SmartTube: `PoTokenGate.kt` + `potokennp2/generators/PoTokenWebView*.kt`.
5. **Kein Expiry-Handling.** `streaming_data.expires` wird geparst, aber der Refresh-Code ist auskommentiert (`useVideoDetails.ts:134-158`) ⇒ lange Videos/Pausen enden im Abbruch.
6. **Keine Fehler-Ladder.** `onError` des Players führt zu keinem Client-/Format-Wechsel (SmartTube: `switchNextFormat()`).
7. **SABR wird ignoriert.** `server_abr_streaming_url` + `video_playback_ustreamer_config` werden vom Fork bereits geparst (`src/parser/parser.ts:440`, `ParsedResponse.ts:158`), aber nirgends genutzt.

### 1.3 Was SmartTube anders macht (Referenzkarte)

| Thema | SmartTube-Datei | Kernidee |
|---|---|---|
| Client-Rotation | `MediaServiceCore/.../videoinfo/V2/VideoInfoService.java:34-52, 129-148` | Feste Prioritätsliste, `firstPlayable()`, merkt sich den zuletzt erfolgreichen Client |
| Kaputte Clients | `.../common/helpers/AppClient.kt:113` | `isPlaybackBroken` = WEB\*, MWEB, GEO, IOS, ANDROID_VR, TV_EMBED — "TODO: remove after implement SABR" |
| Downgrade-Trick | `AppClient.kt:44` `TV_DOWNGRADED` | TVHTML5 mit *alter* Client-Version + alter Cobalt-UA ⇒ non-tcl Player, einfachere nSig |
| PoToken | `app/PoTokenGate.kt`, `app/potokennp2/generators/PoTokenWebView*.kt`, `PoTokenV8.kt` | BotGuard in WebView bzw. V8; getrennt *session*- und *content*-Token, Cache + Reset-Cooldown |
| nSig | `app/nsigsolver/impl/V8ChallengeProvider.kt`, `VideoInfoServiceBase.java:52-80` | **Bulk**-Auflösung aller n/sig-Parameter in *einem* Engine-Call |
| Adaptive Wiedergabe | `.../formatbuilders/mpdbuilder/YouTubeMPDBuilder.java` | Eigenes MPD aus adaptive Formats ⇒ ExoPlayer macht ABR, Mehrsprachigkeit, 4K |
| HLS-Extra | `VideoInfoService.java:276-295` (`applyFixesIfNeeded`) | Für High-Bitrate zusätzlich iOS-HLS nachladen und ins Ergebnis mergen |
| **SABR** | `exoplayer-amzn-2.10.6/library/sabr/**` — `parser/ump/UMPDecoder.java`, `parser/SabrProcessor.java`, `parser/SabrStream.java`, 25 `.proto` | Vollständige SABR-Implementierung als eigene ExoPlayer-Source. **Unsere wichtigste Vorlage für Phase 6.** |

### 1.4 Plattform-Randbedingung (bestimmt die Architektur)

| Plattform | Player | DASH? | HLS? | Getrennte Audio/Video-Spuren? |
|---|---|---|---|---|
| **tvOS / iOS (Priorität)** | AVPlayer | ❌ | ✅ | nur via HLS |
| Android (TV) | ExoPlayer via `react-native-video` | ✅ | ✅ | ✅ |

⇒ Auf Apple-Geräten führt kein Weg an HLS vorbei. Da YouTube ein HLS-Manifest nur für manche Clients/Videos liefert, brauchen wir einen **eigenen HLS-Generator** — das Pendant zu SmartTubes MPD-Builder. SmartTubes SABR-Source lässt sich auf Apple **nicht** übernehmen (kein ExoPlayer), weshalb SABR dort zwingend über den lokalen Server als Proxy laufen muss.

---

## 2. Zielbild

```
              ┌────────────────────────────────────────────────┐
              │ App: usePlaybackSource (neu)                   │
              │  1) Client-Kette  2) Quelle bauen  3) Ladder   │
              └───────┬────────────────────────┬───────────────┘
                      │                        │
   @duell10111/youtubei.js (file:)      modules/media-server (Expo/Nitro)
   ├ getPlayableInfo(clients[])         ├ GET /hls/:t/master.m3u8      ← Apple
   ├ decipherMany()          (NEU)      ├ GET /hls/:t/:fmt.m3u8
   ├ toDash()                (da)       ├ GET /dash/:t.mpd             ← Android
   ├ toHLS()                 (NEU)      ├ GET /seg/:t/:fmt/:n.m4s      ← SABR-Segmente
   ├ Mp4SidxParser           (NEU)      └ (Loopback, zufälliger Port)
   └ SabrStream + UMP        (NEU) ─────────────┘
                      │
              react-native-video  →  AVPlayer (m3u8) | ExoPlayer (mpd)
```

**Akzeptanzkriterien (Definition of Done)**
- [ ] 1080p–4K auf Apple TV **ohne** den "HLS"-Schalter, auch wenn YouTube kein HLS-Manifest liefert
- [ ] Adaptive Qualitätsumschaltung + Audiosprachwahl auf Apple TV
- [ ] Testset aus 12 Videos (siehe 3.1) spielt zu 100 % — inkl. Altersfreigabe, Live, Multi-Audio, Shorts, Musik
- [ ] Bei Format-/Client-Ausfall wechselt die App automatisch, Wiedergabeposition bleibt erhalten
- [ ] Ablaufende Stream-URLs werden vor Ablauf erneuert
- [ ] **SABR spielt auf Apple TV** (Video + Audio + Seek), Android folgt
- [ ] Android TV erreicht Feature-Parität (DASH + SABR)

---

## 3. Umsetzung

### Phase 0 — Diagnose & Testharness *(~1–2 Tage, blockiert alles)*

0.1 **Hermes-Check (blockierend).** Dev-Button in der App: `new Function("return 1+1")()` sowie ein echter `format.decipher()`-Aufruf im **Release**-Build auf Apple TV. Ergebnis entscheidet, ob 1.7 (JS-Engine) Pflicht ist.
0.2 **Client-Matrix-Test im Fork.** Neu: `tests/playback-matrix.test.ts` (vitest ist eingerichtet). Für Video-Set × Client (`IOS`, `VISIONOS`, `ANDROID_VR`, `TV`, `TV_DOWNGRADED`, `TV_SIMPLY`, `TV_EMBEDDED`, `WEB_EMBEDDED`, `MWEB`, `WEB`) protokollieren:
   `playability_status` · Anzahl `formats`/`adaptive_formats` · `url` vs. `signature_cipher` · **`server_abr_streaming_url` vorhanden?** · **`video_playback_ustreamer_config` vorhanden?** · `hls_manifest_url` · max. Höhe · HTTP-`HEAD` (200/403/429) · unterstützt der Host `Range`?
   Ausgabe nach `docs/playback-matrix.md`.
0.3 **SABR-Recon (neu, wegen Entscheidung 4).** Ebenfalls in 0.2 erfassen: welche Clients liefern **nur noch** SABR? Für einen davon einmalig einen rohen `POST` auf die `server_abr_streaming_url` mit minimalem `VideoPlaybackAbrRequest` absetzen und die UMP-Antwort hexdumpen — bestätigt Protos und Pflichtfelder, bevor Phase 6 startet.
0.4 **In-App-Logging.** `Logger.extend("PLAYBACK")` in `useVideoDetails.ts` + `onError` in `VideoPlayerNative.tsx`: Client, itag, Fehlercode, URL-Host, `expires`.

**Testvideos:** Standard, 4K/HDR, VP9-only, AV1-only, altersbeschränkt, geo-beschränkt, Live, Post-Live-DVR, Multi-Audio, Shorts, YT-Music-Track, langes Video (>3 h).

---

### Phase 1 — Fork-Anbindung, Session-Härtung, Client-Fallback *(~3–4 Tage)*

1.1 **`file:`-Anbindung (Entscheidung 2).** `package.json`: `"youtubei.js": "file:../../YouTube.js"`; `metro.config.js`: `config.watchFolders = [path.resolve(__dirname, "../../YouTube.js")]`; `tsc --watch` im Fork (`npm run watch`) für Live-Builds nach `dist/`. Stolperfalle: Metro löst `file:`-Symlinks nur mit `unstable_enableSymlinks` sauber auf — falls es hakt, `dist/` per `resolver.extraNodeModules` direkt mappen.
1.2 **`TV_DOWNGRADED`** in `src/utils/Constants.ts` + `HTTPClient.ts#adjustContext` (ab Z. 206) ergänzen, in `SUPPORTED_CLIENTS` aufnehmen. Vorbild `AppClient.kt:44`.
1.3 **UA-Header für TV-Clients.** `HTTPClient.ts:95-104` setzt `User-Agent` bisher nur für ANDROID/IOS/ANDROID_VR/VISIONOS. TV_DOWNGRADED funktioniert nur mit passender alter Cobalt-UA.
1.4 **`Innertube#getPlayableInfo(target, { clients, accept })`** (neu, `src/core/clients/PlaybackResolver.ts`): iteriert die Kette, bricht beim ersten `accept()`-Treffer ab (Default: `status === 'OK'` **und** verwertbares Video-Format), zweiter Durchlauf mit gelockertem Prädikat (analog `firstPlayable()`); liefert `{ info, client, attempts[] }`. Der heutige Ad-hoc-Merge "TV für Metadaten + IOS für Streams" (`useVideoDetails.ts:52-78`) wandert als Merge-Hook hier hinein.
1.5 **`Player#decipherMany(urls)`** (`src/core/Player.ts`): alle `n`/`sig` in **einem** `Platform.shim.eval`-Call (Vorbild `VideoInfoServiceBase.decipherFormats`). Ohne das kostet ein Manifest mit ~40 Formaten 40 Engine-Aufrufe. `MediaInfo.ts` (`getStreamingInfo`/`toDash`) darauf umstellen.
1.6 **Session persistieren (App).** `useYoutube.ts`: `Innertube.create({ lang, cache: new UniversalCache(true), visitor_data })`; `visitor_data` einmalig erzeugen und in MMKV ablegen (der auskommentierte Code dort ist der richtige Ansatz). Player-Cache läuft über den bestehenden MMKV-`Cache` (`src/ytjs/react-native.ts:17`).
1.7 **Falls 0.1 negativ:** JS-Engine für den Player-Code — `react-native-webview` (wird für Phase 5 ohnehin gebraucht, daher erste Wahl), alternativ QuickJS via `react-native-nitro-modules` (bereits Dependency). Andockpunkt bleibt `eval` in `src/ytjs/react-native.ts:106`.
1.8 **`src/hooks/video/usePlaybackSource.ts`** (neu): kapselt Client-Kette, Quelle, Fehler-Ladder. `useVideoDetails.ts` verliert `httpVideoURL`/`best_format`. Aufrufer: `VideoScreen.tsx:102`, `VideoScreenPhone.tsx:51`, `VideoScreenTablet.tsx:62`, `ReelVideoScreen.tsx:131`.

---

### Phase 2 — `modules/media-server` als lokales Expo-Modul *(~4–6 Tage, Apple zuerst)*

Gerüst: `npx create-expo-module@latest --local media-server` ⇒ `modules/media-server/` mit `ios/`, `android/`, `expo-module.config.json`. JS-Bindings über Nitro (`react-native-nitro-modules` ist bereits Dependency); Expo-Autolinking übernimmt den Rest, kein Pod-Handanlegen nötig.

2.1 **API (JS).**
```ts
startServer(): Promise<{ port: number; token: string }>   // Loopback, zufälliger Port
registerText(path: string, body: string, contentType: string): void  // Manifeste
registerSabrSource(path: string, handlerId: string): void            // Phase 6
stopServer(): Promise<void>
```
2.2 **tvOS/iOS (Swift).** Minimaler HTTP/1.1-Server auf `NWListener` (Network.framework, ab tvOS 12) — ~300 Zeilen, keine Fremd-Dependency. Muss beherrschen: `GET`, `HEAD`, `Range` (Byte-Ranges, `206 Partial Content`), `Content-Length`, Keep-Alive.
   **Pflichtdetails, sonst spielt AVPlayer nicht:**
   - Content-Type `application/vnd.apple.mpegurl` für `.m3u8`, `video/iso.segment` für `.m4s`
   - `Info.plist`: `NSAppTransportSecurity → NSAllowsLocalNetworking = true` (via `expo-build-properties` oder Config-Plugin des Moduls)
   - Loopback (`127.0.0.1`) löst **keine** Local-Network-Berechtigungsabfrage aus — kein Prompt für den Nutzer
   - Lebensdauer an den Video-Screen koppeln; bei Hintergrund-Audio (`UIBackgroundModes: audio` ist gesetzt) muss der Listener weiterlaufen
2.3 **Android (Kotlin).** NanoHTTPD (Apache-2.0, eine Datei) oder handgeschrieben auf `ServerSocket`; gleiche Range-Semantik.
2.4 **Spike zuerst (Risikoabbau).** Bevor der Generator gebaut wird: ein **handgeschriebenes** Master-Playlist für ein bekanntes Video über den Server an AVPlayer geben und prüfen, ob (a) das Playlist akzeptiert wird, (b) AVPlayer Byte-Ranges direkt gegen `googlevideo.com` stellt, (c) Audio/Video-Sync stimmt. Schlägt das fehl, ändert sich Phase 3 grundlegend — deshalb hier und nicht später.

---

### Phase 3 — `toHLS()` im Fork + Apple-TV-Wiedergabe *(~5–7 Tage, Kernstück)*

3.1 **`src/utils/Mp4SidxParser.ts`** (neu, Voraussetzung). AVPlayer kann — anders als ExoPlayer bei DASH `SegmentBase` — kein `sidx` selbst auflösen; die Playlist muss Segmente explizit auflisten. Also: pro exponierter Rendition **einen** Range-Request auf `index_range` (wenige KB, parallel), `sidx`-Box parsen ⇒ Segmentgrenzen + Dauern. Ergebnis cachen.
3.2 **`src/utils/HlsManifest.ts`** (neu), gespeist aus derselben `getStreamingInfo()`-Struktur wie `DashManifest.tsx`:
   - Master: `EXT-X-STREAM-INF` pro Video-Rendition; `EXT-X-MEDIA:TYPE=AUDIO` pro Sprache inkl. DRC-/Voice-Boost-Labels (die `StreamingInfoOptions` sieht die Labels schon vor, `src/types/StreamingInfoOptions.ts`)
   - Media-Playlists: `EXT-X-MAP` aus `init_range`, Segmente aus 3.1
   - `#EXT-X-VERSION:7`, `#EXT-X-INDEPENDENT-SEGMENTS`, `#EXT-X-PLAYLIST-TYPE:VOD`
   - Untertitel als `EXT-X-MEDIA:TYPE=SUBTITLES` (WebVTT, `captions_format:'vtt'`)
   - **Zwei Ausgabemodi (wegen Entscheidung 4 von Anfang an):**
     `mode: 'byterange'` → `#EXT-X-BYTERANGE` direkt auf die googlevideo-URL (Player lädt bei YouTube)
     `mode: 'segments'` → `/seg/:token/:fmt/:n.m4s` auf den lokalen Server (Phase 6, SABR)
   - Live/Post-Live: **nicht** generieren, YouTubes `hls_manifest_url`/`dash_manifest_url` verwenden (`toDash()` macht das bereits so, `MediaInfo.ts:113`)
3.3 **App-Anbindung.** `usePlaybackSource` baut das Manifest, legt es per `registerText()` ab, gibt `{uri, type:"m3u8"}` an `VideoPlayerNative.tsx`. `selectedAudioTrack` auf Sprach-Auswahl statt Index umstellen, `selectedVideoTrack` an das Qualitätslimit koppeln.
3.4 **Android mitnehmen.** `toDash()` existiert — Manifest über `registerText()`, `{uri, type:"mpd"}`. Feinschliff in Phase 7.
3.5 **Settings umbauen.** `PlayerResolutionSelector`: statt "HTTP | HLS" künftig *Max. Qualität* (Auto/4K/1440p/1080p/720p), *Codec-Präferenz* (AV1/VP9/H264 — auf Apple TV HW-Decoding beachten), *Audiosprache*, *Stable Volume*. Alt-Keys `hlsEnabled`/`localHlsEnabled` migrieren.
3.6 **Mitziehen:** `useDownloadProcessor.ts:64` und der Musik-Pfad (`useVideoDataGenerator.ts:24-64`) auf die neue Formatauswahl (Audio-only statt muxed) umstellen.

---

### Phase 4 — Robustheit wie SmartTube *(~2–3 Tage)*

4.1 **Fehler-Ladder** in `usePlaybackSource`, ausgelöst von `onError`:
   1. Quelle neu aufbauen (URL-Refresh) → 2. nächster Client (SmartTube `switchNextFormat`) → 3. PoToken-Cache leeren + Client wiederholen (ab Phase 5) → 4. YouTubes eigenes HLS → 5. muxed Format als letzte Rettung.
   Jeder Schritt behält die Position (`getCurrentPositionSeconds()` existiert in `VideoComponentRefType`).
4.2 **Expiry-Refresh.** Timer auf `streaming_data.expires` − 60 s ⇒ Player-Response neu holen, Manifest im Server ersetzen, an gleicher Position weiterspielen (ersetzt den auskommentierten Block `useVideoDetails.ts:134-158`).
4.3 **Manuelle Umschaltung** + Anzeige von Client/itag/Auflösung im Overlay (Debug-Hilfe wie SmartTubes Format-Switch).
4.4 **Persistenz** des zuletzt erfolgreichen Clients in MMKV (`persistRecentTypeIfNeeded`-Äquivalent).

---

### Phase 5 — PoToken (BotGuard) *(~3–5 Tage, Pflicht für Phase 6)*

5.1 `react-native-webview` + unsichtbares WebView, das die BotGuard-Challenge löst. Portierung von `potokennp2/generators/PoTokenWebView.kt` + `misc/JavaScriptUtil.kt` (MIT — direkte Übernahme mit Copyright-Hinweis zulässig).
5.2 Trennung wie in SmartTube: **session**-PoT (aus `visitorData`, für Streaming-URLs `&pot=`) und **content**-PoT (aus `videoId`, für den Player-Request), Cache + Reset-Cooldown (`PoTokenGate.kt:96-116`).
5.3 Fork: `getPlayableInfo` reicht pro Client den passenden PoT durch (`Innertube.getInfo` unterstützt `options.po_token` bereits, `Innertube.ts:104`); nur für `isWebPotRequired`-Clients anfordern.
5.4 **Für SABR essenziell:** der PoToken geht dort **als Bytes** in den Request-Payload, nicht base64-kodiert als Query-Param — siehe Hinweis in `src/core/Player.ts:204`.

---

### Phase 6 — SABR *(~1,5–2,5 Wochen, Hauptpfad)*

6.1 **Protos.** `protos/sabr/**` aus `SmartTube/exoplayer-amzn-2.10.6/library/sabr/src/main/proto/` übernehmen (Apache-2.0, Header erhalten; die Schemata selbst sind Googles): `video_playback_abr_request`, `client_abr_state`, `media_header`, `format_initialization_metadata`, `sabr_redirect`, `sabr_error`, `sabr_seek`, `sabr_context_update`, `sabr_context_sending_policy`, `next_request_policy`, `stream_protection_status`, `buffered_range`, `streamer_context`, `playback_cookie`, `time_range`, `media_capabilities`, `ump_part_id`. Generierung über das vorhandene `npm run build:proto` (`@bufbuild/protobuf` ist Dependency).
6.2 **UMP-Decoder** `src/core/sabr/UmpDecoder.ts` — VarInt-Part-Header, Part-Dispatch. 1:1-Semantik aus `parser/ump/UMPDecoder.java`.
6.3 **`src/core/sabr/SabrStream.ts`** — Portierung von `SabrProcessor.java`/`SabrStream.java`: `ClientAbrState` fortschreiben, `MediaHeader`/`FormatInitializationMetadata` verarbeiten, `SabrRedirect` folgen, `SabrContextUpdate` anwenden, `NextRequestPolicy` respektieren, `StreamProtectionStatus` auswerten (⇒ PoToken erneuern).
   Eingaben: `server_abr_streaming_url` + `player_config.media_common_config.media_ustreamer_request_config.video_playback_ustreamer_config` (beide parst der Fork bereits, `parser.ts:434-442`) + PoToken aus Phase 5.
6.4 **Manifest.** `getStreamingInfo(..., { is_sabr: true })` erzeugt bereits `sabr://video?key=…` (`StreamingInfo.ts:332-338`). `toHLS({ mode:'segments' })` bzw. `toDash()` mappen diese Keys auf `/seg/:token/:fmt/:n.m4s`.
6.5 **SABR-Proxy im Modul.** `registerSabrSource()` hängt einen JS-Handler an einen Pfad; der Server ruft ihn pro Segment-Request auf, der Handler zieht das Segment aus dem `SabrStream` und liefert die Bytes zurück.
   **Designentscheidung:** Auf Apple **Segment-URLs statt Byte-Ranges** — SABR liefert von Natur aus segmentweise, eine Byte-Range→SABR-Übersetzung wäre unnötig komplex und puffer-lastig. Deshalb der zweite Ausgabemodus aus 3.2.
   Ein `SabrStream` pro Wiedergabe; Prefetch für die nächsten n Segmente, damit AVPlayer nicht stallt.
6.6 **Flag & Fallback.** Setting "SABR (experimentell)", bei Fehler automatisch zurück auf den Phase-3-Pfad (Stufe 4 der Ladder). Zuerst Apple TV, dann Android.

---

### Phase 7 — Android-Parität & Abschluss *(~3–4 Tage)*

- Android TV: DASH-Pfad + SABR verifizieren; laut README ist die Android-TV-UI ohnehin baustellig — hier nur der Wiedergabe-Teil.
- Fork-Tests: Snapshot-Tests für `toHLS()` gegen fixierte `streaming_data`-Fixtures, Unit-Tests für `Mp4SidxParser` und `UmpDecoder`, `getPlayableInfo`-Tests; Matrix-Test aus 0.2 als wiederkehrender Check.
- `README.md`-Feature-Tabelle aktualisieren (die Zeilen "bis 720p" / "4K nur mit HLS-Toggle" entfallen).
- Aufräumen: `best_format` (`src/extraction/Types.ts:148`, `YTElements.ts`), tote `localHlsEnabled`-Pfade, `failbackURL`-Hack in `VideoComponent.tsx`.
- Fork-Release: `npm run build` → `@duell10111/youtubei.js@18.0.0-beta.2` veröffentlichen, `file:` in `package.json` wieder gegen die Version tauschen.
- `NOTICE`/Header-Check für die aus SmartTube übernommenen Teile (MIT bzw. Apache-2.0).

---

## 4. Reihenfolge & Aufwand

```
0 Diagnose ─▶ 1 Fork/Session/Fallback ─▶ 2 media-server ─▶ 3 toHLS + Apple TV ─▶ 4 Robustheit
                                                                                      │
                                                          7 Android + Abschluss ◀─ 6 SABR ◀─ 5 PoToken
```

Nach **Phase 3** ist das Kernversprechen erfüllt ("spielt wie SmartTube" auf Apple TV). Phase 5+6 sind wegen Entscheidung 4 fest eingeplant, nicht optional.

| Phase | Aufwand | Risiko |
|---|---|---|
| 0 Diagnose | 1–2 T | niedrig |
| 1 Fork/Session/Fallback | 3–4 T | mittel (JS-Engine, falls Hermes blockt) |
| 2 media-server (Expo/Nitro) | 4–6 T | mittel (erstes eigenes Nativ-Modul im Projekt) |
| 3 toHLS + Apple TV | 5–7 T | **hoch** (Neuentwicklung, AVPlayer ist wählerisch) |
| 4 Robustheit | 2–3 T | niedrig |
| 5 PoToken | 3–5 T | hoch (BotGuard ändert sich häufig) |
| 6 SABR | 1,5–2,5 W | **sehr hoch** (undokumentiert, aber mit Apache-2.0-Vorlage machbar) |
| 7 Android + Abschluss | 3–4 T | niedrig |

**Gesamt: ~7–9 Wochen** bei Vollzeit, davon ~3 Wochen bis zur spürbaren Verbesserung auf Apple TV (Ende Phase 3).

## 5. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Hermes kann den Player-Code nicht ausführen | Phase 0.1 zuerst; WebView-Engine als Plan B (für Phase 5 ohnehin nötig) |
| AVPlayer akzeptiert generiertes HLS nicht | Spike 2.4 **vor** dem Generator; scheitert er, bleibt als Rückfall nur YouTubes eigenes HLS + muxed |
| `sidx`-Requests bremsen den Start | Nur für tatsächlich exponierte Renditions, parallel, Ergebnis cachen; notfalls Renditions auf 4–5 begrenzen |
| Lokaler Server auf tvOS (Sandbox/Background/ATS) | `NSAllowsLocalNetworking`, Loopback-only, Lebensdauer an den Screen gekoppelt; Hintergrund-Audio explizit testen |
| SABR-Protokoll ändert sich | Protos und `ClientAbrState`-Felder isoliert halten; Flag + automatischer Fallback auf Phase 3 |
| YouTube ändert Clients/Player wöchentlich | Client-Liste/Versionen als konfigurierbare Konstanten; Matrix-Test als Frühwarnsystem |
| `file:`-Dependency + Metro-Caching | Bei unerklärlichen Fehlern `npx expo start -c`; Fork-`dist/` per `extraNodeModules` mappen |
| Regressionen in Musik/Download/Watch-App | Phase 3.6 fest eingeplant, nicht nachgelagert |
