# Plan: Sortierungsmöglichkeiten in der Watch-App

> Stand: 2026-10-21 · UI-Review eingearbeitet.
> Scope: `targets/watch/**` (watchOS, SwiftUI/SwiftData), lokale Einstellungen,
> Queue/Resume und native en/de-Ressourcen für die betroffenen Ansichten.
> Nicht im Scope: Sortierung auf Telefon/TV, Änderungen am Sync-Protokoll.

---

## 0. Befund und verbindliche Leitplanken

| Ansicht                        | Datei                                  | Sortierung heute                       |
| ------------------------------ | -------------------------------------- | -------------------------------------- |
| Playlists (eigene + temporäre) | `targets/watch/LibraryView.swift`      | Titel A–Z (`@Query`)                   |
| Videos                         | `targets/watch/LibraryView.swift`      | Titel A–Z (`@Query`)                   |
| Verfügbar                      | `targets/watch/LibraryView.swift`      | Titel A–Z (`@Query`)                   |
| Heruntergeladen                | `targets/watch/LibraryView.swift`      | Titel Z–A (`@Query`)                   |
| Playlist-Detail                | `targets/watch/PlaylistListView.swift` | Playlist-Reihenfolge (`orderedVideos`) |

1. **Sortierung ist eine lokale Ansichtseinstellung.** Sie verändert weder
   `Playlist.videoIDs` noch die Reihenfolge auf dem iPhone. Abschnitte für eigene
   und temporäre Playlists bleiben erhalten; sortiert wird innerhalb der Abschnitte.
2. **Die laufende Queue bleibt bei einem Sortierwechsel unverändert.** Erst ein
   neuer Wiedergabestart übernimmt die sichtbare Reihenfolge. Auch nachgeladene
   Metadaten und Sync-Updates dürfen eine bereits gestartete Queue nicht umsortieren.
3. **Ein Titel wird über seine ID gestartet.** Die Playlist-Detailansicht übergibt
   heute einen Index; `setupPlayer()` filtert anschließend nicht abspielbare Titel
   heraus. Eine sortierte Eingabeliste allein behebt diese Indexverschiebung nicht.
4. **Resume braucht die Queue-Reihenfolge.** Aktuell speichert `ResumeState` zwar
   die Video-ID, stellt Playlists aber über deren ursprüngliche Reihenfolge und
   einen Index wieder her. Eine Playlist-Referenz allein erhält einen sortierten
   oder gemischten Wiedergabestart nicht korrekt.
5. **Das bisherige Startverhalten bleibt pro Ansicht erhalten.** „Videos“ spielt
   nur den angetippten Titel; „Heruntergeladen“ und „Verfügbar“ spielen ab dem
   angetippten Titel weiter. Playlist-Details übernehmen die gesamte sichtbare
   Reihenfolge und starten beim angetippten Titel. Sortierung führt keine neue
   „Alle abspielen“-Funktion ein.
6. **Datumsfelder fehlen bisher.** `addedAt`, `downloadedAt` und `lastPlayedAt`
   erfordern eine Modellerweiterung und werden erst in Phase 3 angeboten.
7. **Einstellungen und Lokalisierung sind getrennte Grenzen.** `PlayerPreferences`
   ist das Muster für lokale Persistenz. Im React-Native-Teil existiert bereits
   `uiLanguage`; die native Watch benötigt eine explizite Sprachquelle (Abschnitt 6).

---

## 1. Sortieroptionen und Standards

| Ansicht         | Optionen                                                | Standard beim ersten Öffnen |
| --------------- | ------------------------------------------------------- | --------------------------- |
| Playlists       | Titel, Anzahl Titel, Zuletzt gespielt¹, Hinzugefügt am¹ | Titel A–Z                   |
| Videos          | Titel, Interpret, Dauer, Hinzugefügt am¹                | Titel A–Z                   |
| Heruntergeladen | Titel, Interpret, Dauer, Heruntergeladen am¹            | Titel A–Z                   |
| Verfügbar       | Titel, Interpret, Stream-Gültigkeit                     | Titel A–Z                   |
| Playlist-Detail | Playlist-Reihenfolge, Titel, Interpret, Dauer           | Playlist-Reihenfolge        |

