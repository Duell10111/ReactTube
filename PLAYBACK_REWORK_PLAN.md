# Plan: Videowiedergabe reparieren (SmartTube-Niveau) + SABR-Support

> Stand: 2026-09-18 · Branch: `sdk-57-migration`
> Betroffene Repos:
> - App: `/Users/kospaeth/Git/React-Native/reacttube` (GPL-3.0)
> - Library-Fork: `/Users/kospaeth/Git/YouTube.js` (`@duell10111/youtubei.js@18.0.0-beta.1`, MIT)
> - Referenz: `/Users/kospaeth/Git/SmartTube` (MIT; `exoplayer-amzn-2.10.6/**` Apache-2.0)

## 0. Getroffene Entscheidungen

| # | Entscheidung | Konsequenz für den Plan |
|---|---|---|
| 1 | **Apple TV hat Priorität** | Der HLS-Pfad ist der kritische Pfad. Android/DASH läuft als Mitnahme und wird in Phase 7 auf Parität gebracht. |
| 2 | **Fork via `file:`-Dependency** | `"youtubei.js": "file:../../YouTube.js"` + Metro `watchFolders`; npm-Beta-Release erst zum Abschluss. |
| 3 | **Lokaler Server als lokales Expo-Modul (Nitro)** | Wird gebaut — aber **erst wenn er gebraucht wird**: für SABR zwingend (Phase 3), für die adaptive Zwischenlösung nur, falls der serverlose `file://`-Weg (2.0) scheitert. |
| 4 | **SABR sofort mitziehen** | SABR ist Phase 6 auf dem Hauptpfad, nicht optionaler Anhang. Damit wird PoToken (Phase 5) zur Pflicht, und der HLS-Generator entsteht von Anfang an mit zwei Ausgabemodi. |
| 5 | **Lizenzen unkritisch** | SmartTube ist MIT, die SABR-Library Apache-2.0 — beides in GPL-3.0-App **und** MIT-Fork verwendbar. Direkte Portierung erlaubt, Copyright-Header/NOTICE erhalten. |

**Leitgedanke der Reihenfolge:** Die adaptiven Formate → HLS (Phase 2) sind die *Zwischenlösung auf dem Weg zu SABR*, nicht ein konkurrierender Ansatz. Derselbe Generator, dieselbe Player-Anbindung; SABR tauscht später nur die Segmentquelle aus. Nichts an Phase 2 ist Wegwerfarbeit.

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
2. **Kein Client-Fallback.** Liefert der TV-Client keine Formate (zunehmend häufig: nur noch `server_abr_streaming_url`), ist das Video tot. SmartTube rotiert über 9 Clients (`VideoInfoService.java:34-52`).
3. **Decipher ist unter Hermes fragil.** Der RN-Shim nutzt `new Function(code)()` (`src/ytjs/react-native.ts:106-124`). Hermes unterstützt kein `eval`/`new Function` aus Strings ⇒ jeder Client, dessen Formate `signatureCipher`/`n`-Param brauchen (alle WEB-Varianten), fällt hart aus. **In Phase 0 zu verifizieren.**
4. **Kein PoToken / kein stabiles visitorData.** WEB/WEB_EMBEDDED (Altersfreigabe, Geo-Fixes) faktisch gesperrt, Streams werden schneller mit 403 gedrosselt.
5. **Kein Expiry-Handling.** `streaming_data.expires` wird geparst, der Refresh-Code ist auskommentiert (`useVideoDetails.ts:134-158`).
6. **Keine Fehler-Ladder.** `onError` führt zu keinem Client-/Format-Wechsel (SmartTube: `switchNextFormat()`).
7. **SABR wird ignoriert.** `server_abr_streaming_url` + `video_playback_ustreamer_config` parst der Fork bereits (`src/parser/parser.ts:440`, `ParsedResponse.ts:158`), genutzt wird nichts davon.

### 1.3 Was SmartTube anders macht (Referenzkarte)

