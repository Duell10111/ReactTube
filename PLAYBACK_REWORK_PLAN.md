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

## 0b. Ergebnisse aus Phase 0 *(gemessen 2026-09-19)*

Vollständiger Report: `YouTube.js/docs/playback-matrix.md` (+ `.json`), erzeugt von
`YouTube.js/dev-scripts/playback-matrix.mjs` (`npm run matrix`). 6 Videos × 10 Clients = 60 Proben.

### Client-Matrix

| Client | spielbar | HLS-tauglich (mp4 V+A mit sidx) | Befund |
|---|---|---|---|
| `TV_SIMPLY` | 6/6 | **6/6** | Klartext-URLs, 4K, vollständig |
| `IOS` | 6/6 | **6/6** | Klartext-URLs, 4K, vollständig |
| `VISIONOS` | 6/6 | **6/6** | wie IOS, zusätzlich teils YT-HLS-Manifest |
| `ANDROID_VR` | 6/6 | **6/6** | Klartext-URLs, 4K |
| `ANDROID` | 6/6 | 0/6 | 35 von 36 Formaten **SABR-only**, kein Decipher möglich |
| `MWEB` | 6/6 | 2/6 | Klartext-URLs, aber **HTTP 403** auf die Medien-URL ⇒ PoToken nötig |
| `WEB` | 6/6 | 0/6 | **alle** Formate SABR-only (0 URLs, 0 Cipher) |
| `TV` | 0/6 | 0/6 | `UNPLAYABLE: The page needs to be reloaded.` |
| `TV_EMBEDDED` | 0/6 | 0/6 | `This video is unavailable` |
| `WEB_EMBEDDED` | 0/6 | 0/6 | `This video is unavailable` |

### Was das für den Plan bedeutet

1. **Der aktuelle Hauptpfad der App ist tot — und die Ursache ist geklärt.** `TV` liefert in 6 von 6 Fällen `UNPLAYABLE: The page needs to be reloaded.` Nachgeprüft wurde (Details: `YouTube.js/docs/tv-client-findings.md`, reproduzierbar mit `node dev-scripts/tv-client-probe.mjs`):
   - **Veraltete Client-Werte sind es nicht.** Getestet mit SmartTubes exakten Werten für `TV` (7.20260901.15.00 + Cobalt-25-UA) und `TV_DOWNGRADED` (5.20260901 + Cobalt-4-UA), je mit und ohne `Referer` — **alle fünf Varianten bleiben UNPLAYABLE**. Ein Wertabgleich mit SmartTube behebt das Problem nicht (schadet aber auch nicht).
   - **Ein server-ausgestelltes `visitorData` ist es auch nicht.** Über `POST /youtubei/v1/visitor_id` beschafft (SmartTube-Verfahren) — TV bleibt UNPLAYABLE.
   - **Ursache:** TVHTML5 gibt unangemeldet keine Streams mehr heraus. SmartTube kommt zum selben Schluss und hat `AppClient.TV` aus der anonymen Liste auskommentiert (`VideoInfoService.java:38`), nutzt ihn nur noch in `getAuthVideoInfo()`. Erschwerend verdrahtet `YTTV.getInfo` `client: 'TV'` fest (`src/core/clients/TV.ts:49`) und schließt den Parameter im Typ aus.
   - **Wichtig:** `/player` und `/next` sind getrennte Anfragen. Der TV-Client liefert `/next` **vollständig** (watch_next mit 11 Einträgen, transport_controls, primary_info, player_overlays, autoplay) — nur `/player` ist tot. `TV_SIMPLY` ist genau umgekehrt: 31 Formate bis 2160p, aber **kein** watch_next und keine transport_controls.
   ⇒ Die Lösung ist nicht der Client-Wechsel, sondern die **Trennung der Endpunkte** (siehe Phase 1.8).
2. **Phase 2 ist bestätigt.** Für alle vier tauglichen Clients liefert dasselbe Videopaar: itag **401** (AV1, 2160p) + itag **140** (AAC) — mit `init_range`/`index_range`, HTTP 206, `Accept-Ranges: bytes`, und einer auswertbaren **sidx-Box mit 195 Segmenten / 1051 s**. Der HLS-Weg über adaptive Formate trägt.
3. **Nur mp4 hat eine sidx-Box.** itag 315/337 (VP9 in WebM) liefern keine — WebM legt den Index als Cues ab. Für AVPlayer ohnehin unbrauchbar ⇒ **der Generator beschränkt sich auf mp4** (avc1/av01), der sidx-Parser muss nur mp4 können.
4. **AV1 ist nicht überall hardwarebeschleunigt.** itag 401 ist AV1; nur Apple TV 4K (3. Gen) dekodiert das in Hardware. Die Codec-Präferenz aus 2.5 ist damit kein Komfort-Feature, sondern Pflicht (avc1-Fallback für ältere Geräte).
5. **SABR funktioniert ohne PoToken.** Ein von Hand kodierter `VideoPlaybackAbrRequest` (ClientAbrState + `selected_format_ids` + ustreamer-Config + StreamerContext, **kein** PoToken) wird von `IOS`, `VISIONOS`, `ANDROID` und `ANDROID_VR` mit **HTTP 200** und echten Mediendaten beantwortet. `TV_SIMPLY` und `WEB` antworten mit 403.
   ⇒ **Phase 5 (PoToken) ist keine Vorbedingung für Phase 6 (SABR) mehr.** Die Reihenfolge ändert sich entsprechend (siehe §4).
6. **Die SmartTube-Protos stimmen.** Die Antwort enthält `SELECTABLE_FORMATS`, `STREAM_PROTECTION_STATUS` (1:2), `REQUEST_IDENTIFIER`, `REQUEST_CANCELLATION_POLICY`, `NEXT_REQUEST_POLICY` (15000/15000/60000 + Playback-Cookie), `PLAYBACK_START_POLICY` sowie `MEDIA_HEADER` → `MEDIA`×n → `MEDIA_END` je Format. Die `MEDIA_HEADER`-Felder (itag 401, `lmt`, `sequence_number`, `content_length`, `time_range`) decken sich exakt mit `media_header.proto`. Phase 6.1/6.2 sind damit vorab validiert.
7. **WEB und ANDROID sind bereits SABR-only.** Ohne Phase 6 sind diese Clients für die App dauerhaft verloren — das bestätigt Entscheidung 4.