¹ Erst ab Phase 3 sichtbar und auswählbar; keine deaktivierten Platzhalter.

Neue Sortieroptionen ändern bestehende Einstellungen oder den Standard nicht
automatisch. Insbesondere wechselt „Heruntergeladen“ in Phase 3 nicht ungefragt
von Titel auf Download-Datum.

### 1.1 Kriterium und Richtung

| Kriterium                                        | Erste Richtung bei erstmaliger Auswahl | Andere Richtung         |
| ------------------------------------------------ | -------------------------------------- | ----------------------- |
| Titel / Interpret                                | A–Z                                    | Z–A                     |
| Anzahl Titel                                     | Meiste zuerst                          | Wenigste zuerst         |
| Dauer                                            | Kürzeste zuerst                        | Längste zuerst          |
| Stream-Gültigkeit                                | Bald ablaufend zuerst                  | Später ablaufend zuerst |
| Hinzugefügt / Heruntergeladen / Zuletzt gespielt | Neueste zuerst                         | Älteste zuerst          |
| Playlist-Reihenfolge                             | Originalreihenfolge                    | Keine Richtungswahl     |

Beim Wechsel des Kriteriums gilt dessen erste Richtung. Die gespeicherte aktive
Kombination wird beim erneuten Öffnen wiederhergestellt. Für „Playlist-Reihenfolge“
gibt es keinen wirksamen Richtungswert und keine versteckte Umkehrfunktion.

### 1.2 Bedeutung von „Verfügbar“

Diese Ansicht wird ausdrücklich zur Liste der **aktuell verfügbaren Streams**:
`downloaded == false`, keine lokale `fileURL`, vorhandene `streamURL` und
`validUntil > now`. Lokale Downloads stehen unter „Heruntergeladen“ und werden
nicht als ablaufend dargestellt. Diese Filteränderung gehört zum Scope und muss
mitgetestet werden.

Die Ansicht erhält einen kurzen lokalisierten Hinweis: „Aktuell streambar.
Downloads findest du unter Heruntergeladen.“ `validUntil` bedeutet ausschließlich
die Gültigkeit der Streaming-Daten, nicht das Verschwinden des Titels oder das
Ablaufen eines lokalen Downloads. Daher heißt das Kriterium „Stream-Gültigkeit“.

Beim Öffnen, bei Rückkehr in den Vordergrund und während der Anzeige regelmäßig
(mindestens einmal pro Minute) wird die Zeitbasis aktualisiert. Direkt vor dem
Start wird die Verfügbarkeit erneut geprüft. Ein inzwischen abgelaufener Titel
führt zu einer verständlichen Rückmeldung und startet keinen anderen Titel.

---

## 2. Architektur und Wiedergabe

### 2.1 Pure Sortierlogik (`targets/watch/LibrarySort.swift`)

- Getrennte, typisierte Kriterien für Videos und Playlists. Das Videomodell der
  Sortieroptionen umfasst auch `downloaded`; eine explizite Zulässigkeitsliste
  pro Ansicht verhindert unpassende Optionen aus einem gemeinsamen `CaseIterable`.
- „Playlist-Reihenfolge“ ist ein eigener Zustand: `orderedVideos` unverändert
  übernehmen, keinen Titel- oder ID-Vergleich darauf anwenden.
- Lokalisierter natürlicher Textvergleich mit zur Watch-UI passender Locale;
  Groß-/Kleinschreibung, Umlaute und „Track 2“ vor „Track 10“ gezielt testen.
- Fehlende/leer getrimmte Texte, fehlende Datumswerte und unbekannte Dauer
  (`durationMillis <= 0`) stehen unabhängig von der Richtung zuletzt.
