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