### Messung auf dem Gerät (Apple TV, 2026-09-19)

Über *Einstellungen ▸ Playback diagnostics*, Video `bUHZ2k9DYHY`:

```
Engine: Hermes 250829098.0.16 · new Function: ok · eval: ok
Player: geladen (sts 20712)

TV         UNPLAYABLE (The page needs to be reloaded.)   0V/0A
TV_SIMPLY  OK  23V/8A   max 2160p  URL 31  → itag 401 + 140, sidx 195/106 Segmente
IOS        OK  22V/4A   max 2160p  URL 26  → itag 401 + 140, sidx 195/106 Segmente
VISIONOS   OK  22V/10A  max 2160p  URL 32  · YT-HLS → itag 401 + 140, sidx 195/106
ANDROID_VR OK  23V/4A   max 2160p  URL 27  → itag 401 + 140, sidx 195/106 Segmente
WEB        OK  22V/12A  max 2160p  SABR-only 34 → kein Decipher möglich
MWEB       OK  24V/12A  max 2160p  URL 36  → HTTP 206 (anders als im Node-Lauf: dort 403)
```

**Was das ändert:**

- **Hermes ist kein Problem.** `new Function` und `eval` funktionieren, Decipher läuft durch ⇒ **Phase 1.7 (eigene JS-Engine) entfällt**. Defekt 3 aus §1.2 war eine falsche Annahme.
- **Das Gerät bestätigt die Node-Matrix** bei allen tauglichen Clients — inklusive sidx: 195 Video- und 106 Audiosegmente, Phase 2 trägt auch auf dem Zielgerät.
- **MWEB liefert auf dem Gerät HTTP 206 statt 403.** Der 403 im Node-Lauf hing an IP/User-Agent, nicht am fehlenden PoToken ⇒ MWEB ist als späte Reserve in der Kette brauchbar.
- **`VISIONOS` ist der einzige Client mit YT-HLS-Manifest** — nützlich als Sofort-Fallback (Stufe 4 der Ladder in Phase 4), bevor der eigene Generator steht.
### Zweiter Gerätelauf: angemeldete Session (2026-09-19)

```
Session: TV-Instanz · ANGEMELDET · Player sts 20712

TV                     UNPLAYABLE (The page needs to be reloaded.)   0V/0A
TV_SIMPLY / IOS /      FEHLER: /youtubei/v1/player → HTTP 400
VISIONOS / ANDROID_VR
WEB / MWEB

tv.getInfo (App-Pfad): UNPLAYABLE · 0 Formate
    /next: primary_info, watch_next(10), transport_controls, player_overlays, autoplay
```

**Die zwei entscheidenden Befunde:**

- **Auth behebt den TV-Client nicht.** Auf der nachweislich angemeldeten Instanz bleibt `TV` `UNPLAYABLE`. Damit ist die letzte offene Hypothese aus §0b Befund 1 widerlegt: TVHTML5 `/player` ist **unabhängig vom Login** tot. Die Endpunkt-Trennung (Phase 1.8) ist nicht eine von mehreren Optionen, sondern der einzige Weg.
- **Neu und folgenreich: auf einer angemeldeten Session scheitern *alle* Nicht-TV-Clients mit HTTP 400.** Ursache: `HTTPClient.ts:115-129` hängt den OAuth-Bearer an **jede** InnerTube-Anfrage, sobald die Session angemeldet ist — ohne Prüfung, ob der angefragte Client Auth überhaupt unterstützt. Das TV-Token passt nicht zu einem IOS/WEB-Kontext ⇒ 400. SmartTube kennt genau diese Grenze und schaltet Auth pro Client ab: `client.isAuthSupported() && mUseAuth` (`VideoInfoService.java:213/227/273`, `isAuthSupported` = nur TV-Varianten).
  ⇒ **Streams dürfen niemals über die angemeldete Session laufen.** Dass die App heute zwei Innertube-Instanzen hat (`YoutubeContext.tsx`: anonyme `classicInnertube` + angemeldete `tvInnertube`), ist damit kein Zufall mehr, sondern die tragende Architektur — sie wird in Phase 1.8 bewusst festgeschrieben.
- **`/next` ist auch angemeldet vollständig**: watch_next (10), transport_controls, primary_info, player_overlays, autoplay. Die Endpunkt-Trennung ist damit auf dem Gerät belegt, mit und ohne Login.

### Stand der Phase-0-Aufgaben