| Thema | SmartTube-Datei | Kernidee |
|---|---|---|
| Client-Rotation | `MediaServiceCore/.../videoinfo/V2/VideoInfoService.java:34-52, 129-148` | Feste Prioritätsliste, `firstPlayable()`, merkt sich den zuletzt erfolgreichen Client |
| Kaputte Clients | `.../common/helpers/AppClient.kt:113` | `isPlaybackBroken` = WEB\*, MWEB, GEO, IOS, ANDROID_VR, TV_EMBED — "TODO: remove after implement SABR" |
| Downgrade-Trick | `AppClient.kt:44` `TV_DOWNGRADED` | TVHTML5 mit *alter* Client-Version + alter Cobalt-UA ⇒ non-tcl Player, einfachere nSig |
| PoToken | `app/PoTokenGate.kt`, `app/potokennp2/generators/PoTokenWebView*.kt` | BotGuard in WebView; getrennt *session*- und *content*-Token, Cache + Reset-Cooldown |
| nSig | `app/nsigsolver/impl/V8ChallengeProvider.kt`, `VideoInfoServiceBase.java:52-80` | **Bulk**-Auflösung aller n/sig-Parameter in *einem* Engine-Call |
| Adaptive Wiedergabe | `.../formatbuilders/mpdbuilder/YouTubeMPDBuilder.java` | Eigenes MPD aus adaptive Formats ⇒ ABR, Mehrsprachigkeit, 4K. **Direkte Vorlage für Phase 2.** |
| HLS-Extra | `VideoInfoService.java:276-295` (`applyFixesIfNeeded`) | Für High-Bitrate zusätzlich iOS-HLS nachladen und ins Ergebnis mergen |
| **SABR** | `exoplayer-amzn-2.10.6/library/sabr/**` — `parser/ump/UMPDecoder.java`, `parser/SabrProcessor.java`, `parser/SabrStream.java`, 25 `.proto` | Vollständige SABR-Implementierung. **Vorlage für Phase 6.** |

### 1.4 Plattform-Randbedingung (bestimmt die Architektur)

| Plattform | Player | DASH? | HLS? | Getrennte Audio/Video-Spuren? |
|---|---|---|---|---|
| **tvOS / iOS (Priorität)** | AVPlayer | ❌ | ✅ | nur via HLS |
| Android (TV) | ExoPlayer via `react-native-video` | ✅ | ✅ | ✅ |

⇒ Auf Apple-Geräten führt kein Weg an HLS vorbei. SmartTubes SABR-Source lässt sich dort **nicht** übernehmen (kein ExoPlayer), weshalb SABR auf Apple zwingend über den lokalen Server als Proxy läuft.

---

## 2. Zielbild

