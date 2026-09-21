# ReactTube UI-Modernisierung

## Zielbild

ReactTube soll sich auf Phone, Tablet und TV so vertraut und inhaltszentriert wie
YouTube bedienen lassen, dabei aber als eigenständige App erkennbar bleiben. Der
Umbau priorisiert Videos, klare Navigation, konsistente Zustände und gute
Bedienbarkeit auf Touch-Geräten und mit der TV-Fernbedienung.

Die Apple-Watch-App übernimmt dieselben semantischen Farben und Begriffe, bleibt
aber eine native SwiftUI-Oberfläche. Sie soll nicht wie eine verkleinerte
Phone-App wirken.

## Leitplanken

- YouTube dient als UX-Referenz, nicht als Vorlage zum pixelgenauen Kopieren.
- ReactTube behält Name, Icon und eine eigene Markenidentität. YouTube-Logos oder
  andere geschützte Markenassets werden nicht nachgebaut.
- Inhalte stehen visuell vor Chrome, Dekoration und Animation.
- Phone, Tablet, TV und Watch teilen semantische Grundlagen, aber nicht zwingend
  dieselben Komponenten oder Layouts.
- Dark Mode wird zuerst vollständig und konsistent umgesetzt. Ein Light Mode ist
  danach ohne erneuten Komponentenumbau ergänzbar.
- Jede Phase muss eigenständig testbar und auslieferbar sein.
- Bestehende Daten-, Playback- und Download-Logik wird nur verändert, wenn dies
  für die neue Oberfläche erforderlich ist.

## Bestandsaufnahme

### Was bereits gut nutzbar ist

- Phone und TV besitzen für viele Oberflächen bereits getrennte Varianten.
- Feed-, Video-, Channel-, Playlist-, Download- und Music-Funktionen sind in
  Komponenten und Hooks aufgeteilt.
- `expo-image`, React Navigation, Reanimated und Safe Area Context sind bereits
  vorhanden.
- TV-Fokus und Remote-Ereignisse werden an mehreren Stellen explizit behandelt.
- Der Watch-Client verwendet native SwiftUI-Navigation und Systemkomponenten.

### Größte UI-Schulden

- `src/context/AppStyleContext.tsx` definiert nur vier Farbwerte und unterstützt
  faktisch ausschließlich Dark Mode.
- Farben, Schriftgrößen, Abstände und Radien sind in vielen Komponenten direkt
  eingetragen. Im aktuellen `src/` gibt es mehr als 100 Hex-Farbvorkommen und
  knapp 150 direkte `fontSize`-Definitionen.
- Phone- und TV-Karten zeigen ähnliche Daten mit deutlich unterschiedlichen
  Metadaten, Radien, Fokusrahmen und Overlays.
- `BottomTabBarNavigator` kann bis zu sechs Ziele gleichzeitig anzeigen;
  Einstellungen und Konto sind als gleichwertige Hauptziele modelliert.
- Der TV-Drawer verwendet feste Breiten und ein pauschales Grau statt
  semantischer Oberflächen- und Fokuszustände.
- Settings mischen eine weiße, iOS-artige Liste mit der ansonsten dunklen App.
- Lade-, Leer- und Fehlerzustände sind nicht als gemeinsames Muster umgesetzt.
- UI-Texte, Navigationstitel und Accessibility Labels sind verstreut und nur
  teilweise vorhanden. Eine getrennte UI-Lokalisierung für Englisch und Deutsch
  existiert noch nicht.
- `app.json` verwendet Blau als Primärfarbe, während Fortschritt, Live-Zustände
  und weitere Aktionen uneinheitlich Rot, Blau, Gelb oder Bibliotheksfarben
  verwenden.
- Der Music-Bereich wirkt wie eine separate Oberfläche und ist visuell nur lose
  mit dem Video-Bereich verbunden.

## Designprinzipien

1. **Content first:** Thumbnails, Titel und Creator-Informationen bestimmen die
   visuelle Hierarchie.
2. **Vertraute Navigation:** Hauptziele bleiben stabil; sekundäre Funktionen
   wandern in „Du“ beziehungsweise „You“.
3. **Semantische Farben:** Komponenten verwenden Rollen wie `surface`,
   `textMuted` oder `mediaProgress`, niemals frei gewählte Hex-Werte.
4. **Eine Aktion, ein Zustand:** Standard, pressed, selected, disabled, loading
   und TV-focused sind für jede interaktive Komponente definiert.
