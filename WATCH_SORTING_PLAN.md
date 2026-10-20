# Plan: Sortierungsmöglichkeiten in der Watch-App

> Stand: 2026-10-12 · Branch: `yt-phone-adaptions`
> Scope: `targets/watch/**` (watchOS, SwiftUI/SwiftData).
> Nicht im Scope: Sortierung auf Telefon/TV, Änderungen am Sync-Protokoll.

---

## 0. Befund: wie heute sortiert wird

Alle Sortierungen sind fest im `@Query` verdrahtet:

| Ansicht | Datei | Sortierung heute |
|---|---|---|
| Playlists (eigene + temporäre) | `targets/watch/LibraryView.swift:46` | Titel A→Z |
| Videos | `targets/watch/LibraryView.swift:199` | Titel A→Z |
| Verfügbar | `targets/watch/LibraryView.swift:238` | Titel A→Z |
| Heruntergeladen | `targets/watch/LibraryView.swift:270` | **Titel Z→A** (vermutlich versehentlich) |
| Playlist-Detail | `targets/watch/PlaylistListView.swift:28` | Playlist-Reihenfolge (`orderedVideos`) |

Wichtige Randbedingungen:

1. **Die Wiedergabe-Warteschlange hängt am Index.** Die Playlist-Detailansicht
   ruft `updatePlaylist(playlist:index:)` auf, und `PlaylistManager.setPlaylist`
   baut die Queue neu aus `orderedVideos`. Sortiert die Ansicht anders, zeigt der
   Index auf den falschen Titel. Die Queue muss daher die sortierte Liste
   bekommen. Die übrigen Listen machen das bereits (`Array(videos[index...])`).
2. **Es gibt keine Datumsfelder.** `Video` und `Playlist` haben weder
   `addedAt` noch `downloadedAt` noch `lastPlayedAt`. Sortierungen nach
   „Zuletzt …“ brauchen eine Modellerweiterung.
3. **Sortierung darf nie `videoIDs` verändern.** Verknüpfte Playlists
   (`linked`) synchronisieren ihre Reihenfolge mit dem iPhone. Sortierung ist
   eine reine Ansicht.
4. **Für persistierte Einstellungen gibt es ein Muster.** `PlayerPreferences`
   (`@Observable` + UserDefaults + explizite Setter) dient als Vorlage.

---

## 1. Sortieroptionen pro Ansicht

| Ansicht | Optionen | Default |
|---|---|---|
| Playlists | Titel, Anzahl Titel, Zuletzt gespielt¹, Zuletzt hinzugefügt¹ | Titel ↑ |
| Videos | Titel, Interpret, Dauer, Zuletzt hinzugefügt¹ | Titel ↑ |
| Heruntergeladen | Titel, Interpret, Dauer, Zuletzt heruntergeladen¹ | Zuletzt heruntergeladen ↓ (bis dahin Titel ↑) |
| Verfügbar | **Läuft bald ab** (`validUntil`), Titel, Interpret | Läuft bald ab ↑ |
| Playlist-Detail | **Playlist-Reihenfolge**, Titel, Interpret, Dauer | Playlist-Reihenfolge |

¹ erst ab Phase 3 (neue Datumsfelder).

Die Abschnitte „Own“/„Temp“ in der Playlist-Liste bleiben erhalten; sortiert
wird innerhalb jedes Abschnitts.

---

## 2. Architektur

### 2.1 Pure Sortierlogik (`targets/watch/LibrarySort.swift`)

```swift
enum VideoSortKey: String, CaseIterable { case title, artist, duration, expiry, added, playlistOrder }
enum PlaylistSortKey: String, CaseIterable { case title, trackCount, lastPlayed, added }
struct LibrarySort<Key: RawRepresentable & CaseIterable> { var key: Key; var ascending: Bool }

enum LibrarySorter {
  static func sorted(_ videos: [Video], by sort: LibrarySort<VideoSortKey>) -> [Video]
  static func sorted(_ playlists: [Playlist], by sort: LibrarySort<PlaylistSortKey>) -> [Playlist]
}
```

- Textvergleich mit `localizedStandardCompare`: ignoriert Groß-/Kleinschreibung,
  behandelt Umlaute korrekt und sortiert „Track 2“ vor „Track 10“.
- `nil`-Werte (fehlender Interpret, fehlendes Datum) stehen unabhängig von der
  Richtung immer am Ende.
- Bei Gleichstand entscheidet die `id`, damit die Liste beim Nachladen von
  Metadaten nicht springt.

### 2.2 Im Speicher sortieren statt dynamischer `@Query`

`@Query` legt die Sortierung bei der Initialisierung fest. Ein Wechsel würde
Init-Tricks über Child-Views erfordern, und `SortDescriptor` bildet `nil`-Werte
und lokalisierte Vergleiche bei optionalen Strings nur schlecht ab. Die Listen
auf der Uhr sind klein (Hunderte Einträge), und `orderedVideos` sortiert schon
heute im Speicher.