- Bei Gleichstand entscheidet die ID in fester Richtung. Das erzeugt eine
  deterministische Ordnung, verhindert aber keine Positionswechsel, wenn sich
  das eigentliche Sortierfeld durch neue Metadaten ändert (siehe Abschnitt 3.4).
- Für „Anzahl Titel“ dieselbe Zählregel wie in `LibraryPlaylistRow` verwenden:
  `max(videoIDs.count, videos.count)`. Angezeigter Wert und Sortierung müssen
  übereinstimmen.

### 2.2 Abfragen und Darstellung

`@Query` lädt/filtert die Daten; `LibrarySorter` sortiert im Speicher. Die
zeitabhängige Stream-Verfügbarkeit wird mit einer erneuerbaren Zeitbasis
gefiltert, nicht ausschließlich mit dem einmaligen `Date()` aus dem View-Init.
Für die erwarteten Hunderte Einträge ist dieser Ansatz zunächst angemessen;
Scrollen und Aktualisierungen werden auf einer kleinen Watch geprüft.

Die UI arbeitet mit stabilen Video-/Playlist-IDs. Sichtbare Reihenfolge und
zugehörige Startaktion müssen aus demselben Darstellungssnapshot stammen.

### 2.3 Persistierte Einstellung (`LibrarySortPreferences`)

Aufbau wie `PlayerPreferences`: beobachtbarer Zustand, UserDefaults und explizite
Setter. Gespeichert werden stabile technische Werte, keine übersetzten Labels.

- Je eine Einstellung für `sort.playlists`, `sort.videos`, `sort.downloaded`
  und `sort.available`.
- Playlist-Details speichern ihre Einstellung **von Anfang an pro Playlist-ID**,
  beispielsweise als Dictionary unter `sort.playlistDetails`. Kein globaler
  Detail-Standard, der eine Auswahl auf andere Playlists überträgt.
- Ohne gespeicherte Einstellung gilt der Standard aus Abschnitt 1.
- Ungültige oder in der Ansicht nicht unterstützte Werte fallen auf deren
  Standard zurück. Lokales Löschen einer Playlist entfernt ihre Einstellung;
  ein Metadaten-Refresh oder Sync derselben Playlist setzt sie nicht zurück.

### 2.4 Start aus einer sortierten Ansicht

`PlaylistManager.setPlaylist(_:videos:shuffle:)` besitzt bereits einen optionalen
`videos`-Parameter, ignoriert ihn aber bei gesetzter Playlist. Das wird angepasst:
Eine übergebene Liste bestimmt die Reihenfolge; die Playlist-Referenz bleibt für
Titel und Resume erhalten. Auch `MusicPlayerManager` muss diese Reihenfolge und
die ausgewählte Video-ID durch den gesamten Startpfad weitergeben.

Verbindlicher Ablauf:

1. Beim Tipp die sichtbare Reihenfolge und ausgewählte Video-ID erfassen.
2. Den Queue-Umfang entsprechend Abschnitt 0 bilden. Bei explizitem Shuffle
   einmal mischen und die resultierende Reihenfolge festhalten.
3. Die tatsächlich abspielbaren Player-Items erstellen und den Startindex erst
   **danach anhand der ausgewählten ID** auflösen.
4. Ist der ausgewählte Titel nicht abspielbar, keinen Ersatztitel starten.
   Bestehende Wiedergabe möglichst erhalten; lokalisierte Rückmeldung mit der
   vorhandenen Möglichkeit zum Aktualisieren der Streaming-Daten anbieten.
5. Die gestartete Queue anschließend unabhängig von der Ansicht behandeln.

Ein normaler Tipp auf einen Titel startet ihn in sichtbarer Reihenfolge, auch
bei gespeicherter Shuffle-Präferenz. Die vorhandenen expliziten Shuffle-Aktionen
bleiben erhalten; sie verwenden dieselbe Titelmenge wie bisher und erhalten bei
Playlist-Details die Playlist-Referenz. Ein späterer Sortierwechsel mischt nicht neu.

### 2.5 Resume einer sortierten oder gemischten Queue