5. **Ruhige Bewegung:** Animationen erklären Übergänge und Fokus. Sie dienen
   nicht als dauerhafte Dekoration und respektieren reduzierte Bewegung.
6. **Plattformgerecht:** Touch-Ziele, Hover- beziehungsweise Fokusverhalten und
   Informationsdichte werden je Oberfläche optimiert.
7. **Barrierearm:** Lesbare Kontraste, skalierbare Schrift, sinnvolle Labels und
   eine bedienbare Fokusreihenfolge sind Teil jeder Komponente.

## Visuelle Grundlage

Die endgültigen Werte werden nach einem kleinen visuellen Spike festgelegt. Als
Startpunkt dienen folgende semantische Rollen:

| Bereich     | Vorgeschlagene Rollen und Startwerte                                                |
| ----------- | ----------------------------------------------------------------------------------- |
| Hintergrund | `background: #0F0F0F`, `surface: #181818`, `surfaceRaised: #212121`                 |
| Interaktion | `surfacePressed: #303030`, `divider: #3F3F3F`, `focus: #FFFFFF`                     |
| Text        | `textPrimary: #F1F1F1`, `textSecondary: #AAAAAA`, `textDisabled: #717171`           |
| Medien      | `mediaProgress: #FF0033`, `live: #FF0033`, `scrim: rgba(0,0,0,0.72)`                |
| Status      | eigene Rollen für Erfolg, Warnung und Fehler; nicht die Medienfarbe wiederverwenden |
| Abstände    | Basisskala `4, 8, 12, 16, 24, 32, 48`                                               |
| Radien      | `8` für kleine Controls, `12` für Phone-Karten, `16` für Panels und Sheets          |
| Touch       | mindestens `48 x 48` Punkte; Icon allein mindestens `24` Punkte sichtbar            |
| TV-Fokus    | vergrößerte Karte, heller Rand und leichter Shadow; Layout darf nicht springen      |

Typografie wird über Rollen statt über einzelne Größen angesprochen:

- `display`: große TV- und Hero-Titel
- `titleLarge`, `titleMedium`, `titleSmall`: Seiten-, Shelf- und Kartentitel
- `body`, `bodySmall`: Metadaten und Beschreibungen
- `label`, `labelSmall`: Chips, Buttons, Badges und Laufzeit

Jede Rolle definiert Schriftgröße, Zeilenhöhe, Gewicht und maximale Zeilenanzahl
für Phone und TV. Systemschriften bleiben der Standard; eine zusätzliche Font
wird nur eingeführt, wenn sie einen nachweisbaren Mehrwert bietet.

## Informationsarchitektur

### Phone und Tablet

Die Bottom Navigation wird auf höchstens fünf stabile Ziele reduziert:

1. **Start**
2. **Abos** – bei nicht angemeldeten Nutzern sichtbar, aber mit erklärendem
   Sign-in-Zustand
3. **Musik**
4. **Downloads**
5. **Du** – bündelt Verlauf, Playlists, Mediathek, Konto und Einstellungen

Suche bleibt eine globale Aktion im App Header und ist zusätzlich aus leeren
Feeds erreichbar. Reels/Shorts werden zunächst als Inhaltsformat im Feed und
Player verbessert; ein eigener Tab wird erst nach Nutzungsvalidierung erwogen.

Auf Tablets wird dieselbe Hierarchie als adaptive Navigation Rail oder breite
Split View dargestellt, statt lediglich mehr Spalten in die Phone-Oberfläche zu
quetschen.

### TV

Der linke Rail bleibt das Hauptmuster, erhält aber eine eindeutige Auswahl- und
Fokusdarstellung:

- Start
- Suche
- Abos
- Musik
- Du/Mediathek
- Einstellungen am unteren Rand

Der Rail ist auf TV die einzige Hauptnavigation. Eine Bottom Navigation wird auf
TV nicht verwendet; die Ziele bleiben dauerhaft am linken Rand erreichbar.

- **Collapsed (Standardzustand):** schmale Leiste am linken Rand, ausschließlich
  Icons plus Auswahlindikator für das aktive Ziel. Startwert der Breite `96`.
- **Expanded:** sobald der Fokus in den Rail wechselt, verbreitert er sich und
  zeigt Icon plus Label. Startwert der Breite `320`.
