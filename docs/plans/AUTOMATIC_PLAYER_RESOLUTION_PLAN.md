# Plan: Automatischer Player-Auflösungstyp

## Ziel

Ein zusätzlicher Auflösungstyp **Automatisch** versucht nacheinander geeignete
Wiedergabewege, bis die Wiedergabe funktioniert. Auch Fehler bei der
Quellenauflösung und Vorbereitung müssen zum nächsten Versuch führen. Ein
erfolgreicher API-Aufruf oder eine vorhandene URL reicht als Erfolgskriterium
nicht aus.

Die Auswahl soll in den App-Einstellungen und direkt im Einstellungsmenü des
nativen Overlay-Players auf Phone, Tablet und TV verfügbar sein.

## Aktueller Stand

- [x] Gemeinsame Definition der vorhandenen Auflösungstypen in
      [`PlayerResolution.ts`](../../src/utils/PlayerResolution.ts).
- [x] Auswahl der vorhandenen Typen im Einstellungsmenü des nativen
      Overlay-Players auf Phone/Tablet und TV.
- [x] Dauerhafte Speicherung über die bestehenden App-Einstellungen.
- [x] Gemeinsame deutsche und englische Bezeichnungen für alle Auswahlmenüs.
- [x] Übernahme der Wiedergabeposition beim Quellenwechsel, einschließlich
      Regressionstests für Startmarken und Videowechsel.
- [ ] Prüfung des Overlay-Menüs und des Quellenwechsels auf Geräten.
- [x] Neuer Auflösungstyp `auto` und automatische Versuchskette.

Die manuelle Quellenreihenfolge in
[`PlaybackLadder.ts`](../../src/utils/PlaybackLadder.ts) bleibt bestehen. Die Automatik
verwendet eine eigene
[`AutomaticPlaybackSession`](../../src/utils/AutomaticPlayback.ts), die auch fehlende
Quellen vorbereitet. Der
[`AutomaticVideoSource`](../../src/utils/AutomaticVideoSource.ts)-Adapter hält
passende Player-Antworten pro Kette vor und erzeugt die nächste Quelle erst bei
Bedarf. Beide Wege sind in
[`useVideoDetails.ts`](../../src/hooks/useVideoDetails.ts) eingebunden.

Die bisherige Einschränkung, dass nur bereits vorhandene URLs gewechselt werden
konnten, gilt damit weiterhin für den manuellen Fallback, aber nicht für `auto`.
Lokales HLS mit und ohne AV1 besitzt in der Automatik getrennte Versuchskennungen.

### Festgelegtes Laufzeitverhalten

- Quellenauflösung und Vorbereitung: maximal 20 Sekunden je Typ.
- Start und spätere Stillstände: 20 Sekunden ohne Wiedergabefortschritt.
- Gesamtbudget: 120 Sekunden aktive Vorbereitungs- und Startzeit pro
  Wiederherstellung. Erfolgreiche Wiedergabe setzt das Budget für einen späteren
  Fehler zurück; bereits versuchte Typen bleiben verbraucht.
- Pausen, Hintergrundzustand und noch nicht gemountete Player verbrauchen keine
  Startzeit. Suchvorgänge erhalten eine neue Fortschrittsfrist.
- Ein expliziter erneuter Versuch, ein Einstellungswechsel und die Erneuerung
  ablaufender URLs erzeugen eine frische Kette. Nur ein Videowechsel verwirft die
  aktuelle Position.
- Am regulären Videoende stoppt die Fortschrittsüberwachung. Die aktuelle Quelle
  bleibt für Replay und wiederholte Shorts nutzbar und wird beim Quellen- oder
  Videowechsel beziehungsweise beim Verlassen des Players freigegeben.
- Der Fork bietet für die Player-Auflösung noch kein Fetch-Abbruchsignal an.
  Abgebrochene Versuche liefern keine Ergebnisse mehr an die UI und starten nach
  Rückkehr der laufenden Anfrage keine weiteren Clients. SABR-Requests werden
  direkt per `AbortController` abgebrochen; verspätete Manifest-Ergebnisse werden
  verworfen beziehungsweise bereinigt.

### Native Fähigkeiten und Build