| Aufgabe | Stand |
|---|---|
| 0.1 Hermes-Check | ✅ erledigt — **Hermes kann `eval`/`new Function`**, Decipher funktioniert. Phase 1.7 entfällt. (Falls der Lauf im Debug-Build erfolgte: im Release-Build gegenprüfen, dort läuft Hermes aus vorkompiliertem Bytecode.) |
| 0.2 Client-Matrix | ✅ erledigt, Report liegt vor |
| 0.3 SABR-Aufklärung | ✅ erledigt, SABR liefert Medien ohne PoToken |
| 0.4 In-App-Logging | ✅ erledigt (`useVideoDetails.ts`, `VideoPlayerNative.tsx`, Logger-Tag `PLAYBACK`) |
| Testset vervollständigen | **offen**: Altersbeschränkt, Geo-beschränkt, Live, Post-Live-DVR, Multi-Audio, Shorts — IDs in `YouTube.js/dev-scripts/playback-testset.json` eintragen und `npm run matrix` erneut laufen lassen |
| Angemeldete Session prüfen | ✅ erledigt — Auth behebt `TV` **nicht**, und angemeldete Sessions liefern für Nicht-TV-Clients HTTP 400. Konsequenz in Phase 1.8 eingearbeitet |

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
3. ~~**Decipher ist unter Hermes fragil.**~~ **Widerlegt durch Messung (§0b).** Die Annahme war, Hermes könne `new Function`/`eval` aus Strings nicht ausführen. Auf dem Gerät (Hermes 250829098.0.16) liefern **beide `ok`**, der Player wird geladen (sts 20712), und `decipher` funktioniert für alle Clients mit URL. Der RN-Shim (`src/ytjs/react-native.ts:106-124`) ist in Ordnung — **kein Handlungsbedarf**.
4. **Kein PoToken / kein stabiles visitorData.** WEB/WEB_EMBEDDED (Altersfreigabe, Geo-Fixes) faktisch gesperrt, Streams werden schneller mit 403 gedrosselt.
5. **Kein Expiry-Handling.** `streaming_data.expires` wird geparst, der Refresh-Code ist auskommentiert (`useVideoDetails.ts:134-158`).
6. **Keine Fehler-Ladder.** `onError` führt zu keinem Client-/Format-Wechsel (SmartTube: `switchNextFormat()`).
7. **OAuth wird an jeden Client gesendet.** `HTTPClient.ts:115-129` hängt den Bearer an jede InnerTube-Anfrage einer angemeldeten Session — auch an Clients, die das Token nicht akzeptieren. Gemessen: HTTP 400 für alle Nicht-TV-Clients (§0b). Heute fällt das nicht auf, weil die App Streams über die anonyme Instanz holt; sobald Phase 1 die Kette verdrahtet, wird es zur Falle.
8. **SABR wird ignoriert.** `server_abr_streaming_url` + `video_playback_ustreamer_config` parst der Fork bereits (`src/parser/parser.ts:440`, `ParsedResponse.ts:158`), genutzt wird nichts davon.

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

### Phase 0 — Diagnose & Testharness *(✅ weitgehend erledigt, Ergebnisse siehe §0b)*

0.1 **Hermes-Check (blockierend).** Dev-Button in der App: `new Function("return 1+1")()` sowie ein echter `format.decipher()`-Aufruf im **Release**-Build auf Apple TV. Entscheidet, ob 1.7 (JS-Engine) Pflicht ist.
0.2 **Client-Matrix-Test im Fork.** Neu: `tests/playback-matrix.test.ts` (vitest ist eingerichtet). Für Video-Set × Client (`IOS`, `VISIONOS`, `ANDROID_VR`, `TV`, `TV_DOWNGRADED`, `TV_SIMPLY`, `TV_EMBEDDED`, `WEB_EMBEDDED`, `MWEB`, `WEB`) protokollieren:
   `playability_status` · Anzahl `formats`/`adaptive_formats` · `url` vs. `signature_cipher` · **`index_range`/`init_range` vorhanden?** (entscheidet über Phase 2) · **`server_abr_streaming_url` vorhanden?** · `video_playback_ustreamer_config` · `hls_manifest_url` · max. Höhe · HTTP-`HEAD` (200/403/429) · `Range`-Support des Hosts.
   Ausgabe nach `docs/playback-matrix.md`.
0.3 **SABR-Recon.** Ebenfalls in 0.2 erfassen: welche Clients liefern **nur noch** SABR? Für einen davon einmalig einen rohen `POST` auf die `server_abr_streaming_url` mit minimalem `VideoPlaybackAbrRequest` absetzen und die UMP-Antwort hexdumpen — bestätigt Protos und Pflichtfelder vor Phase 6.
0.4 **In-App-Logging.** `Logger.extend("PLAYBACK")` in `useVideoDetails.ts` + `onError` in `VideoPlayerNative.tsx`: Client, itag, Fehlercode, URL-Host, `expires`.

**Testvideos:** Standard, 4K/HDR, VP9-only, AV1-only, altersbeschränkt, geo-beschränkt, Live, Post-Live-DVR, Multi-Audio, Shorts, YT-Music-Track, langes Video (>3 h).

---

### Phase 1 — Fork-Anbindung, Session-Härtung, Client-Fallback *(✅ umgesetzt 2026-09-19)*

| Punkt | Stand | Ort |
|---|---|---|
| 1.1 `file:`-Anbindung | ✅ | `package.json`, `metro.config.js` (watchFolders) — Metro-Bundle verifiziert |
| 1.2 `TV_DOWNGRADED` | ✅ | `Constants.ts`, `HTTPClient.ts#adjustContext` — gemessen 2/6, spät in der Kette |
| 1.3 UA-Header für TV-Clients | ✅ | `HTTPClient.ts` (UA aus dem angepassten Kontext, da TV und TV_DOWNGRADED den clientName teilen) |
| 1.4 `getPlayableInfo` | ✅ | `core/clients/PlaybackResolver.ts`, `Innertube#getPlayableInfo`, `TV#getPlayableInfo` |
| 1.5 `decipherMany` | ✅ | `Player.ts` (+ `getNsigProcessorFnBatch` in `Utils.ts`) — 31 Formate in einem Engine-Aufruf |
| 1.6 Session persistent | ✅ | `useYoutube.ts`, `utils/InnertubeSession.ts` (UniversalCache + stabiles visitorData) |
| 1.7 eigene JS-Engine | entfällt | Hermes kann `eval` (§0b) |
| 1.8 Endpunkt-Trennung + `skip_auth` | ✅ | `TV.ts#getInfo({player_client})`, `HTTPClient.ts`, `GetVideoInfoOptions.skip_auth` |
| 1.9 App-Anbindung | ✅ | `utils/PlaybackSource.ts` + `useVideoDetails.ts` |

**Verifikation:** `node dev-scripts/phase1-verify.mjs` im Fork prüft alle Punkte gegen die echte API (alle grün). Die Playback-Matrix dient als Regressionsnetz — sie hat während der Umsetzung einen echten Fehler gefangen: im Bulk-Decipher hieß das Signaturfeld `sig`, der Script-Generator las `s`, wodurch alle Cipher-Formate eine leere Signatur bekamen. TV_SIMPLY fiel dadurch von 6/6 auf 4/6. Die Verifikation deckt den Cipher-Pfad jetzt explizit ab (`decipher()` ruft intern `decipherMany()`, ein Vergleich beider Wege hätte den Fehler nicht gefunden).