- **Contentplane wandert mit:** beim Aufklappen wird die gesamte Contentplane um
  exakt den Zuwachs des Rails nach rechts verschoben, bei den Startwerten also um
  `224`. Der Rail überlagert den Inhalt nicht; er schiebt ihn vor sich her. Das
  entspricht dem Verhalten der YouTube-App auf Apple TV.
- **Verschieben, nicht neu layouten:** der Versatz wird als Transform auf die
  Contentplane animiert, nicht über eine Breitenänderung im Layout. Die Plane
  behält ihre ursprüngliche Breite, Spaltenzahl, Kartenbreiten, Zeilenumbrüche
  und Scrollposition bleiben unverändert, und fokussierte Elemente behalten ihre
  Größe. Was rechts über den Bildschirmrand hinauswandert, wird abgeschnitten und
  nicht neu umbrochen. Heute animiert der TV-Drawer stattdessen seine Breite
  innerhalb einer Flex-Zeile und erzwingt damit ein komplettes Neu-Layout des
  Screens.
- **Selected und focused sind getrennt:** das aktive Ziel bleibt auch im
  eingeklappten Zustand erkennbar; der Fokus ist zusätzlich und deutlich davon
  unterscheidbar.
- **Öffnen und Schließen:** D-Pad links an der linken Inhaltskante öffnet den
  Rail; D-Pad rechts, die Auswahl eines Ziels und Zurück schließen ihn.
- **Fokusgedächtnis:** der Rail merkt sich sein zuletzt fokussiertes Ziel, und
  beim Zurückwechseln in den Inhalt wird die vorherige Fokusposition
  wiederhergestellt.
- **Hidden:** in der Vollbildwiedergabe wird der Rail vollständig ausgeblendet
  und kehrt erst nach Verlassen des Players zurück.

Die Breitenwerte sind Startwerte für die Umsetzung in Phase 2 und werden am
Gerät gegen Lesedistanz und Overscan geprüft. Suche und Player müssen mit D-Pad
vollständig bedienbar sein.

### Watch

Die Watch behält eine kleine, auf Audio und Offline-Nutzung optimierte Struktur:

- Zuletzt verwendet beziehungsweise Start
- Mediathek und Playlists
- Aktueller Titel
- Downloads
- Einstellungen und Entwicklungstools klar voneinander getrennt

## Zielkomponenten

### Design-System-Schicht

Vorgeschlagene Struktur:

```text
src/ui/
  theme/
    colors.ts
    spacing.ts
    typography.ts
    radii.ts
    motion.ts
    ThemeProvider.tsx
  components/
    AppText.tsx
    AppIconButton.tsx
    AppButton.tsx
    Chip.tsx
    Divider.tsx
    Screen.tsx
    EmptyState.tsx
    ErrorState.tsx
    Skeleton.tsx
    FocusableSurface.tv.tsx
  patterns/
    AppHeader.tsx
    MediaCard.tsx
    MediaRow.tsx
    Shelf.tsx
    ActionBar.tsx
    BottomSheet.tsx
```

Die Plattformdateien `.tv.tsx` und gegebenenfalls `.ios.tsx` bleiben dort
erhalten, wo Interaktion oder Layout tatsächlich abweichen. Reine Datenlogik
bleibt in Hooks, Contexts, Extraction-Modulen und Utilities.

### Einheitliche Medienkarten

Eine gemeinsame, typisierte Datenansicht versorgt Varianten für Video,
Playlist, Reel und Channel. Sie vereinheitlicht:

- Thumbnail-Seitenverhältnis und Fallback
- Dauer-, Live-, Mix- und Download-Badges
- Watch-Progress
- Titel mit definierter Zeilenbegrenzung
- Creator, Views und Veröffentlichungszeit
- Overflow-Menü und Long-Press
- Skeleton und Bildfehlerzustand
- Accessibility Label und Hint
- Touch-, selected- und TV-focus-Zustand

Phone nutzt überwiegend randlose Karten; TV nutzt deutlichere Fokusflächen und
größere Typografie. Das Datenmodell bleibt gemeinsam, das Rendering darf
plattformgerecht variieren.

## Zielbild pro Oberfläche

### Start und Feeds

- Kompakter App Header mit ReactTube-Marke, Suche und Kontoaktion.
- Horizontale Filterchips für Themen, sofern die API passende Filter liefert.
- Einheitliche vertikale Video-Karten auf kleinen Phones, responsives Grid auf
  Tablets und große horizontale Shelves auf TV.
