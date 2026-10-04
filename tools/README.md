# tools

## `avplayer-probe.swift`

Fragt AVFoundation auf dem Mac, ob es eine Quelle annimmt — ohne Umweg über
Simulator oder Gerät.

```
swiftc -O tools/avplayer-probe.swift -o /tmp/avprobe
/tmp/avprobe "file:///…/master.m3u8"
/tmp/avprobe "data:application/vnd.apple.mpegurl,…"
```

**Wozu:** Ein Player, dem eine Quelle nicht passt, meldet oft gar nichts und
bleibt im Ladezustand stehen (Plan-Phase 4). Auf dem Gerät ist das kaum von
einer langsamen Leitung zu unterscheiden; hier kommt der Fehlercode direkt.

So wurde Spike 2.0 entschieden: dieselben Dateien einmal über `file://`
(`AVFoundationErrorDomain -11800 / OSStatus -16913`) und einmal über `http://`
(geladen, `playable=true`) — woraus folgte, dass nur das Master nicht über
`file://` kommen darf. Als `data:`-URI wird es angenommen und darf von dort die
Medien-Playlists per absolutem `file://` referenzieren.

## `ytm-traffic/`

Messlabor für den Traffic der YouTube-Music-App auf dem iPad, plus die
InnerTube-Gegentests gegen das lokale YouTube.js.

```
mitm/       mitmproxy-Addons zur Offline-Auswertung einer Aufzeichnung
            wg-client-config.py baut die WireGuard-Client-Config
innertube/  Node-Skripte: OAuth-Device-Flow und Client-Matrix
```

**Wozu:** Der iOS-Client authentifiziert sich per OAuth2-Bearer statt per
Cookie, und das Token aus dem TV-Device-Flow wird ausschließlich mit
`clientName: TVHTML5` akzeptiert — jeder andere Client antwortet mit 400. Das
ist der Grund für die Zwei-Sessions-Architektur bei Musikdaten.

Aufbau, Auswertung und Befunde: `YOUTUBE_MUSIC_IOS_TRAFFIC_ANALYSIS.md` im
Repo-Root.

## `potoken-page-probe.mjs`

Fährt die BotGuard-Seite der App (`src/utils/potoken/botguardPage.ts`) samt
Challenge-Parser und `GenerateIT`-Ablauf unter jsdom gegen YouTube und gibt
einen content-gebundenen PoToken aus (Plan-Phase 5). jsdom kommt aus dem
YouTube.js-Checkout.

```
TOKEN=$(node tools/potoken-page-probe.mjs bUHZ2k9DYHY)
(cd ../../YouTube.js && POT_VALUE=$TOKEN node dev-scripts/phase6-verify.mjs bUHZ2k9DYHY WEB)
```

**Wozu:** Ob der Server einen Token annimmt, zeigt nur der SABR-Schutzstatus
(`ok` statt `pending`). Unter jsdom liegt die Quote bei rund 4 von 5.

## `botguard-webview-probe.swift`

Prüft `modules/botguard-webview/ios/RuntimeWebView.swift` im tvOS-Simulator
ohne App-Build: WebKit per `dlopen`, Seite laden, `evaluate`, Nachrichten aus
der Seite und ein echter BotGuard-Lauf.

```
node tools/botguard-webview-probe-page.mjs bUHZ2k9DYHY /tmp/bg.html
xcrun --sdk appletvsimulator swiftc -parse-as-library \
  -target arm64-apple-tvos16.4-simulator -o /tmp/bg-probe \
  tools/botguard-webview-probe.swift modules/botguard-webview/ios/RuntimeWebView.swift
xcrun simctl boot "Apple TV 4K (3rd generation)"
xcrun simctl spawn booted /tmp/bg-probe /tmp/bg.html
```

**Wozu:** tvOS hat kein WebView im SDK; das Modul lädt WebKit zur Laufzeit
(privates API, Vorbild jvanakker/tvOSBrowser). Gemessen 2026-10-04: Lauf ≈ 1 s,
6 von 6 Tokens vom SABR-Server angenommen.
