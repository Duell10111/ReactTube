# Plan: Migration auf das originale Expo Apple Targets

> Stand: 2026-10-22 · Status: implementiert und automatisiert geprüft; Geräteabnahme siehe Abschnitt 7.
> Ausgangspunkt: `@duell10111/apple-targets@0.0.6-alpha.1`.
> Geprüftes Ziel: `@bacons/apple-targets@5.0.0`, Upstream-Commit
> `8aa4c95d2bee7117c7dae93f20e3e7c50ea5f8b9`.

## 1. Ziel und Entscheidung

ReactTube verwendet das veröffentlichte Originalpaket. Die weiterhin benötigten
Fork-Funktionen werden durch lokale Config-Plugins bereitgestellt:

- Swift Package Manager bindet `SwiftAudioEx` an das Watch-Target an.
- Bei tvOS-Builds werden Watch- und Siri-Targets vollständig übersprungen.

Bundle-IDs, App Groups, Watch-Companion-Zuordnung und bestehende Build-Schalter
bleiben stabil. Der Wechsel benötigt keine Änderungen an der Wiedergabe- oder
Synchronisationslogik und keine neuen UI-Texte.

Die Migration gilt erst nach erfolgreichen nativen Builds und Funktionstests als
abgeschlossen. Bis dahin bleibt der Fork die Referenz für das bisherige Verhalten.

## 2. Gesicherter Befund und offene Prüfungen

Die Vorprüfung verglich Fork-Commits, installierten Plugin-Code sowie das
veröffentlichte Originalpaket. Zusätzlich wurde die Target-Erzeugung isoliert mit
den ReactTube-Konfigurationen und Expo 57 ausgeführt.

| Thema               | Ergebnis                                                                                                                                   | Konsequenz                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `swiftDependencies` | Das Original reicht die Option nicht an die Xcode-Erzeugung weiter. Ein frisch erzeugtes Prüfprojekt enthält keine Swift-Package-Referenz. | Lokales SPM-Plugin ist erforderlich.                                        |
| TV-Ausschluss       | Das Original registriert auch bei `EXPO_TV=1` und `isTV: true` die Target-Mods.                                                            | Wrapper muss vor dem Originalaufruf abbrechen.                              |
| Watch-Bundle-ID     | Bleibt im geprüften Fall `.watch`; das bisherige Feld `bundleId` ist jedoch keine unterstützte Originaloption.                             | Explizit `bundleIdentifier` verwenden.                                      |
| Siri-Bundle-ID      | Wird ohne Anpassung `.intent` statt `.siriIntents`.                                                                                        | Bisherige ID explizit festlegen.                                            |
| Watch-Produktname   | Intern wird aus `RT-Watch` der Produktname `RTWatch`; der Target-Name bleibt im Test `RT-Watch`.                                           | Target-Erkennung, Schemes und Produktpfade prüfen.                          |
| Mindestversionen    | Die expliziten Werte `10.0` für watchOS und `16.4` für Siri werden übernommen.                                                             | Werte beibehalten und native Kompilierung prüfen.                           |
| Paketeinstieg       | Der Haupteinstieg exportiert inzwischen `ExtensionStorage`.                                                                                | Plugin und JSDoc-Typen über `@bacons/apple-targets/app.plugin` importieren. |

Noch offen sind vollständige Prebuilds mit CocoaPods, inkrementelle Prebuilds,
native Builds, Signierung und Gerätetests. Das Original bringt zusätzlich das
native Expo-Modul `ExtensionStorage` mit. Dessen Autolinking und Verträglichkeit
mit tvOS müssen separat geprüft werden; ein TV-Abbruch im Config-Plugin allein
verhindert keine automatische native Modulverknüpfung.

Referenzen:

- [Originalpaket auf npm](https://www.npmjs.com/package/@bacons/apple-targets)
- [Geprüfter Upstream-Stand](https://github.com/EvanBacon/expo-apple-targets/tree/8aa4c95d2bee7117c7dae93f20e3e7c50ea5f8b9/packages/apple-targets)
- [Fork mit TV-Ausschluss und SPM-Erweiterung](https://github.com/Duell10111/expo-apple-targets/tree/add-spm-disable-tvos)
- [SPM-PR des Fork-Autors](https://github.com/EvanBacon/expo-apple-targets/pull/44)
- [Weiterer SPM-Ansatz im Originalprojekt](https://github.com/EvanBacon/expo-apple-targets/pull/177)

## 3. Vorgesehene Dateien

| Datei                                                           | Änderung                                                                                                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `package.json`, `package-lock.json`                             | Fork durch exakt gepinntes Original ersetzen; notwendige direkte Abhängigkeiten ausdrücklich deklarieren.        |
| `plugins/ios/withAppleTargets.js`                               | Original-Plugin importieren, TV-Ausschluss ausführen, Siri-Filter erhalten und SPM-Mod registrieren.             |
| `plugins/ios/withAppleTargetSwiftPackages.js`                   | Neu: gezielte, wiederholbar ausführbare SPM-Verknüpfung für konfigurierte Targets.                               |
| `plugins/ios/siriBuildConfig.js`                                | Bestehende TV-Erkennung gemeinsam verwenden; nur bei tatsächlich nötiger Anpassung ändern.                       |
| `targets/watch/expo-target.config.js`                           | Originaltypen und explizite Bundle-ID; SPM-Daten über den lokalen Adapter auswerten.                             |
| `targets/siri-intents/expo-target.config.js`                    | Originaltypen und explizite bisherige Bundle-ID; Kommentar zur ID-Ableitung aktualisieren.                       |
| `plugins/ios/withSiri.js`                                       | Fork-Verweise in Kommentaren aktualisieren; Zusammenspiel der Xcode-Mods prüfen.                                 |
| `scripts/verify-apple-build.js`                                 | Bestehende Projekt-/IPA-Prüfung um SPM-, Target- und Deployment-Invarianten ergänzen.                            |
| `test/apple-targets-config-plugin.test.mjs`                     | Neu: Wrapper und echte Integration der beiden Config-Plugins prüfen.                                             |
| `test/apple-build.test.mjs`, `test/siri-config-plugin.test.mjs` | Bestehende Build- und Siri-Regressionstests erweitern.                                                           |
| Build-/Autolinking-Konfiguration                                | Nur falls erforderlich: `ExtensionStorage` für nicht unterstützte Plattformen vom Expo-Autolinking ausschließen. |

## 4. Umsetzung in Phasen

### Phase 0: Referenz sichern und technische Integration prüfen

- [x] Umsetzung in einem isolierten Checkout durchführen; bestehende lokale
      Änderungen und native Entwicklungsdateien erhalten.
- [x] Die tatsächlich zu migrierende Originalversion erneut prüfen. Für den
      geprüften Stand zunächst exakt `5.0.0` verwenden.
- [x] Mit dem Fork Referenzprojekte für iOS mit Siri, iOS ohne Siri und tvOS
      erzeugen. IDs, Targets, Package-Referenzen, Entitlements und Schemes erfassen.
- [x] Referenzprüfung über `scripts/verify-apple-build.js` ausführen und vorhandene
      Fehler getrennt dokumentieren.
- [x] SPM-Anbindung im selben `@bacons/xcode`-Mod wie die Originaltargets
      prototypisch prüfen. Das Original nutzt den Custom-Mod `xcodeProjectBeta2`.
- [x] Registrierung und Ausführung testen: Die SPM-Aktion muss nach der
      Target-Erzeugung laufen, ihr Mod aber vor dem abschließenden Base-Provider
      registriert werden. Der Adapter registriert deshalb zuerst seine Aktion
      und ruft anschließend das Original-Plugin auf; die konkrete Reihenfolge
      wird mit dem installierten Expo geprüft.
- [x] Den Zugriff auf interne Original-Helfer und die passende Xcode-Bibliothek
      im Adapter kapseln. Dieselbe Bibliotheksinstanz wie das Original verwenden;
      mehrere aufgelöste Versionen und `instanceof`-Konflikte vermeiden.
- [x] Das mitgelieferte native Modul auf iOS und tvOS beim Autolinking und bei
      CocoaPods prüfen. Falls nötig einen Expo-Autolinking-Ausschluss planen;
      `react-native.config.js` allein ist dafür kein Nachweis.

**Ergebnis:** Ein geprüfter Integrationsweg, bevor die Projektabhängigkeit
umgestellt wird. Änderungen am erzeugten Xcode-Projekt erfolgen durch Plugins.

### Phase 1: Wrapper und lokale SPM-Anbindung implementieren

- [x] Den Plugin-Import auf `@bacons/apple-targets/app.plugin` umstellen.
- [x] Bei `options.isTV === true` oder einer TV-Erkennung durch `isTVBuild(config)`
      die Konfiguration unverändert zurückgeben. Das geschieht vor Originalaufruf
      und SPM-Registrierung. Bestehende `EXPO_TV`-Semantik erhalten.
- [x] Den Siri-Filter erhalten: iOS mit Siri lädt beide Targets, iOS ohne Siri
      weiterhin nur das Watch-Target.
- [x] Die bestehende `swiftDependencies`-Liste als lokal ausgewertete Erweiterung
      der Target-Konfiguration behalten und deren Eigentümerschaft klar typisieren
      beziehungsweise dokumentieren. Das Original wertet diese Liste nicht aus.
- [x] Das SPM-Plugin auf die für diesen Build ausgewählten Targets begrenzen.
      Das Zieltarget über stabile Merkmale wie Bundle-ID und Plattform bestimmen,
      nicht ausschließlich über den nun veränderten internen Produktnamen.
- [x] Für `SwiftAudioEx` dieselbe Repository-URL und den Branch
      `watchos-support-add-crop` verwenden.
- [x] Alle drei Verknüpfungen erzeugen oder wiederverwenden: projektweite
      `XCRemoteSwiftPackageReference`, targetbezogene
      `XCSwiftPackageProductDependency` und `PBXBuildFile` mit `productRef` in der
      Frameworks-Buildphase des Watch-Targets.
- [x] Wiederholte Ausführung darf keine doppelten Package-Referenzen, Produkte oder
      Frameworks-Einträge erzeugen. Fremde Packages und Target-Einstellungen erhalten.
- [x] Fehlende oder mehrdeutige Zieltargets sowie ungültige Package-Konfigurationen
      mit verständlichen englischen Entwicklerdiagnosen ablehnen.

**Ergebnis:** Die zwei benötigten Fork-Funktionen liegen als lokale, getestete
Integration vor. Ein späterer Ersatz durch eine Originalfunktion bleibt möglich.

### Phase 2: Abhängigkeit und Target-Konfigurationen wechseln

- [x] `@duell10111/apple-targets` durch `@bacons/apple-targets: "5.0.0"` ersetzen.
      Installation und Lockfile mit `npm install --legacy-peer-deps` aktualisieren.
- [x] Tatsächlich benötigte zusätzliche Laufzeitabhängigkeiten des Plugins auf
      explizite Deklaration prüfen; zufällig gehoistete Pakete vermeiden.
- [x] JSDoc-Imports beider Targets auf den Original-Plugin-Einstieg umstellen.
- [x] Watch auf `bundleIdentifier: ".watch"` umstellen und das unwirksame
      Feld `bundleId` entfernen.
- [x] Siri explizit `bundleIdentifier: ".siriIntents"` geben.
- [x] Team-ID, App Group, benutzerdefinierte Info.plists, Icons, Privacy Manifest
      und Watch-Entitlements erhalten. Generierte Entitlements-Pfade des Originals
      in die Prüfung einbeziehen.
- [x] `deploymentTarget: "10.0"` beziehungsweise `"16.4"` erhalten. Display-Namen,
      tatsächlich erzeugte Scheme-Namen und Watch-Produktpfade kontrollieren.
- [x] Fork-Verweise in direkt betroffenen aktiven Konfigurationen und Kommentaren
      aktualisieren. Historische Befunddokumente bleiben als solche erkennbar.

### Phase 3: Automatisierte Regressionstests ergänzen

- [x] Wrapper mit beiden TV-Schaltern, `EXPO_TV` und wechselnder Plugin-Reihenfolge
      prüfen. TV darf weder Apple-Target- noch SPM-Mods registrieren.
- [x] Siri ein/aus prüfen: Watch bleibt auf iOS erhalten; Siri folgt dem Schalter.
- [x] Frisches Prüfprojekt durch Original und lokalen Adapter laufen lassen.
      Die erzeugten Projektobjekte prüfen, nicht nur Konfigurationstexte suchen.
- [x] Exakte Bundle-IDs, Companion-ID, Mindestversionen und App Groups absichern.
- [x] Package-URL, Branch, Produktzuordnung und tatsächlichen Eintrag in der
      Frameworks-Buildphase prüfen. Eine Package-Referenz allein genügt nicht.
- [x] Denselben Adapter erneut ausführen, Projekt serialisieren und erneut parsen;
      keine Duplikate und keine verlorenen fremden Verknüpfungen zulassen.
- [x] Die gesamte Plugin-Pipeline einschließlich Provider-Reihenfolge und
      Zusammenspiel mit `withSiri` in einem temporären Projekt prüfen.
- [x] `scripts/verify-apple-build.js` und seine Tests so erweitern, dass auch die
      bereits vorhandene CI diese Invarianten kontrolliert.

### Phase 4: Native Build-Matrix und Funktion prüfen

Jede Variante erhält einen eigenen sauberen Prebuild und eigene Build-Ausgaben.
Die bestehenden Skripte zur Konfiguration und Verifikation bleiben der Einstieg.

| Variante             | Erwartete zusätzliche Targets | Erforderliche Prüfung                                                                  |
| -------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| iOS/iPadOS, Siri an  | Watch und Siri                | Prebuild, CocoaPods, Release-Archiv, Projekt-/IPA-Prüfung, Siri-Funktion               |
| iOS/iPadOS, Siri aus | Watch                         | Prebuild, CocoaPods, Release-Archiv, Projekt-/IPA-Prüfung                              |
| tvOS                 | Keine Watch-/Siri-Targets     | Prebuild, CocoaPods, Release-Archiv, Projekt-/IPA-Prüfung, App-Start und Fernbedienung |
| Watch                | Watch-Companion               | Simulator-Build, Einbettung ins iOS-Archiv, Start und Audio auf echter Watch           |
| Android/Android TV   | Keine Apple-Targets           | Expo-Konfigurationsprüfung und bestehender Android-Build-Smoke-Test                    |

- [x] Pro Apple-Variante zusätzlich einen inkrementellen Prebuild prüfen und
      Targets, Verknüpfungen sowie erzeugte Dateigruppen auf Duplikate kontrollieren.
      Für Variantenwechsel weiterhin den bestehenden Clean-Prebuild verwenden.
- [x] Swift-Package-Auflösung auf einem frischen Build-Verzeichnis ausführen;
      vorhandene Xcode-Caches dürfen eine fehlende Plugin-Verknüpfung nicht verdecken.
- [x] Native Ausgabe des Originals auf veränderte Source-/Resource-Mitgliedschaft
      prüfen, insbesondere Watch-Unterordner, Assets und Privacy Manifest.
- [ ] Auf Geräten Watch-Start, Download-Wiedergabe, Hintergrund-Audio, Now Playing
      und iPhone-/Watch-Synchronisation testen. Siri-Suche und Wiedergabe in der
      aktivierten iOS-Variante prüfen.
- [ ] Signierte iOS-/Watch-Ausgabe auf bisherige App-IDs, Team, Provisioning und
      Entitlements prüfen; vorhandenen Verifier mit `--signed` verwenden.
      Erfolgreiche unsigned Archive ersetzen diese Prüfung nicht.

### Phase 5: Qualitätsprüfungen und Abschluss

- [x] Alle geänderten unterstützten Dateien mit Prettier formatieren und prüfen.
- [x] Die folgenden Projektprüfungen erfolgreich ausführen:

```sh
npm run lint
npm run typecheck
npm run typecheck:platforms
npm test
```

- [x] Die vorhandenen CI-Aktionen `prebuild` und `apple-archive` verwenden;
      notwendige zusätzliche Prüfungen dort integrieren statt einen zweiten
      unabhängigen Build-Weg einzuführen.
- [x] Diff und Lockfile auf unbeabsichtigte Abhängigkeitsänderungen prüfen.
      Alle hinzugefügten oder geänderten Quellcode-Kommentare sind Englisch.
- [x] Build-Ergebnisse, Gerätetests und verbleibende externe Blocker dokumentieren.
      Generierte Projekte, lokale IDE-Dateien und Signierungsdaten nicht aufnehmen.

## 5. Abnahmekriterien

Die Migration ist abgeschlossen, wenn alle folgenden Punkte erfüllt sind:

- [x] Installation aus dem Lockfile benötigt den Apple-Targets-Fork nicht mehr.
- [x] Ein sauberer Prebuild erzeugt ein baubares Watch-Target einschließlich
      `SwiftAudioEx`, ohne manuelle Xcode-Nacharbeit.
- [x] Ein weiterer Prebuild erzeugt keine doppelten Targets oder SPM-Verknüpfungen.
- [x] Alle Bundle-IDs, die Companion-Zuordnung und App Groups entsprechen der Referenz.
- [x] Siri an/aus und TV funktionieren mit den bestehenden Build-Schaltern und CI.
- [ ] iOS-, Watch- und tvOS-Builds sowie die Geräteprüfungen aus Phase 4 bestehen.
- [x] Formatierung, Lint, TypeScript, Plattformprüfung und Tests bestehen;
      nachweislich vorher bestehende Fehler sind getrennt ausgewiesen.

## 6. Rückweg und Umsetzungseinheiten

Die Migration als zusammengehörige Änderung auf einem eigenen Branch umsetzen.
Sinnvolle Einheiten sind Referenz-/Regressionstests, lokaler Adapter samt
Paketwechsel und anschließend native Verifikation/Dokumentation. Zwischenstände
werden erst nach Erfüllung der Abnahmekriterien zusammengeführt.

Bei einer Regression die migrationsbezogenen Änderungen gemeinsam zurücknehmen:
Paket und Lockfile auf den Fork zurücksetzen, Wrapper und Target-Konfigurationen
wiederherstellen und die Referenz-Build-Matrix erneut ausführen. Ein bloßer
Paket-Downgrade reicht wegen der geänderten Plugin-Einstiege und Config-Felder nicht.
Native Projekte anschließend aus der zurückgesetzten Konfiguration neu erzeugen.

Die bestehenden SwiftAudioEx-Quellen und App-IDs bleiben während der Migration
erhalten. Dadurch benötigt der Rückweg keine Migration von Nutzerdaten.

## 7. Umsetzung und Wartung

Die Migration liegt auf einem eigenen Branch von `main`. Der vorhandene
Watch-Stability-Branch und lokale Änderungen im ursprünglichen Checkout bleiben
unverändert. Auf `main` benötigt die Watch neben `SwiftAudioEx` weiterhin
`SDDownloadManager`; der Adapter übernimmt beide Einträge aus der jeweiligen
Target-Konfiguration. Wenn der Watch-Stability-Branch den zweiten Eintrag
entfernt, muss der Adapter dafür nicht angepasst werden.

`ExtensionStorage` wird nicht verwendet und ist deshalb über
`expo.autolinking.exclude` vollständig ausgeschlossen. Die Paketinstallation dient
hier der Target-Erzeugung. Ein späterer Einsatz des nativen Speichermoduls benötigt
eine bewusste Anpassung dieses Ausschlusses und eigene Plattformtests.

Die bisher eingecheckte `targets/siri-intents/generated.entitlements` entfällt.
Das Original schreibt die aus der Siri-Konfiguration erzeugten Entitlements unter
`ios/`; die App Group bleibt dieselbe. Die handgeschriebene Watch-Entitlements-Datei
bleibt erhalten.

### Erforderlicher Upstream-Patch

`patches/@bacons+apple-targets+5.0.0.patch` behebt die erneute Aktualisierung eines
vorhandenen Targets. Das Original löscht die bisherige Konfigurationsliste,
entfernt dabei ihre Target-Referenz und greift anschließend erneut über das Target
auf die gelöschte Referenz zu. Außerdem muss die neue Liste erstellt werden,
solange alle Targets noch für die Suche nach dem Haupttarget lesbar sind.

Der Patch erstellt und verknüpft die Ersatzliste zuerst. Anschließend entfernt er
die vorherigen Konfigurationen über eine Kopie der Liste und räumt die alte Liste
auf. Die Integrationstests führen die gesamte Target-/SPM-Pipeline erneut auf dem
bereits erzeugten Projekt aus und sichern den Fehler ab. Der Patch wurde gegen das
unveränderte veröffentlichte Paket angewendet und mit der getesteten Datei
verglichen. Beim Paketupgrade zuerst prüfen, ob der Fix inzwischen enthalten ist,
und Patch sowie Zugriff auf den internen Xcode-Mod gemeinsam überprüfen.

### Verifikationsstand

- Saubere Installation aus dem Lockfile einschließlich der bestehenden Patches
  erfolgreich; keine `file:`-Abhängigkeit und kein Apple-Targets-Fork im Lockfile.
- Clean-Prebuilds und Projektprüfung: iOS mit Siri, iOS ohne Siri und tvOS.
- Inkrementelle Prebuilds mit `--no-clean` und Projektprüfung: iOS mit Siri,
  iOS ohne Siri und tvOS. Expo 57 führt ohne diese Option standardmäßig einen Clean-Prebuild aus.
- Android- und Android-TV-Prebuild erfolgreich; Expo-Autolinking-Ausschluss auf iOS und TV geprüft.
- Separater Watch-Simulator-Build mit Xcode 27.1 erfolgreich, einschließlich
  frischer Auflösung und Kompilierung beider Swift-Pakete.
- iOS-Release-Archiv mit Siri erfolgreich; daraus erzeugte unsigned IPA besteht
  den vorhandenen Verifier einschließlich Watch- und Siri-Payload.
- 513 Node-Tests sowie TypeScript- und Plattformprüfung erfolgreich. ESLint hat dieselben 32
  Warnungen wie unverändertes `main`; die geänderten JavaScript-Dateien sind
  separat ohne Warnungen geprüft.

Die Release-Archive für iOS ohne Siri und tvOS sind ebenfalls erfolgreich gebaut.
Die daraus erzeugten unsigned IPAs bestehen den Verifier mit den jeweiligen
Varianten-Schaltern. Signierung, Installation und Funktionstests auf realen Geräten
bleiben eine gesonderte Abnahme. Native Android-APK-/AAB-Builds wurden für diese Änderung nicht
ausgeführt; Android und Android TV wurden durch Prebuilds und die Plattformprüfung
abgedeckt. Ein unsigned Archiv bestätigt
keine Provisioning-Profile oder Siri-Berechtigung eines Apple-Teams.