- Shelf-Titel besitzen konsistente Abstände und optional eine „Alle ansehen“-Aktion.
- Pull-to-refresh auf Touch-Geräten; fokussierbare Refresh-Aktion nur auf TV.
- Skeletons ersetzen einen alleinstehenden Spinner beim initialen Feed-Laden.
- Pagination zeigt einen lokalen Footer-Loader und blockiert nicht den Feed.

### Suche

- Suche öffnet sich als klare, globale Oberfläche mit Zurück-Aktion.
- Vorschläge, Verlauf und Ergebnisse verwenden dieselben Zeilen- und Kartenmuster.
- Leere Anfrage, keine Treffer, Offline- und Fehlerfall sind getrennte Zustände.
- Auf TV werden Eingabefeld, Bildschirmtastatur beziehungsweise Systemeingabe,
  Vorschläge und Ergebnisgrid mit vorhersehbaren Fokuswegen verbunden.

### Videodetail und Player

- Video bleibt visuell dominant; Metadaten und Aktionen werden als ruhige,
  gestaffelte Blöcke darunter beziehungsweise daneben angeordnet.
- Titel, Views/Datum, Creator/Subscribe und Aktionschips bilden eine klare
  Reihenfolge.
- Like, Dislike, Speichern, Download und weitere Aktionen nutzen ein gemeinsames
  `ActionBar`-Muster mit Textlabels.
- Beschreibung und Kommentare öffnen in einem Sheet oder Panel, ohne die
  Wiedergabe unnötig zu unterbrechen.
- Phone Landscape reduziert Chrome; Tablet nutzt bei genügend Breite eine
  Player-plus-Up-next-Aufteilung.
- TV verwendet ein seitliches Interaktionspanel und hält das Video sichtbar.
- Fortschritt, Buffering, Fehler, Live und Endscreen erhalten konsistente,
  kontrastreiche Overlays.

### Channel und Playlists

- Channel Header mit Banner, Avatar, Name, Metadaten und eindeutiger Subscribe-Aktion.
- Tabs beziehungsweise Filterchips teilen Home, Videos, Playlists und weitere
  verfügbare Bereiche auf.
- Playlist Header zeigt Artwork, Titel, Creator, Anzahl und primäre Aktionen.
- Listenzeilen werden dichter als Feed-Karten, behalten aber Thumbnail,
  Fortschritt, Overflow und Downloadstatus.

### Musik

- Dieselben Tokens, Header und Zustände wie im Video-Bereich.
- Eigenständige, musikgerechte Karten bleiben erhalten: quadratische Artworks,
  Album-/Artist-Metadaten und kompakte Rows.
- Der Mini Player erhält Artwork, Titel, Artist, Play/Pause, Fortschritt und
  sichere Insets. Er sitzt visuell über der Bottom Navigation.
- Der Full Player bekommt große Artwork-Fläche, klare Transportsteuerung,
  Queue-Zugriff und einen reproduzierbaren Loading-/Stalled-Zustand.

### Du, Settings, Login und Downloads

- „Du“ wird zur zentralen persönlichen Oberfläche mit Konto, Verlauf,
  Playlists, Downloads und Einstellungen.
- Settings verwenden dunkle Sections, semantische Icons, Switches und
  Selector-Zeilen statt einer hellen Fremdoptik.
- Gefährliche Aktionen erhalten eine eigene Danger-Zone und Bestätigung.
- Login erklärt den Gerätecode-Prozess schrittweise; QR-Code, Code,
  Öffnen/Kopieren und Status sind klar getrennt.
- Download-Zustände verwenden konsistente Progress-, Pause-, Retry- und
  Fehlerdarstellungen.

## Lokalisierung als Voraussetzung

Vor der großflächigen Komponenten-Migration wird eine zentrale UI-Lokalisierung
eingeführt:

```text
src/localization/
  en.ts
  de.ts
  types.ts
  LocalizationProvider.tsx
  useTranslation.ts
```

- Neue persistierte Einstellung `uiLanguage` oder `appLocale`.
- `languageSelected` bleibt ausschließlich die YouTube-Inhaltssprache.
- Englisch ist Fallback; Englisch und Deutsch besitzen identische, typisierte Keys.
- Navigationstitel, Buttons, Zustände, Dialoge, Toasts und Accessibility Labels
  werden migriert.
- API-Titel, Kanalnamen, Metadaten, Logs und interne Fehlerdetails bleiben
  unverändert.