```
              ┌────────────────────────────────────────────────┐
              │ App: usePlaybackSource (neu)                   │
              │  1) Client-Kette  2) Quelle bauen  3) Ladder   │
              └───────┬────────────────────────┬───────────────┘
                      │                        │
   @duell10111/youtubei.js (file:)      Quelle der Manifeste/Segmente
   ├ getPlayableInfo(clients[])         Phase 2:  file:// (cacheDirectory)
   ├ decipherMany()          (NEU)      Phase 3+: modules/media-server
   ├ Mp4SidxParser           (NEU)        ├ GET /hls/:t/master.m3u8
   ├ toHLS()                 (NEU)        ├ GET /dash/:t.mpd
   │   ├ mode 'byterange' → googlevideo   └ GET /seg/:t/:fmt/:n.m4s  ← SABR
   │   └ mode 'segments'  → lokal
   ├ toDash()                (da)
   └ SabrStream + UMP        (NEU)
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

0.1 **Hermes-Check (blockierend).** Dev-Button in der App: `new Function("return 1+1")()` sowie ein echter `format.decipher()`-Aufruf im **Release**-Build auf Apple TV. Entscheidet, ob 1.7 (JS-Engine) Pflicht ist.
0.2 **Client-Matrix-Test im Fork.** Neu: `tests/playback-matrix.test.ts` (vitest ist eingerichtet). Für Video-Set × Client (`IOS`, `VISIONOS`, `ANDROID_VR`, `TV`, `TV_DOWNGRADED`, `TV_SIMPLY`, `TV_EMBEDDED`, `WEB_EMBEDDED`, `MWEB`, `WEB`) protokollieren:
   `playability_status` · Anzahl `formats`/`adaptive_formats` · `url` vs. `signature_cipher` · **`index_range`/`init_range` vorhanden?** (entscheidet über Phase 2) · **`server_abr_streaming_url` vorhanden?** · `video_playback_ustreamer_config` · `hls_manifest_url` · max. Höhe · HTTP-`HEAD` (200/403/429) · `Range`-Support des Hosts.
   Ausgabe nach `docs/playback-matrix.md`.
0.3 **SABR-Recon.** Ebenfalls in 0.2 erfassen: welche Clients liefern **nur noch** SABR? Für einen davon einmalig einen rohen `POST` auf die `server_abr_streaming_url` mit minimalem `VideoPlaybackAbrRequest` absetzen und die UMP-Antwort hexdumpen — bestätigt Protos und Pflichtfelder vor Phase 6.
0.4 **In-App-Logging.** `Logger.extend("PLAYBACK")` in `useVideoDetails.ts` + `onError` in `VideoPlayerNative.tsx`: Client, itag, Fehlercode, URL-Host, `expires`.

**Testvideos:** Standard, 4K/HDR, VP9-only, AV1-only, altersbeschränkt, geo-beschränkt, Live, Post-Live-DVR, Multi-Audio, Shorts, YT-Music-Track, langes Video (>3 h).

---

### Phase 1 — Fork-Anbindung, Session-Härtung, Client-Fallback *(~3–4 Tage)*

1.1 **`file:`-Anbindung.** `package.json`: `"youtubei.js": "file:../../YouTube.js"`; `metro.config.js`: `watchFolders` auf den Fork; `npm run watch` im Fork für Live-Builds nach `dist/`. Stolperfalle: Metro löst `file:`-Symlinks nur mit `unstable_enableSymlinks` sauber auf — notfalls `dist/` per `resolver.extraNodeModules` mappen.
1.2 **`TV_DOWNGRADED`** in `src/utils/Constants.ts` + `HTTPClient.ts#adjustContext` (ab Z. 206) ergänzen, in `SUPPORTED_CLIENTS` aufnehmen. Vorbild `AppClient.kt:44`.
1.3 **UA-Header für TV-Clients.** `HTTPClient.ts:95-104` setzt `User-Agent` bisher nur für ANDROID/IOS/ANDROID_VR/VISIONOS; TV_DOWNGRADED funktioniert nur mit passender alter Cobalt-UA.
1.4 **`Innertube#getPlayableInfo(target, { clients, accept })`** (neu, `src/core/clients/PlaybackResolver.ts`): iteriert die Kette, bricht beim ersten `accept()`-Treffer ab (Default: `status === 'OK'` **und** verwertbares Video-Format), zweiter Durchlauf mit gelockertem Prädikat (analog `firstPlayable()`); liefert `{ info, client, attempts[] }`. Der heutige Ad-hoc-Merge "TV für Metadaten + IOS für Streams" (`useVideoDetails.ts:52-78`) wandert als Merge-Hook hierher.
1.5 **`Player#decipherMany(urls)`** (`src/core/Player.ts`): alle `n`/`sig` in **einem** `Platform.shim.eval`-Call (Vorbild `VideoInfoServiceBase.decipherFormats`). Ohne das kostet ein Manifest mit ~40 Formaten 40 Engine-Aufrufe. `MediaInfo.ts` darauf umstellen.
1.6 **Session persistieren (App).** `useYoutube.ts`: `Innertube.create({ lang, cache: new UniversalCache(true), visitor_data })`; `visitor_data` einmalig erzeugen und in MMKV ablegen (der auskommentierte Code dort ist der richtige Ansatz). Player-Cache läuft über den bestehenden MMKV-`Cache` (`src/ytjs/react-native.ts:17`).
1.7 **Falls 0.1 negativ:** JS-Engine für den Player-Code — `react-native-webview` (für Phase 5 ohnehin nötig, daher erste Wahl), alternativ QuickJS via `react-native-nitro-modules` (bereits Dependency). Andockpunkt bleibt `eval` in `src/ytjs/react-native.ts:106`.
1.8 **`src/hooks/video/usePlaybackSource.ts`** (neu): kapselt Client-Kette, Quelle, Fehler-Ladder. `useVideoDetails.ts` verliert `httpVideoURL`/`best_format`. Aufrufer: `VideoScreen.tsx:102`, `VideoScreenPhone.tsx:51`, `VideoScreenTablet.tsx:62`, `ReelVideoScreen.tsx:131`.

---

### Phase 2 — Adaptive Formats → HLS auf Apple TV *(~5–7 Tage, Zwischenlösung, komplett ohne Nativ-Code)*

Das ist der Schritt, der die Wiedergabe repariert. Er nutzt die klassischen `adaptive_formats` (getrennte Video-/Audio-Streams mit `init_range`/`index_range`) und gießt sie in ein HLS-Playlist — dasselbe, was SmartTube mit seinem MPD-Builder für ExoPlayer tut, nur im Format, das AVPlayer versteht.