**Nachträglich behoben (aufgefallen beim ersten Gerätetest der Wiedergabe):** Die
Persistenz aus 1.6 speicherte ein **selbst erzeugtes** `visitorData` — das akzeptiert
YouTube nicht. Gemessen: `VISIONOS`, `ANDROID_VR` und `TV_DOWNGRADED` antworten dann
mit `LOGIN_REQUIRED`, `TV_SIMPLY` mit `UNPLAYABLE`, und damit fällt auch das
HLS-Manifest weg — die Kette landete beim progressiven Notfallweg. Lässt man
`visitor_data` beim Erzeugen weg, besorgt sich die Session beim Konfigurationsabruf
selbst einen gültigen Wert; **dieser** wird jetzt aufbewahrt (max. 7 Tage) und beim
nächsten Start wiederverwendet. **Zweiter Anlauf nötig:** der Wert steckt zusätzlich im Session-Cache von
youtubei.js, der unter dem **festen** Schlüssel `innertube_session_data` liegt
(`Session.ts:337`) und unabhängig von den Session-Argumenten wiederverwendet wird —
ein Neustart ohne `visitor_data` spielte die alte Identität also wieder ein. Die App
holt das `visitorData` jetzt **explizit** über `POST /youtubei/v1/visitor_id`
(SmartTubes `VisitorApi.kt`) und verwirft den Session-Cache, wenn kein eigener Wert
vorliegt. In Node gegen den nachgestellten Gerätezustand verifiziert: vergifteter
Cache → alle HLS-Clients kaputt; nach dem Fix alle sechs Clients `OK`, `VISIONOS` mit
HLS, auch im Folgestart. Zusätzlich verwirft die App Identität **und** Session-Cache,
sobald ein Client `LOGIN_REQUIRED` meldet. Ebenfalls behoben: `chooseFormat` wirft, statt
`undefined` zu liefern — der `??`-Ausdruck in `YTElements.ts` kam deshalb nie beim
Audio-Zweig an, sobald eine Antwort keine muxed Formate mehr enthielt (inzwischen der
Normalfall).