Auf Apple-Plattformen prüft das Medienserver-Modul AV1 zur Laufzeit über
[`VTIsHardwareDecodeSupported`](<https://developer.apple.com/documentation/videotoolbox/vtishardwaredecodesupported(_:)>)
mit dem AV1-Codec. Auf Android wird die Codec-Abfrage von `react-native-video`
verwendet. Fehlende oder nicht rechtzeitig verfügbare Ergebnisse gelten als
unbekannt; die AV1-Stufe wird dann übersprungen.

Für die neue Apple-Codec-Abfrage und die gezielte Entfernung von
SABR-Registrierungen ist ein neuer nativer iOS-/tvOS-Build erforderlich. Ältere
Builds bleiben nutzbar: Sie überspringen die unbekannte AV1-Stufe und räumen den
lokalen Server spätestens nach dem letzten aktiven SABR-Stream auf. Ein fehlendes
Medienserver-Modul verhindert den App-Start auf Android nicht mehr.

## 1. Einstellung und Kompatibilität

- [x] `AppSettings` um `playerResolutionType` erweitern:
      `auto`, `hlsLocal`, `hlsLocalAv1`, `hls`, `http`, `sabr`.
- [x] Eine zentrale Funktion für die tatsächlich gewählte Einstellung verwenden.
      Ist das neue Feld vorhanden, hat es Vorrang. Andernfalls wird die Auswahl
      aus `hlsEnabled`, `localHlsEnabled`, `av1Enabled` und `sabrEnabled` abgeleitet.
- [x] Die bisherige Priorität bei vorhandenen Boolean-Einstellungen erhalten:
      SABR, lokales HLS mit/ohne AV1, Progressiv beziehungsweise YouTube-HLS.
- [x] Alle Schreibzugriffe auf diese Einstellungen prüfen und angleichen, damit
      neue und bisherige Felder keine widersprüchlichen Auswahlen erzeugen.
- [x] Bestehende Nutzerauswahlen und den bisherigen Standard beibehalten.
      Automatisch zunächst als zusätzliche Option anbieten.

Die persistierte Auswahl bleibt `auto`, auch wenn tatsächlich beispielsweise
YouTube-HLS spielt. Die aktive Quelle ist ein eigener Wiedergabezustand.
`PlaybackMode` kann weiterhin den konkreten Auflösungsweg beschreiben; die
Entscheidung über die automatische Reihenfolge liegt darüber.

## 2. Reihenfolge und geeignete Versuche

Vorgeschlagene Reihenfolge mit Fokus auf zuverlässigen Wiedergabestart:

| Stufe | Auflösungstyp       | Voraussetzung                                       |
| ----- | ------------------- | --------------------------------------------------- |
| 1     | YouTube-HLS         | Nutzbares YouTube-HLS-Manifest                      |
| 2     | Lokales HLS         | Geeignete adaptive Formate und Manifestgenerierung  |
| 3     | Lokales HLS mit AV1 | Zusätzlich bestätigte AV1-Unterstützung des Geräts  |
| 4     | SABR                | Unterstützte Plattform und verfügbare SABR-Eingaben |
| 5     | Progressiv          | Geeignete direkte Stream-URL                        |

- [x] Die Reihenfolge zentral definieren und testen.
- [x] Geräte- und Plattformfähigkeiten vor einem Versuch prüfen. Bei unbekannter
      AV1-Unterstützung den AV1-Versuch überspringen.
- [x] Nicht verfügbare Typen ohne Wartezeit auf den Player überspringen.
- [x] Lokales HLS mit und ohne AV1 über eigene Versuchskennungen unterscheiden.
- [x] Doppelte identische Quellen vermeiden, ohne unterschiedliche
      Codec-Konfigurationen versehentlich zusammenzufassen.

Progressiv bleibt wegen möglicher früher Abbrüche die letzte Option. SABR wird
wegen seines experimentellen Status erst nach den HLS-Varianten versucht. Die
Reihenfolge ist eine anfängliche Produktentscheidung und lässt sich zentral
anpassen.

Manuell ausgewählte Typen behalten ihre bisherige Priorität. Die neue
Automatik verändert die bestehenden manuellen Fallback-Regeln nicht beiläufig.

## 3. Quellen bei Bedarf vorbereiten

- [x] Die Versuchsteuerung aus `useVideoDetails` in einen eigenen Hook und
      testbare Hilfsfunktionen auslagern.
- [x] Jeden Versuch vollständig abbilden:
      **Client auflösen → Quelle vorbereiten → Wiedergabe starten → bewerten**.
- [x] Bestehende Client-Ketten aus
      [`PlaybackSource.ts`](../../src/utils/PlaybackSource.ts) und
      [`PlaybackResolver.ts`](../../src/utils/PlaybackResolver.ts) wiederverwenden.
- [x] Bereits passende Streaming-Daten wiederverwenden. Falls ein Typ andere
      Daten benötigt, diese über das passende Client-Profil nachladen.
- [x] Aufwendige Vorbereitungen wie Manifestgenerierung und SABR-Start erst
      durchführen, wenn die jeweilige Stufe erreicht ist.
- [x] Fehlende Streams, verworfene Quellen und Vorbereitungsfehler als
      abgeschlossenen Versuch behandeln und zur nächsten Stufe wechseln.
- [x] Metadaten und Empfehlungen beim Wechsel weiterverwenden, soweit sie
      unabhängig von der Streaming-Quelle sind.

## 4. Erfolg, Fehler und Zeitlimits

- [x] Erfolg anhand tatsächlichen Wiedergabefortschritts erkennen. `onLoad`
      allein beendet die Startüberwachung nicht.
- [x] Bei Playerfehlern unmittelbar den nächsten geeigneten Typ versuchen.
- [x] Die vorhandenen Start-Watchdogs vereinheitlichen. Die Frist
      beträgt 20 Sekunden und muss auf Geräten geprüft werden.
- [x] Quellenauflösung und Vorbereitung ebenfalls zeitlich begrenzen, damit
      ein hängender Request die Kette nicht dauerhaft blockiert.
- [x] Ein zusätzliches Gesamtbudget für die Versuchskette festlegen und testen.
      Der Ausgangswert beträgt 120 Sekunden; die Abstimmung auf Geräten steht aus.
- [x] Längere Stillstände nach erfolgreichem Start erkennen. Pausen,
      Hintergrundzustand, Suchvorgänge und reguläres Videoende berücksichtigen.
- [x] Nach Ausschöpfen der Versuche oder des Gesamtbudgets einen lokalisierten
      Fehler mit der Aktion „Erneut versuchen“ anzeigen.

Authentifizierungs- und Zugriffsfehler getrennt behandeln: Der bestehende
angemeldete Pfad für private beziehungsweise altersbeschränkte Videos muss
erhalten bleiben. Eindeutige Zugriffssperren dürfen keine endlose Folge
ungeeigneter anonymer Versuche auslösen.

## 5. Zustandswechsel und Ressourcen

- [x] Zustände für Vorbereitung, Start, Wiedergabe, Wechsel und endgültiges
      Scheitern explizit abbilden.
- [x] Jeden Auflösungstyp mit derselben Konfiguration pro Wiedergabeversuch
      höchstens einmal versuchen. Interne Client-Fallbacks bleiben möglich.
- [x] Fehler und asynchrone Ergebnisse einer Video- und Versuchskennung zuordnen.
      Meldungen bereits ersetzter Versuche ignorieren.
- [x] Doppelte Playerfehler beziehungsweise gleichzeitige Fehler- und
      Timeout-Ereignisse dürfen nur einen Wechsel auslösen.
- [x] Beim Wechsel die aktuelle Position übernehmen. Beim Videowechsel die
      Position und die Liste fehlgeschlagener Versuche zurücksetzen.
- [x] Eine aktualisierte Quellenliste darf nicht automatisch zu einer bereits
      gescheiterten Stufe zurückspringen.
- [x] Fortschrittstimer am Videoende stoppen. Requests, SABR-Verbindungen und
      lokale Serverregistrierungen beim Wechsel beziehungsweise Verlassen des
      Players bereinigen; die aktuelle Quelle bleibt bis dahin wiederholbar.
- [x] Einen expliziten Neustart und die Erneuerung ablaufender URLs von einem
      normalen Fallback unterscheiden und deren Verhalten festlegen.

## 6. Einstellungen und Oberflächen

- [x] „Automatisch“ beziehungsweise „Automatic“ mit einem gemeinsamen
      Übersetzungsschlüssel in den englischen und deutschen Ressourcen ergänzen.
- [x] Den neuen Typ in die gemeinsame Definition der Auflösungstypen aufnehmen.
      App-Einstellungen und beide Overlay-Menüs sollen dieselbe Auswahl anbieten.
- [x] Im Menü die gespeicherte Auswahl markieren. Die tatsächliche aktive
      Quelle separat in den Playback-Diagnosen ausweisen.
- [x] Versuchsnummer, Auflösungstyp, Client und Fehlergrund für die Diagnose
      erfassen, ohne Zugangsdaten oder vollständige signierte URLs auszugeben.
- [x] Phone, Tablet, TV und die auf `useVideoDetails` aufbauenden Shorts prüfen.
- [x] Touch-Bedienung, TV-Fokus und Zurück-Navigation erhalten.

VLC behält seine eigene Quellenreihenfolge. Der neue Eintrag ist im
VLC-Overlay ausgeblendet, solange die Auflösungstypen dort nicht entsprechend
unterstützt werden. Die native Watch-Wiedergabe erhält durch diese Änderung
keine eigene automatische Versuchskette.

## 7. Tests und Abnahme

- [x] Auswahl und Migration: bestehende Einstellungen, leere Einstellungen,
      neuer `auto`-Wert und Wechsel zwischen manuellen Typen und Automatik.
- [x] Reihenfolge: fehlende Quellen, unbekannte Codec-Fähigkeiten,
      nicht unterstützte Plattformen und unterschiedliche AV1-Konfigurationen.
- [x] Auflösung: Wiederverwendung passender Daten sowie Nachladen für eine
      spätere Stufe mit anderem Client-Profil.
- [x] Fehler: Clientfehler, Manifestfehler, SABR-Startfehler, Playerfehler,
      Start-Timeout und Stillstand nach erfolgreichem Start.
- [x] Zustände: doppelte Meldungen, verspätete Ergebnisse, Positionsübernahme,
      Videowechsel, Nutzerwechsel der Einstellung und Ressourcenbereinigung.
- [x] Abschluss: genau eine endgültige Fehlermeldung nach dem letzten Versuch;
      ein expliziter erneuter Versuch startet eine frische Kette.
- [x] Authentifizierte Videos weiterhin über den passenden Pfad abspielen.
- [ ] Gerätetests auf iOS, Android, tvOS und Android TV durchführen, einschließlich
      Geräten ohne AV1-Unterstützung.

Für die Implementierung die Qualitätsprüfungen aus `AGENTS.md` ausführen:

```sh
npx prettier --write <changed-files>
npx prettier --check <changed-files>
npm run lint
npm run typecheck
npm run typecheck:platforms
npm test
```

## Abnahmekriterien

Automatisch ist fertig, wenn ein fehlgeschlagener Wiedergabeweg ohne manuellen
Eingriff durch den nächsten geeigneten ersetzt wird, die Position erhalten
bleibt und nach Ausschöpfen der Kette ein bedienbarer Fehlerzustand erscheint.
Die Auswahl muss dauerhaft und in allen vorgesehenen Menüs konsistent sein.
Bestehende manuelle Auswahlen, VLC und authentifizierte Wiedergabe müssen ihr
definiertes Verhalten behalten.

## Bisherige Validierung

- Tests für Versuchskette, Wiederverwendung von Streaming-Daten, authentifizierte
  Antworten, Abbruch, Ressourcenbereinigung und Fortschrittsüberwachung.
- Vollständige JavaScript-/TypeScript-Testsuite: 490 Tests erfolgreich. Typechecks einschließlich
  iOS, Android, tvOS und Android TV.
- Swift-Probe unter `test/native/automatic-playback-probe.swift`: Das Entfernen
  eines SABR-Präfixes entfernt dessen Manifest- und Segmentrouten, während ein
  zweiter Stream auf demselben Server erreichbar bleibt.
- Swift-Syntaxprüfung der Expo-Brücke. Ein vollständiger nativer App-Build und
  Wiedergabetests auf den Zielgeräten stehen aus.
- Der projektweite ESLint-Lauf scheitert weiterhin an vorhandenen Dateien unter
  `vendor/bundle/`, zum Beispiel `Strings must use doublequote` in `aliki.js`.
  Die geänderten TypeScript-/JavaScript-Dateien sind separat ohne Warnungen geprüft.

Die Swift-Probe lässt sich ohne YouTube-Zugriff ausführen:

```sh
xcrun swiftc -module-cache-path /private/tmp/reacttube-swift-module-cache \
  -o /private/tmp/reacttube-automatic-playback-probe \
  test/native/automatic-playback-probe.swift \
  modules/media-server/ios/LocalMediaServer.swift
/private/tmp/reacttube-automatic-playback-probe
```

Ein zusätzlicher UI-Test mit Maestro im gestarteten iPhone-Simulator wurde
abgebrochen, weil der Treiberstart nicht abgeschlossen wurde. Daraus wird kein
bestandener Wiedergabetest abgeleitet.