2.0 **Serverlos-Spike zuerst (spart u. U. Phase 3 vorerst komplett).** Ein *handgeschriebenes* Master-Playlist für ein bekanntes Video in `expo-file-system` `cacheDirectory` schreiben und als `file://…/master.m3u8` an `react-native-video` geben. Zu prüfen:
   (a) akzeptiert AVPlayer ein lokales Playlist mit **remote** Segment-URLs?
   (b) stellt es die Byte-Range-Requests direkt gegen `googlevideo.com`?
   (c) stimmt A/V-Sync, funktioniert Seek?
   **Klappt es** → Phase 2 braucht kein Nativ-Modul, Phase 3 rutscht nach hinten und wird erst für SABR gebaut.
   **Klappt es nicht** → Phase 3 wird vorgezogen, der Rest von Phase 2 bleibt unverändert (nur die Ablage der Playlist wechselt von `file://` auf `http://127.0.0.1`).
   *Diesen Spike vor allem anderen machen — er kostet einen halben Tag und verschiebt ggf. eine Woche Arbeit.*

2.1 **`src/utils/Mp4SidxParser.ts` im Fork (der einzige echte Neubau).** Der Fork liefert für VOD heute nur `base_url + index_range + init_range` (`StreamingInfo.ts`, SegmentBase-Semantik) — ExoPlayer löst den `sidx` selbst auf, AVPlayer kann das nicht und braucht die Segmentliste explizit. Also: pro exponierter Rendition **ein** Range-Request auf `index_range` (wenige KB, parallel), `sidx`-Box parsen (Timescale, `reference_count`, je Eintrag `referenced_size` + `subsegment_duration`) ⇒ exakte Byte-Offsets und Dauern. Ergebnis cachen. ~150 Zeilen, gut dokumentiertes Boxformat, unit-testbar gegen ein Fixture.
   *Notnagel, falls ein Format kein `index_range` hat:* Ein-Segment-Playlist (ganze Datei als ein `EXTINF` + `EXT-X-BYTERANGE`). Spielt, aber Seek ist grob und ABR entfällt — nur als Fallback pro Format, nicht als Standard.

2.2 **`src/utils/HlsManifest.ts` im Fork**, gespeist aus derselben `getStreamingInfo()`-Struktur wie `DashManifest.tsx`. In drei lauffähigen Stufen, damit früh etwas spielt:
   - **2.2a — eine Video- + eine Audiorendition, kein ABR.** Master mit einem `EXT-X-STREAM-INF` + einem `EXT-X-MEDIA:TYPE=AUDIO`, Media-Playlists mit `EXT-X-MAP` (aus `init_range`) und den Segmenten aus 2.1. Beweist sidx, Muxing, A/V-Sync und Seek. **Ab hier spielt Apple TV in 1080p+.**
   - **2.2b — Multi-Rendition.** Alle sinnvollen Video-Renditions (ABR durch AVPlayer) + alle Audiospuren/Sprachen inkl. DRC-/Voice-Boost-Labels (`src/types/StreamingInfoOptions.ts` sieht die Labels bereits vor).
   - **2.2c — Untertitel** als `EXT-X-MEDIA:TYPE=SUBTITLES` (WebVTT, `captions_format:'vtt'`).
   Durchgängig: `#EXT-X-VERSION:7`, `#EXT-X-INDEPENDENT-SEGMENTS`, `#EXT-X-PLAYLIST-TYPE:VOD`.
   **Zwei Ausgabemodi von Anfang an** (damit Phase 6 den Generator nicht aufreißen muss):
   `mode:'byterange'` → `#EXT-X-BYTERANGE` direkt auf die googlevideo-URL (Player lädt bei YouTube) · `mode:'segments'` → `/seg/:token/:fmt/:n.m4s` auf den lokalen Server (SABR).
   Live/Post-Live: **nicht** generieren, YouTubes `hls_manifest_url` verwenden (`toDash()` macht das bereits so, `MediaInfo.ts:113`; OTF und Post-Live-DVR haben im Fork eigene Segment-Templates).