**Nachträglich behoben (aufgefallen beim ersten Gerätestart):** Das Aktivieren des
Caches (1.6) hat zwei Fehler im Cache-Shim der App (`src/ytjs/react-native.ts`)
freigelegt, der bis dahin nie benutzt wurde — `get()` warf bei einem *fehlenden*
Schlüssel „An unexpected file was found in place of the cache key" statt `undefined`
zurückzugeben (das verhinderte die Innertube-Erzeugung komplett), und `set()` schrieb
die serialisierten Player-Daten über `TextDecoder` als Text, was die Bytes zerstört
hätte. Beides läuft jetzt binär über `file.bytes()` / `file.write(Uint8Array)`.
Außerdem sind die tiefen Importe aus `youtubei.js/dist/...` durch die öffentliche API
ersetzt (Metro-Warnungen „not listed in exports" sind weg); dabei fiel ein veraltetes
`info`-Feld im Shim auf, das der aktuelle `PlatformShim` nicht mehr kennt — es war nur
unsichtbar, weil ein `@ts-ignore` den ganzen `Platform.load`-Aufruf von der
Typprüfung ausgenommen hatte.

**Abweichungen von der Planung:**
- 1.9 ist als Helfer-Modul `utils/PlaybackSource.ts` umgesetzt, nicht als Hook `usePlaybackSource`. Der Hook entsteht in Phase 2, wo er Manifest-Erzeugung, Ablauf-Timer und Fehler-Ladder zusammenhält — jetzt hätte er nur einen Aufruf gekapselt.
- Die App nutzt **nicht** `TV#getPlayableInfo` (ein Aufruf), sondern holt Metadaten und Streams aus **zwei Instanzen** und führt sie zusammen. Grund: `skip_auth` ist auf einer angemeldeten Session noch nicht auf dem Gerät verifiziert, die Zwei-Instanzen-Variante funktioniert unabhängig davon. `TV#getPlayableInfo` liegt im Fork bereit und ist der nächste Schritt, sobald ein Gerätelauf bestätigt, dass `skip_auth` auf angemeldeten Sessions greift.
- `hlsEnabled` steuert jetzt die **Reihenfolge** der Client-Kette (HLS-fähige Clients zuerst) statt einen festen Client. Die Einstellung verschwindet in Phase 2.5 ganz.

**Erwartetes Ergebnis auf dem Gerät:** Die Wiedergabe funktioniert wieder, aber noch mit der alten Qualitätsgrenze — es wird weiterhin *eine* URL an den Player gegeben (muxed bzw. YouTube-HLS, wenn der gewählte Client eins liefert). 1080p–4K ohne HLS-Schalter kommt erst mit Phase 2.

#### Umgesetzte Punkte im Detail

1.1 **`file:`-Anbindung.** `package.json`: `"youtubei.js": "file:../../YouTube.js"`; `metro.config.js`: `watchFolders` auf den Fork; `npm run watch` im Fork für Live-Builds nach `dist/`. Stolperfalle: Metro löst `file:`-Symlinks nur mit `unstable_enableSymlinks` sauber auf — notfalls `dist/` per `resolver.extraNodeModules` mappen.
1.2 **`TV_DOWNGRADED`** in `src/utils/Constants.ts` + `HTTPClient.ts#adjustContext` (ab Z. 206) ergänzen, in `SUPPORTED_CLIENTS` aufnehmen. Vorbild `AppClient.kt:44`.
1.3 **UA-Header für TV-Clients.** `HTTPClient.ts:95-104` setzt `User-Agent` bisher nur für ANDROID/IOS/ANDROID_VR/VISIONOS; TV_DOWNGRADED funktioniert nur mit passender alter Cobalt-UA.
1.4 **`Innertube#getPlayableInfo(target, { clients, accept })`** (neu, `src/core/clients/PlaybackResolver.ts`). Gemessene Startkette aus §0b:
```ts
const PLAYBACK_CLIENTS = ['TV_SIMPLY', 'IOS', 'VISIONOS', 'ANDROID_VR'];  // je 6/6
// bewusst nicht in der Kette: TV / TV_EMBEDDED / WEB_EMBEDDED (0/6),
// WEB + ANDROID (SABR-only, erst ab Phase 6), MWEB (403 ohne PoToken, erst ab Phase 5)
```
   Die Funktion iteriert die Kette, bricht beim ersten `accept()`-Treffer ab (Default: `status === 'OK'` **und** verwertbares Video-Format), zweiter Durchlauf mit gelockertem Prädikat (analog `firstPlayable()`); liefert `{ info, client, attempts[] }`. Der heutige Ad-hoc-Merge "TV für Metadaten + IOS für Streams" (`useVideoDetails.ts:52-78`) wandert als Merge-Hook hierher.
1.5 **`Player#decipherMany(urls)`** (`src/core/Player.ts`): alle `n`/`sig` in **einem** `Platform.shim.eval`-Call (Vorbild `VideoInfoServiceBase.decipherFormats`). Ohne das kostet ein Manifest mit ~40 Formaten 40 Engine-Aufrufe. `MediaInfo.ts` darauf umstellen.
1.6 **Session persistieren (App).** `useYoutube.ts`: `Innertube.create({ lang, cache: new UniversalCache(true), visitor_data })`; `visitor_data` einmalig erzeugen und in MMKV ablegen (der auskommentierte Code dort ist der richtige Ansatz). Player-Cache läuft über den bestehenden MMKV-`Cache` (`src/ytjs/react-native.ts:17`).
1.7 **Falls 0.1 negativ:** JS-Engine für den Player-Code — `react-native-webview` (für Phase 5 ohnehin nötig, daher erste Wahl), alternativ QuickJS via `react-native-nitro-modules` (bereits Dependency). Andockpunkt bleibt `eval` in `src/ytjs/react-native.ts:106`.
1.8 **TV-Endpunkte trennen + Auth-Falle umgehen (§0b) — die eigentliche Ursachenbehebung.** Zwei zusammenhängende Änderungen:

   **(a) Getrennte Clients für `/player` und `/next`** in `src/core/clients/TV.ts#getInfo`:
```ts
async getInfo(
  target: string | NavigationEndpoint,
  options?: Omit<GetVideoInfoOptions, 'client'> & {
    player_client?: InnerTubeClient;
    player_skip_auth?: boolean;
  }
) {
  const extra_payload = {
    playbackContext: { … },
    client: options?.player_client ?? 'TV',
    skip_auth: options?.player_skip_auth ?? options?.player_client !== undefined
  };
  const watch_response      = watch_endpoint.call(this.#actions, extra_payload);
  const watch_next_response = watch_next_endpoint.call(this.#actions, { client: 'TV' }); // bleibt TV, bleibt authentifiziert
}
```

   **(b) Auth pro Anfrage abschaltbar machen** — `HTTPClient.ts:115` hängt den Bearer an *jede* InnerTube-Anfrage. Das Gegenstück zu SmartTubes `client.isAuthSupported() && mUseAuth`: ein `skip_auth`-Flag, das von `Actions` bis in die Header-Erzeugung durchgereicht wird und dort `Authorization`/`Cookie` auslässt. Ohne (b) läuft (a) in den gemessenen **HTTP 400**.

   **Regel, die daraus folgt und die die App künftig einhält:**
   - `/next`, Interaktionen (Like/Abo), History, Playlists ⇒ **angemeldete TV-Instanz**
   - `/player`, also alle Streaming-Daten ⇒ **anonym**, mit Client-Kette aus 1.4

   Solange (b) noch nicht im Fork ist, gibt es den Zwischenweg ohne Fork-Änderung: die Streams über die bestehende **anonyme `classicInnertube`-Instanz** holen (die App ruft heute schon beide Instanzen parallel auf, `useVideoDetails.ts:52-78`) — nur eben mit der Kette aus 1.4 statt fest `IOS`.
1.9 **`src/hooks/video/usePlaybackSource.ts`** (neu): kapselt Client-Kette, Quelle, Fehler-Ladder. `useVideoDetails.ts` verliert `httpVideoURL`/`best_format`. Aufrufer: `VideoScreen.tsx:102`, `VideoScreenPhone.tsx:51`, `VideoScreenTablet.tsx:62`, `ReelVideoScreen.tsx:131`.

---

### Phase 2 — Adaptives Streaming auf Apple TV *(neu geschnitten nach Messung, 2026-09-19)*

> **Korrigierter Befund (2026-09-19, zweite Messung):** Die Byte-Range-Kappung ist
> eine **Client-Eigenschaft**, keine Frage der Autorisierung. `VISIONOS` liefert
> adaptive Formate über `Range` **vollständig** — nachgemessen 152 MB itag 401
> (2160p AV1) am Stück, jedes Segment HTTP 206. `IOS`, `TV_SIMPLY` und
> `ANDROID_VR` kippen ab rund 0,37 MB auf 403.
>
> Die frühere Hypothese, dafür fehle ein PoToken, ist **widerlegt**: ein echter
> BotGuard-PoToken (12 h TTL, an dasselbe `visitorData` gebunden) und ein
> Cold-Start-Token ändern an den 403 nichts, und `WEB` bleibt auch mit
> content-gebundenem Token SABR-only. Messung und Skripte:
> `YouTube.js/docs/byte-range-cap.md`, `dev-scripts/potoken-probe.mjs`.
>
> **Folge für die Reihenfolge:** Phase 2b (PoToken) ist **keine Vorbedingung**
> für 2c. Der eigene Generator ist gebaut und gegen die echten Server verifiziert;
> 2b rutscht dahinter und dient nur noch als Reserve.
>
> Erreichbare Qualität auf AVPlayer, gemessen:
>
> | Weg | max. Höhe | Audiospuren | Stand |
> |---|---|---|---|
> | YouTube-HLS | 1080p (avc1; die 2160p-Varianten sind VP9, das AVPlayer nicht dekodiert) | gemuxt, keine Sprachwahl | ✅ Phase 2a |
> | eigenes HLS aus adaptiven Formaten | **2160p** (av01) | getrennt, mehrsprachig | ✅ Phase 2c, Node-verifiziert |
> | SABR | 2160p | getrennt, mehrsprachig | Phase 6 |

#### Phase 2a — YouTubes HLS nutzen *(✅ umgesetzt)*

| Punkt | Umsetzung |
|---|---|
| HLS als Pflichtkriterium | `utils/PlaybackSource.ts`: erste Runde akzeptiert nur Clients **mit** `hls_manifest_url`, Client-Reihenfolge `VISIONOS → IOS → TV_SIMPLY → …`. Zweite Runde fällt auf progressive Formate zurück und protokolliert, dass die Wiedergabe früh abbricht. |
| HLS als Standard | `useVideoDetails.ts` + `PlayerResolutionSelector`: HLS ist der Vorgabewert, der progressive Weg nur noch Notausgang zum Vergleichen. |
| sidx-Parser (2.1) | ✅ vorgezogen: `YouTube.js/src/utils/Mp4SidxParser.ts` samt Fixture `tests/fixtures/sidx-itag160.bin`. Wird für 2c gebraucht und ist gegen echte Formate verifiziert. |

**Verifikation:** `node dev-scripts/phase2a-verify.mjs` — alle 6 Testvideos, `VISIONOS`
liefert das Manifest, avc1 bis 1080p, Segmentstichproben am Anfang, in der Mitte und
am Ende je HTTP 200.

**Ergebnis auf dem Gerät:** adaptives 1080p auf Apple TV, mit Qualitätsumschaltung
durch AVPlayer — ohne eigenen Server und ohne Generator.

#### Phase 2c — Eigener HLS-Generator *(✅ umgesetzt, Gerätetest offen)*

Entstanden **ohne** PoToken, weil `VISIONOS` die Byte-Ranges vollständig bedient.
Nutzen gegenüber 2a: **2160p über av01** und **getrennte, mehrsprachige Tonspuren**.

| Punkt | Umsetzung |
|---|---|
| 2.1 sidx-Parser | ✅ bereits in 2a: `YouTube.js/src/utils/Mp4SidxParser.ts` |
| 2.2 Generator | ✅ `YouTube.js/src/utils/HlsManifest.ts` + `src/types/HlsOptions.ts`, exportiert als `FormatUtils.toHLS` und `MediaInfo#toHLS`. Master mit `EXT-X-STREAM-INF` je Videorendition und `EXT-X-MEDIA:TYPE=AUDIO` je Tonspur (inkl. DRC-/Voice-Boost-Labels), Medien-Playlists mit `EXT-X-MAP` aus `init_range` und `EXT-X-BYTERANGE` je Segment. Durchgängig `#EXT-X-VERSION:7`, `#EXT-X-INDEPENDENT-SEGMENTS`, `#EXT-X-PLAYLIST-TYPE:VOD`. Zwei Ausgabemodi sind vorgesehen: `mode:'byterange'` (umgesetzt) und `mode:'segments'` für SABR (wirft noch). Live/Post-Live-DVR werden abgelehnt — dort gilt YouTubes `hls_manifest_url`. |
| Client-Bedingung | ✅ `CLIENTS_FULL_BYTE_RANGE` in `src/utils/PlaybackSource.ts`; `resolveStreamingSource` kennt jetzt `mode: "generated" \| "youtube-hls" \| "progressive"` und fällt über das neue `clients_fallback` des Resolvers auf die HLS-Kette zurück, wenn kein ungekappter Client antwortet. |
| 2.0 Serverlos-Ablage | ✅ **entschieden, mit einer Wendung** (siehe unten): die Medien-Playlists liegen als Dateien in `cacheDirectory/generated-hls/<videoId>-<ms>/`, das Master geht als `data:`-URI direkt in die Quelle des Players und referenziert sie per absolutem `file://`. **Kein Nativ-Modul nötig — Phase 3 bleibt SABR vorbehalten.** |
| 2.3 App-Anbindung | ✅ `useVideoDetails` baut das Manifest nach dem Abruf in einem eigenen Effekt und gibt es als `hlsManifestUrl` vor YouTubes Manifest aus. Schlägt der Bau fehl, bleibt es bei 2a. |
| 2.5 Einstellung | ✅ `PlayerResolutionSelector`: „Eigenes HLS — 4K, mehrsprachig" / „YouTube-HLS" / „Progressiv"; der Alt-Schlüssel `localHlsEnabled` trägt jetzt den Generator. |

**Verifikation (Node, gegen die echten Server):** `node dev-scripts/phase2c-verify.mjs`
— alle 6 Testvideos, 6 Varianten bis 2160p, 1–2 Tonspuren, Init-Range plus
Segmente am Anfang, in der Mitte und am Ende je HTTP 206 mit exakter Länge.

**Gerätelauf 2026-09-19 (Simulator):** `VISIONOS OK · eigenes HLS möglich · 1
Versuch` und `Eigenes HLS gebaut: 8 Playlists in 495 ms`. Dabei fiel auf, dass der
Player das Manifest gar nicht bekam: `VideoComponent` benutzte `hlsUrl ?? url` und
`VideoScreen` reichte als `hlsUrl` YouTubes Manifest durch — das verdrängte die
gewählte Quelle. Behoben: `hlsUrl` ist jetzt die **zweite Stufe** einer Ladder
(erst die gewählte Quelle, bei Player-Fehler YouTubes Manifest), und das
Protokoll nennt die tatsächlich geladene Stufe. Ebenfalls behoben: das Manifest
wird **vor** `setVideoInfo` gebaut, sonst startete die Wiedergabe erst mit
YouTubes Manifest und nach einer halben Sekunde sichtbar neu.

**Spike 2.0 ist entschieden — und die erste Antwort war falsch.** Drei
Gerätelaufe endeten im Ladezustand; die dabei gezogenen Schlüsse (nur-AV1-Manifest,
Fortsetzungsmarke hinter dem Videoende) waren beide real, aber keiner war die
Ursache. Gemessen wurde schließlich direkt gegen AVFoundation auf dem Mac
(`tools/avplayer-probe.swift`), was die Geräte-Runden ersetzt:

| Auslieferung derselben Dateien | Ergebnis |
|---|---|
| `file://…/master.m3u8` | **FEHLER** `AVFoundationErrorDomain -11800` / `OSStatus -16913` (`assetProperty_MediaPlaybackValidation`) |
| `http://localhost/master.m3u8` | **GELADEN** · `playable=true` · Dauer 841,9 s |
| `data:`-URI als Master, Medien-Playlists als `data:` | **GELADEN** |
| **`data:`-URI als Master, Medien-Playlists als `file://`** | **GELADEN** · Master 2850 Bytes |

`-16913` ist exakt der Code, der im Gerätelog als `HLSPersistentStore signalled
err=-16913` auftauchte. Das Manifest war die ganze Zeit in Ordnung —
`mediastreamvalidator` meldet keine Verletzung der HLS-Spezifikation, und über
HTTP spielt es. **Betroffen ist nur das Master.**

Daraus die Umsetzung: die großen Medien-Playlists bleiben Dateien im Cache, das
Master (knapp 3 KB) wandert prozentkodiert als
`data:application/vnd.apple.mpegurl,…` direkt in die Quelle des Players und
referenziert die Dateien absolut. Prozentkodiert statt base64, weil
`encodeURIComponent` UTF-8-sicher ist und keine Abhängigkeit braucht.

**Was das für den Plan heißt:** Der serverlose Weg trägt doch — Phase 3 wird für
Phase 2c **nicht** gebraucht und bleibt SABR vorbehalten. Die Risikozeile
„AVPlayer akzeptiert `file://`-Playlist nicht" ist damit eingetreten **und**
umschifft.

**Zu den beiden früheren Befunden:** Dass eine Codec-Familie nie ganz aus dem
Manifest verschwinden darf und dass eine Fortsetzungsmarke hinter dem Videoende
nichts verloren hat, bleibt beides richtig und behoben — sie waren nur nicht die
Ursache des Hängens.

**Offen:**
- Gerätetest: greift die Ladder wirklich, wenn eine Stufe ausfällt, und steigt sie
  an der richtigen Stelle wieder ein?
- `VideoPlayerPhone` (Telefon/Tablet) reicht weder Fehler noch Fortschritt durch —
  dort ist die Ladder vorerst einstufig.
- Ein Stillstand **mitten** in der Wiedergabe (endloses Nachpuffern) löst nichts
  aus; der Wächter deckt nur den Ladevorgang ab.

---

### Phase 5 — PoToken (BotGuard) → **läuft als Phase 2b**

> Diese Phase ist nach der Messung aus Phase 2 vorgezogen worden und heißt dort **2b**.
> Die Beschreibung unten bleibt maßgeblich, die Einordnung hat sich geändert:

Für **SABR** ist PoToken keine Vorbedingung — das hat Phase 0 gezeigt (`IOS`, `VISIONOS`,
`ANDROID`, `ANDROID_VR` liefern SABR-Medien ohne ihn). Für den **eigenen HLS-Generator**
ist er es sehr wahrscheinlich doch: die Byte-Range-Auslieferung bricht ohne `pot` nach
0,37 MB ab (`YouTube.js/docs/byte-range-cap.md`). Darüber hinaus schaltet er WEB-Clients
frei, behebt den 403 bei `MWEB` und erreicht altersbeschränkte sowie geo-blockierte Videos.

5.1 `react-native-webview` + unsichtbares WebView, das die BotGuard-Challenge löst. Portierung von `potokennp2/generators/PoTokenWebView.kt` + `misc/JavaScriptUtil.kt` (MIT — direkte Übernahme mit Copyright-Hinweis zulässig).
5.2 Trennung wie in SmartTube: **session**-PoT (aus `visitorData`, für Streaming-URLs `&pot=`) und **content**-PoT (aus `videoId`, für den Player-Request), Cache + Reset-Cooldown (`PoTokenGate.kt:96-116`).
5.3 Fork: `getPlayableInfo` reicht pro Client den passenden PoT durch (`Innertube.getInfo` unterstützt `options.po_token` bereits, `Innertube.ts:104`); nur für `isWebPotRequired`-Clients anfordern.
5.4 **Wenn SABR ihn doch verlangt:** der PoToken geht dort **als Bytes** in den Request-Payload (StreamerContext-Feld 2), nicht base64-kodiert als Query-Param — siehe `src/core/Player.ts:204` und `dev-scripts/playback-matrix.mjs#buildAbrRequest`.

---

### Phase 6 — SABR *(~1,5–2,5 Wochen, Hauptpfad — kann direkt nach Phase 4 beginnen)*

Vorarbeit aus Phase 0: ein handkodierter Request wird bereits akzeptiert, die Antwortstruktur ist bekannt (§0b Befund 5/6). `dev-scripts/lib/proto.mjs` (Writer + UMP-Reader) und `dev-scripts/playback-matrix.mjs#buildAbrRequest` sind die lauffähige Referenz für 6.1–6.3.

6.1 **Protos.** Bestätigt durch Phase 0. `protos/sabr/**` aus `SmartTube/exoplayer-amzn-2.10.6/library/sabr/src/main/proto/` übernehmen (Apache-2.0, Header erhalten): `video_playback_abr_request`, `client_abr_state`, `media_header`, `format_initialization_metadata`, `sabr_redirect`, `sabr_error`, `sabr_seek`, `sabr_context_update`, `sabr_context_sending_policy`, `next_request_policy`, `stream_protection_status`, `buffered_range`, `streamer_context`, `playback_cookie`, `time_range`, `media_capabilities`, `ump_part_id`. Generierung über `npm run build:proto` (`@bufbuild/protobuf` ist Dependency).
6.2 **UMP-Decoder** `src/core/sabr/UmpDecoder.ts` — VarInt-Part-Header, Part-Dispatch. Semantik aus `parser/ump/UMPDecoder.java`.
6.3 **`src/core/sabr/SabrStream.ts`** — Portierung von `SabrProcessor.java`/`SabrStream.java`. Gemessene Antwortstruktur: `SELECTABLE_FORMATS` → `STREAM_PROTECTION_STATUS` → `REQUEST_IDENTIFIER` → `NEXT_REQUEST_POLICY` (15000/15000/60000 + Cookie) → `START_BW_SAMPLING_HINT` → je Format `MEDIA_HEADER` → `MEDIA`×n (je 32 KB) → `MEDIA_END`. Aufgaben: `ClientAbrState` fortschreiben, `MediaHeader`/`FormatInitializationMetadata` verarbeiten, `SabrRedirect` folgen, `SabrContextUpdate` anwenden, `NextRequestPolicy` respektieren, `StreamProtectionStatus` auswerten (⇒ PoToken erneuern).
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
0 Diagnose ✅ ─▶ 1 Fork/Session/Fallback ✅ ─▶ 2a YouTube-HLS ✅ ─▶ 2c eigener Generator ✅ (2160p av01, Gerätetest offen)
                                                                            │
                                                                            ├─▶ 4 Robustheit ✅
                                                                            │
                                                     3 media-server ───────┴─▶ 6 SABR ─▶ 7 Android/Abschluss

                                                     2b PoToken — zurückgestellt, nur noch Reserve
```

Nach **Phase 2** ist das Kernversprechen erfüllt ("spielt wie SmartTube" auf Apple TV) — und zwar ohne eine Zeile Nativ-Code: die Playlists liegen als Dateien im Cache, die Segmente holt AVPlayer direkt bei googlevideo.
**Geändert nach Phase 2b-Messung:** PoToken liegt auf keinem der Wege mehr. Er hebt die Byte-Range-Kappung nicht auf, SABR braucht ihn nicht, und `WEB` bleibt mit ihm SABR-only. Er bleibt Reserve, falls die Attestierung scharf geschaltet wird.

| Phase | Aufwand | Risiko |
|---|---|---|
| 0 Diagnose | ✅ erledigt | – |
| 1 Fork/Session/Fallback | 3 T | niedrig (JS-Engine-Risiko ist weg) |
| 2a YouTube-HLS | ✅ erledigt | – |
| 2c eigener Generator | ✅ erledigt (Gerätetest offen) | – |
| 2b PoToken | 3–5 T | hoch — **zurückgestellt**, gemessen ohne Wirkung; auf tvOS zusätzlich ohne WebView |
| 3 media-server | 4–6 T | mittel (erstes eigenes Nativ-Modul im Projekt) |
| 4 Robustheit | ✅ erledigt (Gerätetest offen) | – |
| 6 SABR | 1,5–2,5 W | hoch — durch Phase 0 deutlich gesunken (Request akzeptiert, Antwortstruktur bekannt) |
| 7 Android + Abschluss | 3–4 T | niedrig |

**Die Wiedergabequalität ist am Ziel — der Beweis auf dem Gerät fehlt noch:**
2a brachte adaptives 1080p über YouTubes eigenes Manifest, 2c erreicht in der
Node-Messung 2160p in av01 mit getrennten Tonspuren. Was noch aussteht, ist der
Gerätetest, ob AVPlayer die erzeugten Playlists annimmt.

## 5. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| ~~Hermes kann den Player-Code nicht ausführen~~ | **Erledigt**: auf dem Gerät gemessen, `new Function`/`eval` funktionieren, Decipher läuft. Zusätzlich entschärft dadurch, dass alle Clients der Kette Klartext-URLs liefern |
| ~~AVPlayer akzeptiert `file://`-Playlist nicht~~ | **Eingetreten und umschifft**: AVPlayer verweigert ein Master über `file://` (`-16913`), nimmt es aber als `data:`-URI an — die Medien-Playlists dürfen von dort per `file://` referenziert werden. Gemessen mit `tools/avplayer-probe.swift`. Kein lokaler Server nötig |
| `VISIONOS` verliert die ungekappte Byte-Range-Auslieferung | `phase2c-verify.mjs` als Frühwarnung; die App fällt über `clients_fallback` automatisch auf YouTubes Manifest zurück, SABR (Phase 6) ist der Ausweg |
| AVPlayer akzeptiert generiertes HLS grundsätzlich nicht | 2.2a als kleinstmöglicher Beweis vor dem Vollausbau; scheitert auch das, bleibt nur YouTube-HLS + muxed — dann wird Phase 6 zur einzigen Lösung und rückt vor |
| `sidx`-Requests bremsen den Start | Nur für exponierte Renditions, parallel, Ergebnis cachen; Renditions notfalls auf 4–5 begrenzen |
| Format ohne `index_range` | Ein-Segment-Playlist als Notnagel pro Format (2.1) |
| Lokaler Server auf tvOS (Sandbox/Background/ATS) | `NSAllowsLocalNetworking`, Loopback-only, Lebensdauer an den Screen gekoppelt; Hintergrund-Audio explizit testen |
| SABR-Protokoll ändert sich | Protos und `ClientAbrState`-Felder isoliert halten; Flag + automatischer Fallback auf Phase 2; `npm run matrix` im Fork als Frühwarnung |
| YouTube ändert Clients/Player wöchentlich | Client-Liste/Versionen als konfigurierbare Konstanten; `npm run matrix` im Fork regelmäßig laufen lassen und `docs/playback-matrix.md` diffen |
| `file:`-Dependency + Metro-Caching | Bei unerklärlichen Fehlern `npx expo start -c`; Fork-`dist/` per `extraNodeModules` mappen |
| Regressionen in Musik/Download/Watch-App | Phase 2.6 fest eingeplant, nicht nachgelagert |