- Zahlen, Datum und dynamische Sätze werden lokal formatiert beziehungsweise
  interpoliert.

## Umsetzungsphasen

### Phase 0 – Visueller Spike und Baseline

**Ziel:** Entscheidungen sichtbar machen, bevor viele Komponenten geändert werden.

- Referenz-Screenshots für Phone, Tablet und TV erfassen: Start, Suche,
  Videodetail, Channel, Musik, Du/Settings und Fehlerzustand.
- Zwei kleine Varianten für Feed-Karte, Header, Bottom Navigation und TV-Fokus
  direkt im Projekt prototypisieren.
- Dark-Theme-Tokens, Typografie, Radien und Spacing finalisieren.
- Unterstützte Breakpoints und Gerätegrößen dokumentieren.
- Screenshot-Matrix und messbare Akzeptanzkriterien anlegen.

**Abschluss:** Ein abgestimmtes Mini-Design-Kit und ein ausgewählter vertikaler
Referenzfluss `Start -> Video -> Zurück`.

### Phase 1 – Theme, Lokalisierung und UI-Primitives

**Ziel:** Die neue Basis ohne große Screen-Umbauten integrieren.

- `AppStyleContext` durch einen typisierten Theme Provider ersetzen oder
  kompatibel erweitern.
- React Navigation und React Native Paper mit denselben Theme-Rollen versorgen.
- `app.json`-Farben für Splash, System-Chrome und Android Adaptive UI angleichen.
- UI-Lokalisierung mit separatem `uiLanguage` einführen.
- `AppText`, Buttons, Icon Buttons, Chips, Divider, Screen, Skeleton sowie
  Empty/Error State erstellen.
- Reduced Motion, Dynamic Type und Mindest-Touchflächen berücksichtigen.
- Unit Tests für Theme-Auswahl, persistierte UI-Sprache und Übersetzungs-Fallback.

**Abschluss:** Neue Komponenten enthalten keine direkten Produktfarben oder
sichtbaren Hard-coded-Texte; ein Demo-Screen funktioniert auf Phone und TV.

### Phase 2 – App Shell und Navigation

**Ziel:** Die App fühlt sich bereits vor dem Screen-Umbau zusammenhängend an.

- Phone Bottom Navigation auf Start, Abos, Musik, Downloads und Du umstellen.
- Globalen App Header und Such-Einstieg vereinheitlichen.
- Safe Areas, Status Bar, Navigation Header und Mini Player aus einem System speisen.
- TV-Rail neu aufbauen: collapsed, expanded, selected, focused und hidden.
- Rail-Erweiterung als Overlay umsetzen, ohne den Inhalt zu verschieben.
- Fokuswiederherstellung und Zurück-Verhalten automatisiert beziehungsweise mit
  klarer manueller Matrix prüfen.
- Tablet-adaptive Navigation ergänzen.

**Abschluss:** Alle bestehenden Screens sind über die neue Navigation erreichbar;
kein Ziel geht für an- oder abgemeldete Nutzer verloren.

### Phase 3 – Karten, Shelves und Feed-Zustände

**Ziel:** Der größte sichtbare Bereich erhält die neue Designsprache.

- Video-, Playlist-, Reel- und Channel-Karten auf das gemeinsame Muster migrieren.
- Phone-Feed, Tablet-Grid, TV-Shelves und horizontale Sections angleichen.
- Thumbnail-Fallback, Badges, Progress, Overflow und Accessibility ergänzen.
- Skeleton, Pull-to-refresh, Pagination, Empty und Retry integrieren.
- Start, Abos, Verlauf und Suchergebnisse migrieren.

**Abschluss:** Kein migrierter Feed verwendet alte Karten oder direkte
Layout-Konstanten; Phone- und TV-Interaktionen sind vollständig bedienbar.

### Phase 4 – Player und Videodetail

**Ziel:** Der wichtigste Nutzungspfad ist modernisiert.

- Metadatenhierarchie und Action Bar auf Phone/Tablet umbauen.
- Beschreibung, Kommentare und Playlist Queue in konsistente Sheets/Panel überführen.
- Player Controls, Fortschritt, Loading, Fehler und Endscreen visuell harmonisieren.
- Landscape- und Tablet-Split-Layouts definieren.
- TV-Player mit seitlichem Detail-/Kommentar-Panel und sicherem Fokus ausstatten.
- Picture-in-Picture, Rotation, Resume-Progress und Remote-Aktionen regressionsprüfen.