2.3 **App-Anbindung.** `usePlaybackSource` baut das Manifest, legt es ab (2.0) und gibt `{uri, type:"m3u8"}` an `VideoPlayerNative.tsx`. `selectedAudioTrack` auf Sprach-Auswahl statt Index umstellen, `selectedVideoTrack` an das Qualitätslimit koppeln.
2.4 **Android mitnehmen.** `toDash()` existiert — Manifest ablegen, `{uri, type:"mpd"}`. Feinschliff in Phase 7.
2.5 **Settings umbauen.** `PlayerResolutionSelector`: statt "HTTP | HLS" künftig *Max. Qualität* (Auto/4K/1440p/1080p/720p), *Codec-Präferenz* (AV1/VP9/H264 — HW-Decoding der Apple-TV-Generation beachten), *Audiosprache*, *Stable Volume*. Alt-Keys `hlsEnabled`/`localHlsEnabled` migrieren.
2.6 **Mitziehen:** `useDownloadProcessor.ts:64` und der Musik-Pfad (`useVideoDataGenerator.ts:24-64`) auf die neue Formatauswahl (Audio-only statt muxed) umstellen.

**Was Phase 2 nicht löst:** Clients, die gar keine `adaptive_formats` mehr liefern, sondern nur `server_abr_streaming_url`. Genau dafür kommt Phase 6 — die Zwischenlösung kauft Zeit und liefert die halbe Infrastruktur (Generator, Player-Anbindung, Settings, Ladder) gleich mit.

---

### Phase 3 — `modules/media-server` als lokales Expo-Modul *(~4–6 Tage; Auslöser: 2.0 scheitert **oder** Start von Phase 6)*

Gerüst: `npx create-expo-module@latest --local media-server` ⇒ `modules/media-server/` mit `ios/`, `android/`, `expo-module.config.json`. JS-Bindings über Nitro (`react-native-nitro-modules` ist bereits Dependency); Expo-Autolinking übernimmt den Rest.

3.1 **API (JS).**
```ts
startServer(): Promise<{ port: number; token: string }>   // Loopback, zufälliger Port
registerText(path: string, body: string, contentType: string): void  // Manifeste
registerSabrSource(path: string, handlerId: string): void            // Phase 6
stopServer(): Promise<void>
```
3.2 **tvOS/iOS (Swift).** Minimaler HTTP/1.1-Server auf `NWListener` (Network.framework, ab tvOS 12) — ~300 Zeilen, keine Fremd-Dependency. Muss beherrschen: `GET`, `HEAD`, `Range` (`206 Partial Content`), `Content-Length`, Keep-Alive.
   **Pflichtdetails, sonst spielt AVPlayer nicht:**
   - Content-Type `application/vnd.apple.mpegurl` für `.m3u8`, `video/iso.segment` für `.m4s`
   - `Info.plist`: `NSAppTransportSecurity → NSAllowsLocalNetworking = true` (via `expo-build-properties` oder Config-Plugin des Moduls)
   - Loopback (`127.0.0.1`) löst **keine** Local-Network-Berechtigungsabfrage aus
   - Lebensdauer an den Video-Screen koppeln; bei Hintergrund-Audio (`UIBackgroundModes: audio` ist gesetzt) muss der Listener weiterlaufen
3.3 **Android (Kotlin).** NanoHTTPD (Apache-2.0, eine Datei) oder handgeschrieben auf `ServerSocket`; gleiche Range-Semantik.
3.4 **Umschalten.** In `usePlaybackSource` nur die Ablage der Manifeste wechseln (`file://` → `http://127.0.0.1:<port>`); Generator und Player-Anbindung bleiben unberührt.

---

### Phase 4 — Robustheit wie SmartTube *(~2–3 Tage)*

4.1 **Fehler-Ladder** in `usePlaybackSource`, ausgelöst von `onError`:
   1. Quelle neu aufbauen (URL-Refresh) → 2. nächster Client (SmartTube `switchNextFormat`) → 3. PoToken-Cache leeren + Client wiederholen (ab Phase 5) → 4. YouTubes eigenes HLS → 5. muxed Format als letzte Rettung.
   Jeder Schritt behält die Position (`getCurrentPositionSeconds()` existiert in `VideoComponentRefType`).
4.2 **Expiry-Refresh.** Timer auf `streaming_data.expires` − 60 s ⇒ Player-Response neu holen, Manifest ersetzen, an gleicher Position weiterspielen (ersetzt den auskommentierten Block `useVideoDetails.ts:134-158`).
4.3 **Manuelle Umschaltung** + Anzeige von Client/itag/Auflösung im Overlay (Debug-Hilfe wie SmartTubes Format-Switch).
4.4 **Persistenz** des zuletzt erfolgreichen Clients in MMKV (`persistRecentTypeIfNeeded`-Äquivalent).