`ResumeState` bekommt eine optional decodierbare geordnete Liste der Queue-Video-IDs.
Gespeichert werden die tatsächliche Queue-Reihenfolge, die aktuelle Video-ID und
Position sowie weiterhin die Playlist-ID und der Playlist-Titel. Ein Index darf
als Hilfswert erhalten bleiben, ist aber nicht die Identität des Titels.

- Beim Fortsetzen die gespeicherten IDs in derselben Reihenfolge auflösen und
  nach der Verfügbarkeitsprüfung den aktuellen Titel über seine ID finden.
- Eine inzwischen geänderte Ansichtssortierung oder Playlist-Reihenfolge darf
  das Resume nicht verändern. Neue Playlist-Titel werden nicht automatisch in
  eine wiederhergestellte Queue eingefügt.
- Gelöschte andere Titel überspringen. Fehlt der aktuelle Titel oder ist er nicht
  abspielbar, nicht auf den alten Index ausweichen; verständlich rückmelden.
- Bei alten Resume-Daten ohne Queue-IDs die aktuelle Playlist-Reihenfolge als
  Fallback verwenden, aber auch dort den Start über `videoID` auflösen. Ist die
  Playlist entfallen, den vorhandenen Einzelvideo-Fallback beibehalten.

Diese Änderung gehört zwingend zur Playlist-Sortierung in Phase 2. Das bisherige
Index-TODO ist erst mit ID-basiertem Start und entsprechenden Regressionstests erledigt.

---

## 3. Bedienung auf der Uhr

### 3.1 Einheitliche Sortierzeile

Alle fünf Listen erhalten oben eine **eigene, vollbreite Button-Zeile**:
„Sortieren: Titel A–Z“ bzw. „Sortieren: Playlist-Reihenfolge“. Ein Sortiersymbol
unterstützt den Text; Pfeile allein vermitteln weder Kriterium noch Richtung.

Die Sortierzeile steht vor den Playlist-Abschnitten bzw. Titelzeilen. Wo heute
„Shuffle“ existiert, folgt dessen eigene Zeile direkt danach. Keine beiden
Aktionen nebeneinander und keine neuen Shuffle-Buttons in den anderen Ansichten.
Der vorhandene Music-Button und die Zurück-Navigation bleiben erreichbar.

Bei langer Beschriftung oder großer Schrift darf die Zusammenfassung mehrzeilig
werden. Vollbreite Touchflächen und der vollständige zugängliche Text sind
wichtiger als eine feste Zeilenhöhe. Nach Öffnen des Sheets wird die aktuelle
Auswahl sichtbar gemacht.

### 3.2 Sortier-Sheet mit expliziter Bestätigung

`SortPickerSheet` zeigt den Titel „Sortieren“, einen Abschnitt „Sortieren nach“
mit den zulässigen Kriterien und darunter „Reihenfolge“ mit den zwei passenden,
ausgeschriebenen Richtungen aus Abschnitt 1.1. Ein Haken und der zugängliche
Auswahlzustand markieren die aktive Option. Bei „Playlist-Reihenfolge“ entfällt
der Richtungsabschnitt vollständig.

- Das Sheet bearbeitet einen lokalen Entwurf; Auswahländerungen schließen es
  nicht automatisch und sortieren die Hintergrundliste noch nicht um.
- Ein erneuter Tipp auf die ausgewählte Option verändert nichts.
- „Anwenden“ übernimmt Kriterium und Richtung gemeinsam, persistiert sie und
  schließt das Sheet. Bei unverändertem Entwurf ist es deaktiviert.
- „Abbrechen“ und das systemseitige Schließen verwerfen den Entwurf. Der
  Schließweg ist auch mit VoiceOver erreichbar.

Damit sind Kriterium, Richtung und Zeitpunkt der Anwendung eindeutig. Die
Darstellung verwendet gemeinsame `SortHeaderButton`-/`SortPickerSheet`-Views;
Labels und Richtungen stammen aus zentralen lokalisierten Ressourcen.

### 3.3 Sortierwerte in den Zeilen sichtbar machen