**Abschluss:** Der Fluss `Feed -> Playback -> Aktion -> Zurück` funktioniert auf
Phone, Tablet und TV ohne Fokus-, Orientierungs- oder Wiedergabeverlust.

### Phase 5 – Sekundäre Oberflächen

**Ziel:** Die Designsprache wird vollständig statt nur auf dem Home Screen sichtbar.

- Channel und Playlist
- Musik Home, Library, Album, Artist, Playlist, Mini Player und Full Player
- Du/Mediathek, Verlauf und lokale Playlists
- Downloads und aktive Transfers
- Settings und Selector-Screens
- Login und Kontoauswahl
- Dialoge, Menüs, Bottom Sheets, Toasts und Diagnostik

**Abschluss:** Sämtliche Nutzeroberflächen verwenden Theme, Typografie,
Lokalisierung und gemeinsame Zustandskomponenten.

### Phase 6 – TV-Härtung

**Ziel:** TV ist eine erstklassige Oberfläche und keine hochskalierte Phone-UI.

- Fokusgraph pro Screen überprüfen.
- Initial Focus, Fokuswiederherstellung, Drawer-Wechsel und Modal-Fokus testen.
- Overscan-sichere Insets und Lesedistanzen prüfen.
- Fokusanimationen unter Last und auf langen Shelves profilieren.
- Back/Menu/Play-Pause/Long-Press auf Apple TV und Android TV testen.
- Große Thumbnails bevorzugen und Bildspeicher beobachten.

**Abschluss:** Alle Kernflüsse sind ausschließlich mit D-Pad/Remote möglich; kein
Fokus verschwindet oder landet hinter einem Overlay.

### Phase 7 – Watch-Angleichung

**Ziel:** Semantisch konsistente, weiterhin native Watch-Oberfläche.

- Texte und Navigation mit der Phone-Terminologie abgleichen.
- Player, Queue, Downloads und Library visuell priorisieren.
- Dev Tools aus regulären Settings herauslösen beziehungsweise nur in Debug Builds zeigen.
- Danger-Aktionen bestätigen und klar kennzeichnen.
- Dynamic Type, VoiceOver, Digital Crown und kleine Displaygrößen prüfen.

**Abschluss:** Die Watch-Kernflüsse funktionieren eigenständig und im Sync mit
dem Phone, ohne Entwickleroptionen im normalen Nutzerpfad.

### Phase 8 – Politur, Messung und Rollout

**Ziel:** Konsistenz und Stabilität vor dem vollständigen Rollout absichern.

- Screenshot-Vergleiche für die definierte Geräte-Matrix.
- Accessibility Audit für Kontrast, Labels, Schriftvergrößerung und Fokus.
- Render- und Scroll-Performance auf langen Feeds messen.
- Leere, Offline-, Fehler-, anonyme und angemeldete Zustände prüfen.
- Optionaler interner Feature-Schalter für schrittweisen Rollout.
- Alte Komponenten und ungenutzte Styles erst nach abgeschlossener Migration entfernen.

**Abschluss:** Akzeptanzmatrix ist grün, alte und neue UI werden nicht mehr im
selben Nutzerfluss gemischt, und das Rollback ist dokumentiert.

## Empfohlene Reihenfolge der ersten Pull Requests

| PR  | Umfang                                            | Risiko  | Sichtbarer Nutzen                  |
| --- | ------------------------------------------------- | ------- | ---------------------------------- |
| 1   | Theme-Tokens, Provider und Navigation-Theme       | niedrig | konsistente Basis                  |
| 2   | UI-Lokalisierung `en`/`de` und Spracheinstellung  | mittel  | zukunftssichere sichtbare Texte    |
| 3   | Text, Button, Chip, State und Skeleton Primitives | niedrig | wiederverwendbare Bausteine        |
| 4   | Phone App Header, Bottom Navigation und „Du“      | mittel  | klare neue Informationsarchitektur |
| 5   | MediaCard plus Phone Home Feed                    | mittel  | größter visueller Sprung           |
| 6   | TV MediaCard, Shelves und Rail                    | hoch    | konsistentes Wohnzimmer-Erlebnis   |
| 7   | Phone Videodetail und Action Bar                  | hoch    | Kernfluss modernisiert             |
| 8   | TV Player Panels und Controls                     | hoch    | Kernfluss auf TV modernisiert      |
| 9   | Musik und Mini Player                             | mittel  | vereinheitlichte Produktbereiche   |
| 10  | Settings, Login, Downloads und Restmigration      | mittel  | vollständige Konsistenz            |
| 11  | Watch, Accessibility und Performance-Härtung      | mittel  | plattformübergreifender Abschluss  |