---

### Phase 5 — PoToken (BotGuard) *(~3–5 Tage, Pflicht für Phase 6)*

5.1 `react-native-webview` + unsichtbares WebView, das die BotGuard-Challenge löst. Portierung von `potokennp2/generators/PoTokenWebView.kt` + `misc/JavaScriptUtil.kt` (MIT — direkte Übernahme mit Copyright-Hinweis zulässig).
5.2 Trennung wie in SmartTube: **session**-PoT (aus `visitorData`, für Streaming-URLs `&pot=`) und **content**-PoT (aus `videoId`, für den Player-Request), Cache + Reset-Cooldown (`PoTokenGate.kt:96-116`).
5.3 Fork: `getPlayableInfo` reicht pro Client den passenden PoT durch (`Innertube.getInfo` unterstützt `options.po_token` bereits, `Innertube.ts:104`); nur für `isWebPotRequired`-Clients anfordern.
5.4 **Für SABR essenziell:** der PoToken geht dort **als Bytes** in den Request-Payload, nicht base64-kodiert als Query-Param — siehe `src/core/Player.ts:204`.

---

### Phase 6 — SABR *(~1,5–2,5 Wochen, Hauptpfad)*

6.1 **Protos.** `protos/sabr/**` aus `SmartTube/exoplayer-amzn-2.10.6/library/sabr/src/main/proto/` übernehmen (Apache-2.0, Header erhalten): `video_playback_abr_request`, `client_abr_state`, `media_header`, `format_initialization_metadata`, `sabr_redirect`, `sabr_error`, `sabr_seek`, `sabr_context_update`, `sabr_context_sending_policy`, `next_request_policy`, `stream_protection_status`, `buffered_range`, `streamer_context`, `playback_cookie`, `time_range`, `media_capabilities`, `ump_part_id`. Generierung über `npm run build:proto` (`@bufbuild/protobuf` ist Dependency).
6.2 **UMP-Decoder** `src/core/sabr/UmpDecoder.ts` — VarInt-Part-Header, Part-Dispatch. Semantik aus `parser/ump/UMPDecoder.java`.
6.3 **`src/core/sabr/SabrStream.ts`** — Portierung von `SabrProcessor.java`/`SabrStream.java`: `ClientAbrState` fortschreiben, `MediaHeader`/`FormatInitializationMetadata` verarbeiten, `SabrRedirect` folgen, `SabrContextUpdate` anwenden, `NextRequestPolicy` respektieren, `StreamProtectionStatus` auswerten (⇒ PoToken erneuern).
   Eingaben: `server_abr_streaming_url` + `player_config.media_common_config.media_ustreamer_request_config.video_playback_ustreamer_config` (beide parst der Fork bereits, `parser.ts:434-442`) + PoToken aus Phase 5.
6.4 **Manifest.** `getStreamingInfo(..., { is_sabr: true })` erzeugt bereits `sabr://video?key=…` (`StreamingInfo.ts:332-338`). `toHLS({ mode:'segments' })` bzw. `toDash()` mappen diese Keys auf `/seg/:token/:fmt/:n.m4s`.
6.5 **SABR-Proxy im Modul.** `registerSabrSource()` hängt einen JS-Handler an einen Pfad; der Server ruft ihn pro Segment-Request auf, der Handler zieht das Segment aus dem `SabrStream`.
   **Designentscheidung:** auf Apple **Segment-URLs statt Byte-Ranges** — SABR liefert von Natur aus segmentweise; eine Byte-Range→SABR-Übersetzung wäre unnötig komplex und puffer-lastig. Dafür existiert `mode:'segments'` aus 2.2.
   Ein `SabrStream` pro Wiedergabe; Prefetch der nächsten n Segmente, damit AVPlayer nicht stallt.
6.6 **Flag & Fallback.** Setting "SABR (experimentell)", bei Fehler automatisch zurück auf den Phase-2-Pfad (Stufe 4 der Ladder). Zuerst Apple TV, dann Android.

---

### Phase 7 — Android-Parität & Abschluss *(~3–4 Tage)*