**Entscheidung:** `@Query` filtert nur noch, `LibrarySorter` sortiert. Das hält
die Logik testbar.

### 2.3 Persistierte Einstellung (`LibrarySortPreferences`)

Aufbau wie `PlayerPreferences`, ein Schlüssel pro Liste:

- `sort.playlists`
- `sort.videos`
- `sort.downloaded`
- `sort.available`
- `sort.playlistDetail`

Für die Playlist-Detailansicht genügt anfangs eine globale Einstellung. Eine
eigene Sortierung pro Playlist (`sort.playlist.<id>`) kann später ergänzt werden.

### 2.4 Die Warteschlange folgt der Ansicht

`PlaylistManager.setPlaylist` bekommt eine optionale, bereits sortierte Liste
und behält trotzdem die Playlist-Referenz:

```swift
func setPlaylist(_ playlist: Playlist?, videos: [Video]? = nil, shuffle: Bool = false)
// neu: Ist playlist gesetzt UND videos übergeben, gilt die übergebene Reihenfolge.
```

Damit bleiben Resume (`ResumeState.playlistID`), der Playlist-Titel im Player
und die Synchronisierung intakt, und der Index aus der Ansicht passt zur Queue.
Das erledigt nebenbei das TODO in `targets/watch/MusicPlayerManager.swift:107`.
Shuffle bleibt unverändert.

---

## 3. Bedienung auf der Uhr

Oben rechts ist der Toolbar-Platz schon durch den Music-Button belegt, oben
links sitzt in Unterseiten der Zurück-Pfeil. Deshalb:

- **Kopfzeile in der Liste**, direkt unter bzw. neben „Shuffle“: `↕ Titel ↑`.
  Sie ist gut auffindbar und mit der Krone erreichbar.
- Ein Tipp öffnet ein **Sheet** mit den Optionen als Liste. Ein Haken markiert
  die aktive Option. Ein erneuter Tipp auf die aktive Option kehrt die Richtung
  um (wie in Apple Music). Danach schließt sich das Sheet.
- Die Optionen werden als `label` und `systemImage` am Enum definiert (wie bei
  `PlayerRepeatMode`). Daraus entstehen wiederverwendbare `SortHeaderButton`-
  und `SortPickerSheet`-Views für alle fünf Listen.

---

## 4. Datenmodell (Phase 3)

Neue **optionale** Felder, damit SwiftData leichtgewichtig migrieren kann (es
gibt bisher kein `VersionedSchema`):

| Feld | Gesetzt in |
|---|---|
| `Video.addedAt: Date?` | beim Anlegen, `targets/watch/DBUtils.swift:79` und `:422` |
| `Video.downloadedAt: Date?` | wenn `downloaded = true` wird, `targets/watch/DBUtils.swift:82` |
| `Video.lastPlayedAt: Date?` | beim Start eines Titels im `MusicPlayerManager` |
| `Playlist.lastPlayedAt: Date?` | in `MusicPlayerManager.updatePlaylist(playlist:…)` |
| `Playlist.addedAt: Date?` | beim Anlegen der Playlist |

Bestehende Einträge haben `nil` und landen bei diesen Sortierungen am Ende.
Das ist vertretbar.

---

## 5. Phasen

1. **Phase 1:** `LibrarySorter`, `LibrarySortPreferences` und Sortier-UI für
   Playlists, Videos, Heruntergeladen und Verfügbar, nur mit vorhandenen
   Feldern. Dabei wird die Z→A-Sortierung in „Heruntergeladen“ korrigiert.
2. **Phase 2:** Playlist-Detail mit Sortierung und Anpassung der Queue
   (`setPlaylist` mit sortierter Liste).
3. **Phase 3:** Datumsfelder und Sortierungen nach „Zuletzt
   hinzugefügt/heruntergeladen/gespielt“.
4. **Optional:** Sortierung pro Playlist merken; die Sortierung der Uhr über
   `RemoteLibraryCommands` auf dem iPhone anzeigen.

---

## 6. Lokalisierung und Tests

- Die Watch-UI ist bisher fest auf Englisch. Die Bezeichnungen der
  Sortieroptionen liegen gesammelt am Enum, als `String(localized:)` mit einem
  String Catalog für en/de. Später muss nur an einer Stelle übersetzt werden.
- `LibrarySorter` ist reine Logik. Es gibt noch keinen Swift-Testtarget für die
  Watch. Lohnt sich einer, sollten diese Fälle zuerst abgedeckt werden:
  `nil`-Werte zuletzt, Umlaute, „Track 2 vs. 10“, stabiler Gleichstand,
  Playlist-Reihenfolge.

---

## 7. Offene Fragen

- Soll sich die Playlist-Detailansicht die Sortierung **global** oder **pro
  Playlist** merken?
- Soll „Ab hier abspielen“ in einer sortierten Playlist die **sortierte**
  Reihenfolge abspielen (Vorschlag) oder immer die Original-Reihenfolge?