PRs sollten klein genug bleiben, dass alte und neue Komponenten vorübergehend
über Adapter koexistieren können. Ein Big-Bang-Umbau würde Navigation, Playback
und TV-Fokus unnötig gleichzeitig riskieren.

## Qualitäts- und Testmatrix

### Geräte

- kleines iPhone und großes iPhone
- kleines Android Phone und großes Android Phone
- iPad Hoch- und Querformat
- Android Tablet, sofern verfügbar
- Apple TV
- Android TV
- mindestens zwei unterstützte Apple-Watch-Größen

### Zustände

- angemeldet und abgemeldet
- initiales Laden, Pagination und Refresh
- leer, offline, API-Fehler und Bildfehler
- Video, Live, Mix, Playlist, Reel und Musik
- Download läuft, pausiert, fehlgeschlagen und abgeschlossen
- sehr lange Titel, fehlende Metadaten und große Systemschrift
- Deutsch und Englisch
- Reduced Motion und Screen Reader

### Automatisierung und Gates

- Pure Theme-, Mapping-, Localization- und Formatierungslogik mit Node Tests abdecken.
- Kritische Phone-Flows in Maestro ergänzen: Navigation, Suche, Video öffnen,
  speichern, Download und Sprache wechseln.
- TV-Fokus zunächst mit gezielten Komponententests und einer manuellen Remote-Matrix prüfen.
- Watch mit einem gezielten Xcode Build und, wo möglich, UI-/Snapshot-Tests prüfen.
- Für jeden Code-PR:

```sh
npx prettier --write <changed-files>
npx prettier --check <changed-files>
npm run lint
npm run typecheck
npm test
```

## Definition of Done für eine migrierte Oberfläche

- Verwendet ausschließlich semantische Theme-Rollen.
- Alle sichtbaren app-eigenen Texte sind in Englisch und Deutsch vorhanden.
- Lade-, Leer-, Fehler- und Retry-Zustände sind gestaltet.
- Touch-, pressed-, selected-, disabled- und gegebenenfalls TV-focus-Zustände sind definiert.
- Screen Reader Labels und sinnvolle Fokusreihenfolge sind vorhanden.
- Kleine und große Displays sowie Landscape wurden geprüft.
- Phone-, TV- und Watch-Grenzen wurden berücksichtigt.
- Prettier, ESLint, TypeScript und relevante Tests sind grün.
- Neue oder bearbeitete Quellcode-Kommentare sind auf Englisch.
- Keine generierten Dateien, Secrets oder lokalen Entwicklungsartefakte sind enthalten.

## Bewusst nicht Teil des ersten Umbaus

- exakte Kopie der YouTube-App oder ihrer Animationen
- Übernahme von YouTube-Logos als ReactTube-Branding
- vollständiger Light Mode vor Abschluss des konsistenten Dark Modes
- neue Empfehlungs-, Kommentar- oder Upload-Funktionen ohne vorhandene Datenbasis
- grundlegender Austausch der Playback- oder Download-Engine
- eigener Shorts-Tab ohne validierten Nutzen und stabilen Reel-Feed

## Offizielle Referenzen

- [YouTube: Features und UI-Updates 2024](https://blog.youtube/news-and-events/youtube-features-and-updates-2024/)
- [YouTube: TV-Erlebnis mit Video im Mittelpunkt](https://blog.youtube/news-and-events/designing-a-richer-youtube-experience-for-your-tvs/)
- [YouTube: moderneres Watch-Erlebnis und Ambient Mode](https://blog.youtube/news-and-events/an-updated-look-and-feel-for-youtube/)
- [YouTube Help: Navigation in der Android-App](https://support.google.com/youtube/answer/2398242?co=GENIE.Platform%3DAndroid&hl=en)
- [YouTube API Services Branding Guidelines](https://developers.google.com/youtube/terms/branding-guidelines)

Diese Referenzen begründen die Richtung – inhaltszentrierte Feeds, kompakte
Aktionsflächen, Bottom Navigation auf Phone und videoerhaltende Panels auf TV –
ohne ReactTube visuell oder markenrechtlich zu einer Kopie zu machen.