- Android TV: DASH-Pfad + SABR verifizieren (die Android-TV-UI ist laut README ohnehin baustellig — hier nur der Wiedergabe-Teil).
- Fork-Tests: Snapshot-Tests für `toHLS()` gegen fixierte `streaming_data`-Fixtures, Unit-Tests für `Mp4SidxParser` und `UmpDecoder`, `getPlayableInfo`-Tests; Matrix-Test aus 0.2 als wiederkehrender Check.
- `README.md`-Feature-Tabelle aktualisieren (die Zeilen "bis 720p" / "4K nur mit HLS-Toggle" entfallen).
- Aufräumen: `best_format` (`src/extraction/Types.ts:148`, `YTElements.ts`), tote `localHlsEnabled`-Pfade, `failbackURL`-Hack in `VideoComponent.tsx`.
- Fork-Release: `npm run build` → `@duell10111/youtubei.js@18.0.0-beta.2`, `file:` gegen die Version tauschen.
- `NOTICE`/Header-Check für die aus SmartTube übernommenen Teile (MIT bzw. Apache-2.0).

---

## 4. Reihenfolge & Aufwand

```
0 Diagnose ─▶ 1 Fork/Session/Fallback ─▶ 2 adaptive→HLS (Apple TV spielt) ─▶ 4 Robustheit
                                              │                                    │
                                              └── 3 media-server ──────────────────┴─▶ 5 PoToken ─▶ 6 SABR ─▶ 7 Android/Abschluss
                                                  (falls 2.0 scheitert,
                                                   sonst erst vor Phase 6)
```

Nach **Phase 2** ist das Kernversprechen erfüllt ("spielt wie SmartTube" auf Apple TV) — im günstigen Fall (2.0 klappt) ohne eine Zeile Nativ-Code. Phase 5+6 sind wegen Entscheidung 4 fest eingeplant.

| Phase | Aufwand | Risiko |
|---|---|---|
| 0 Diagnose | 1–2 T | niedrig |
| 1 Fork/Session/Fallback | 3–4 T | mittel (JS-Engine, falls Hermes blockt) |
| 2 adaptive → HLS | 5–7 T | **hoch** (AVPlayer ist wählerisch; 2.0 + 2.2a entschärfen früh) |
| 3 media-server | 4–6 T | mittel (erstes eigenes Nativ-Modul im Projekt) |
| 4 Robustheit | 2–3 T | niedrig |
| 5 PoToken | 3–5 T | hoch (BotGuard ändert sich häufig) |
| 6 SABR | 1,5–2,5 W | **sehr hoch** (undokumentiert, aber mit Apache-2.0-Vorlage machbar) |
| 7 Android + Abschluss | 3–4 T | niedrig |

**Gesamt: ~7–9 Wochen** Vollzeit. **Erste spürbare Verbesserung auf Apple TV: ~2 Wochen** (Ende 2.2a).

## 5. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Hermes kann den Player-Code nicht ausführen | Phase 0.1 zuerst; WebView-Engine als Plan B (für Phase 5 ohnehin nötig) |
| AVPlayer akzeptiert `file://`-Playlist nicht | Spike 2.0 (halber Tag); Fallback = Phase 3 vorziehen, Rest von Phase 2 unverändert |
| AVPlayer akzeptiert generiertes HLS grundsätzlich nicht | 2.2a als kleinstmöglicher Beweis vor dem Vollausbau; scheitert auch das, bleibt nur YouTube-HLS + muxed — dann wird Phase 6 zur einzigen Lösung und rückt vor |
| `sidx`-Requests bremsen den Start | Nur für exponierte Renditions, parallel, Ergebnis cachen; Renditions notfalls auf 4–5 begrenzen |
| Format ohne `index_range` | Ein-Segment-Playlist als Notnagel pro Format (2.1) |
| Lokaler Server auf tvOS (Sandbox/Background/ATS) | `NSAllowsLocalNetworking`, Loopback-only, Lebensdauer an den Screen gekoppelt; Hintergrund-Audio explizit testen |
| SABR-Protokoll ändert sich | Protos und `ClientAbrState`-Felder isoliert halten; Flag + automatischer Fallback auf Phase 2 |
| YouTube ändert Clients/Player wöchentlich | Client-Liste/Versionen als konfigurierbare Konstanten; Matrix-Test als Frühwarnsystem |
| `file:`-Dependency + Metro-Caching | Bei unerklärlichen Fehlern `npx expo start -c`; Fork-`dist/` per `extraNodeModules` mappen |
| Regressionen in Musik/Download/Watch-App | Phase 2.6 fest eingeplant, nicht nachgelagert |