Die Titel-/Interpret-Darstellung bleibt erhalten. Für das aktive Kriterium wird
bei Bedarf eine kompakte Zusatzinformation eingeblendet:

| Kriterium                     | Zusatzinformation                                                    |
| ----------------------------- | -------------------------------------------------------------------- |
| Dauer                         | Locale-gerecht formatierte Dauer, z. B. „3:42“                       |
| Stream-Gültigkeit             | „Stream gültig für 23 Min.“; kein Ablaufhinweis für lokale Downloads |
| Hinzugefügt / Heruntergeladen | Beschriftetes, lokalisiertes Datum                                   |
| Zuletzt gespielt              | Beschrifteter relativer Zeitpunkt bzw. Datum                         |
| Anzahl Titel                  | Bereits vorhandene Titelanzahl; keine doppelte Anzeige               |

Unbekannte Werte bekommen einen passenden lokalisierten Hinweis, etwa „Dauer
unbekannt“. Bei fehlendem historischem Datum niemals einen Zeitpunkt erfinden
oder „Nie gespielt“ behaupten. Für Titel/Interpret ist keine doppelte Zusatzzeile
nötig. Datum/Dauer dürfen bei großer Schrift umbrechen; Download-Fortschritt und
Abspielbarkeitszustand bleiben erkennbar.

Leere Listen zeigen eine passende lokalisierte Leermeldung. Die Sortierzeile
bleibt erreichbar, eine vorhandene Shuffle-Aktion ist bei leerer Liste deaktiviert.

### 3.4 Scrollposition und dynamische Aktualisierungen

Bei „Anwenden“ bewusst an den Listenanfang zur Sortierzeile scrollen und den
neuen Zustand zugänglich ankündigen. Bei Abbrechen zur bisherigen Position und
zum auslösenden Button zurückkehren.

Für automatische Metadaten-/Sync-Updates gilt ein anderer Ablauf: Während einer
Scroll- oder Fokusinteraktion die dargestellte Reihenfolge einfrieren; neue
Sortierschlüssel und Mitgliedschaftsänderungen gesammelt nach der Interaktion
übernehmen. Den obersten sichtbaren bzw. mit VoiceOver fokussierten Eintrag per
ID als Anker erhalten. Entfällt dieser, den nächsten erhaltenen Nachbarn verwenden.
Bestehende Einträge dürfen dabei aktuelle Metadaten anzeigen. Abspielbarkeit vor
dem Start immer neu prüfen, auch wenn eine Zeile noch im Darstellungssnapshot ist.

Die Umsetzung muss explizit festlegen und im Simulator nachweisen, wie sie auf
den unterstützten watchOS-Versionen Scroll-/Fokusinteraktionen und deren Ende
erfasst. Ein ID-basierter `ForEach` allein erfüllt diese Anforderung nicht.

---

## 4. Datenmodell (Phase 3)

Neue optionale Felder erlauben zunächst unbekannte historische Werte. Ob die
vorhandene SwiftData-Datenbank ohne explizites `VersionedSchema` leichtgewichtig
migriert, muss mit einem bestehenden Store nachgewiesen werden; kein Store-Reset
als Migrationsstrategie.

| Feld                           | Bedeutung und Schreibzeitpunkt                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Video.addedAt: Date?`         | Einmalig beim lokalen Anlegen; `addDownloadData` und den Wiederherstellungspfad `overrideDatabase` in `DBUtils.swift` prüfen; nicht bei Metadaten-Refresh überschreiben |
| `Video.downloadedAt: Date?`    | Nach erfolgreichem Abschluss eines Downloads beim Übergang zu `downloaded == true`; nicht bei jedem erneuten Setzen von `true`                                          |
| `Playlist.lastPlayedAt: Date?` | Beim tatsächlichen Start eines Titels aus dieser Playlist, nicht bereits beim Aufbau einer Queue oder Öffnen der Ansicht                                                |
| `Playlist.addedAt: Date?`      | Einmalig beim lokalen Anlegen der Playlist                                                                                                                              |

„Hinzugefügt“ bedeutet auf der Watch hinzugefügt, nicht auf YouTube erstellt oder
zu einer Playlist hinzugefügt. `Video.lastPlayedAt` ist für die geplanten Optionen
nicht erforderlich und bleibt außerhalb dieser Phase.

Ein nach dem Löschen erneut erfolgreich heruntergeladener Titel erhält einen
neuen Download-Zeitpunkt. Alle Schreibpfade einschließlich automatischer
Playlist-Downloads prüfen. Bestehende Einträge behalten `nil` und stehen bei
Datumssortierungen zuletzt. Keine Rückdatierung und keine pauschale Belegung
mit dem Migrationsdatum.

---

## 5. Umsetzungsphasen und Freigabekriterien

1. **Phase 1: Listen und eindeutige Bedienung.** Sortierlogik, lokale Persistenz,
   Sortierzeile/Sheet für Playlists, Videos, Downloads und verfügbare Streams.
   Z–A-Standard der Downloads korrigieren; Stream-Filter, Zusatzinformationen,
   native en/de-Texte und ID-basierten Start für die betroffenen Listen umsetzen.
   Abnahme: explizite Richtung, unveränderte laufende Queue, korrekter angetippter
   Titel sowie kleine Watch/große Schrift/VoiceOver.
2. **Phase 2: Playlist-Details und Resume.** Einstellung pro Playlist, sortierte
   Queue mit Playlist-Referenz, ID-basierter Start nach Verfügbarkeitsfilterung
   und kompatibel erweiterter Resume-State. Gemeinsam ausliefern;
   Playlist-Sortierung nicht vor der Queue-/Resume-Absicherung aktivieren.
3. **Phase 3: Historische Sortierungen.** Felder, alle relevanten Schreibpfade,
   Migrationstest und Zusatzanzeigen ergänzen. Bestehende Auswahl und Standards
   erhalten; unbekannte Werte transparent darstellen.
4. **Optional später:** Watch-Sortierung auf dem iPhone anzeigen oder gemeinsame
   UI-Sprachwahl synchronisieren. Beides erfordert eine eigene Erweiterung des
   aktuellen Scopes und gegebenenfalls des Sync-Protokolls.

---

## 6. Lokalisierung und Barrierefreiheit

- Die Watch erhält eine eigene persistierte UI-Einstellung `uiLanguage` mit
  `en`/`de`, englischem Standard und englischem Fallback. Sie wird in den nativen
  Watch-Einstellungen angeboten und ohne Neustart angewendet. Eine Synchronisierung
  mit `src/localization/` auf dem Telefon ist hier nicht vorgesehen; die
  Einstellung ist als Sprache dieser Watch-App erkennbar.
- YouTube-Content-Sprache und `AppSettings.languageSelected` bleiben getrennt.
  Sortiervergleiche und Datums-/Zahlenformatierung folgen der Watch-UI-Locale.
- Native Lokalisierung zentral kapseln; ein String Catalog mit identischen
  semantischen Schlüsseln für en/de, z. B. `library.sort.title`. Keine vollständigen
  englischen Sätze als Schlüssel und keine Übersetzungen direkt im Sortieralgorithmus.
- Alle sichtbaren Texte der betroffenen Library-/Playlist-Ansichten und des neuen
  Sprachselektors lokalisieren: Titel, Abschnitte, Buttons, Dialoge, Leermeldungen,
  Rückmeldungen, Zusatzwerte und Accessibility-Texte. Bestehende gemeinsame
  Titelzeilen berücksichtigen; API-Titel, Interpret und Playlist-Namen unverändert lassen.
- Dynamische Werte interpolieren und locale-gerecht formatieren. Keine aus
  einzelnen übersetzten Fragmenten zusammengesetzten Sätze.
- VoiceOver nennt beim Sortierbutton Aktion, Kriterium und Richtung; Optionen
  besitzen einen Auswahlzustand. Haken, Pfeile und Farben sind nie die einzige
  Zustandsinformation. Große Schrift und vollständige Touchflächen mitprüfen.

---

## 7. Verifikation und Abnahme

### 7.1 Automatisierte Regressionstests

Für die pure Sortierlogik und Queue-/Resume-Auflösung ist ein ausführbarer
Swift-Testweg erforderlich, etwa ein gezielter Testtarget oder ein Swift-Testpaket mit
unabhängigen Werttypen. Tests sind Bestandteil der jeweiligen Phase; ein bloßes
manuelles Durchsehen der Sortierfunktion genügt nicht.

- Beide Richtungen; fehlende/leer getrimmte Texte und unbekannte Dauer immer
  zuletzt; Umlaute und natürliche Zahlenreihenfolge für en/de; ID-Gleichstände.
- Originale Playlist-Reihenfolge unverändert, keine Mutation von `videoIDs`;
  Sortierkriterien je Ansicht und angezeigte Playlist-Titelanzahl stimmen überein.
- Persistenz getrennt pro Liste/Playlist, unbekannte gespeicherte Werte,
  Wiederöffnen und kein automatischer Standardwechsel nach Phase 3.
- Stream-Filter: Downloads ausgeschlossen, fehlende URL, abgelaufene Gültigkeit,
  Uhrzeitwechsel und Ablauf zwischen Anzeige und Tipp.
- Nicht abspielbarer Titel vor der Auswahl verschiebt den Start nicht; nicht
  abspielbare Auswahl startet keinen anderen Titel; leere Queue ist sicher.
- Sortierte und gemischte Queue über Neustart erhalten; Resume über Video-ID
  trotz geänderter Sortierung, gelöschter Nachbartitel oder Playlist-Sync.
  Alte Resume-Daten bleiben lesbar und fehlende aktuelle Titel werden behandelt.
- Phase 3: bestehender SwiftData-Store bleibt erhalten; `nil` bleibt unbekannt;
  Refresh verändert `addedAt` nicht; Download-Abschluss/erneuter Download und
  tatsächlicher Playlist-Wiedergabestart setzen die richtigen Zeitpunkte.

### 7.2 Manuelle UI-Abnahme

- Kleinstes unterstütztes Watch-Display und größere Watch, en/de, größte
  unterstützte Dynamic-Type-Größe sowie lange Titel/Labels.
- Alle fünf Listen: Sortierzeile auffindbar, Texte lesbar, Music/Zurück erreichbar;
  keine gedrängten nebeneinanderliegenden Sortier-/Shuffle-Touchflächen.
- Sheet: Kriterium und Richtung getrennt; erneuter Tipp auf Auswahl ohne Effekt;
  Anwenden übernimmt einmal; Abbrechen/systemseitiges Schließen verändert nichts.
- VoiceOver: vollständige Beschriftung, Auswahlzustände, sinnvoller Fokus nach
  Schließen und erhaltene Orientierung nach automatischen Aktualisierungen.
- Leere Liste, ein Eintrag, Hunderte Einträge, fehlende Metadaten, aktive Downloads,
  Metadaten-Refresh/Sync beim Scrollen und während das Sheet offen ist.
- Sortierwechsel bei laufender Wiedergabe: aktueller Titel, Position und „Als
  Nächstes“ bleiben gleich; ein neuer Start folgt der sichtbaren Reihenfolge.
- Verfügbarer Stream läuft ab; lokale Downloads erscheinen nicht als ablaufend;
  sichtbarer Sortierwert erklärt die Reihenfolge.
- Sprachwechsel greift ohne Neustart, übersetzt keine API-Metadaten und ändert
  keine YouTube-Content-Einstellung.

Für Swift-Änderungen den verfügbaren Watch-Build und gezielte Tests ausführen.
Bei gemeinsamem JavaScript/TypeScript oder Konfiguration zusätzlich die Gates aus
`AGENTS.md` ausführen. Simulator- und Geräteprüfung getrennt dokumentieren;
erfolgreiche reine Logiktests ersetzen keine visuelle Watch-Abnahme.
