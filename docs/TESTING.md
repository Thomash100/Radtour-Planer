# Testing und Prüfstandard

Dieses Dokument definiert die Mindestprüfung für Entwicklungsabschnitte.

## Standardchecks

```bash
git diff --check
npm test
npm run typecheck
npm run lint
npm run build
```

Wenn Deployment-Artefakte betroffen sind:

```bash
npm run artifact:private
npm run artifact:check-private
```

Wenn Startseite, öffentliche Seiten oder Webroot-/Asset-Bestandteile betroffen sind:

```bash
npm run artifact:public
npm run artifact:check-public
```

## Erwartete Build-Hinweise

Wenn lokal keine `.env` mit `DATABASE_URL` vorhanden ist, kann `next build` beim Sammeln statischer Seitendaten Prisma-Warnungen ausgeben. Der Build gilt nur als erfolgreich, wenn der Prozess mit Exit-Code 0 endet.

Nicht akzeptabel:

- Redis-Connection-Errors im Build.
- TypeScript-Fehler.
- ESLint-Fehler.
- fehlende oder inkonsistente Lockfile-Abhängigkeiten.

## Manuelle Paketprüfung

Manuelle RPi-/Browser-Prüfungen werden für fachlich zusammenhängende Pakete gebündelt. Kleine UI-/UX-Zwischenschritte werden lokal geprüft und erst am Paketende gemeinsam manuell abgenommen, sofern kein harter Blocker auftritt.

## GPX-/Etappen-MVP

Je nach Paket prüfen:

- Startseite öffnet ohne automatische Demo-Route.
- `/planer` öffnet ohne sichtbare Fehler.
- GPX-Import zeigt die importierte Route.
- Start/Ziel stammen nach GPX-Import nicht aus Demo-Werten.
- Karte ist sichtbar und Etappenlinien sind farbig unterscheidbar.
- Karte/Höhenprofil-Umschaltung funktioniert ohne gequetschte Etappenliste.
- Route kürzen arbeitet aus der Original-GPX-Geometrie, nicht kumulativ.
- Große Startkürzung, z. B. Start ab 300 km, bleibt stabil.
- `Kürzung zurücksetzen` stellt die vollständige Originalroute wieder her.
- Etappen können nach Länge und nach Reisetagen erzeugt werden.
- Etappen können nach Ziel-Schwierigkeit erzeugt werden; hügelige Abschnitte führen bei gleichem Zielniveau zu kürzeren Vorschlägen als flache Abschnitte.
- Manuelle Etappenänderungen aktualisieren Geometrie, Folgeetappen, Distanz, Höhenmeter und Fahrzeit.
- Etappen zeigen Schwierigkeit, Belastungspunkte, Steigungsdichte und Hinweise aus Distanz/Höhenmetern.
- Ungültige km- oder Reisetage-Eingaben werden verständlich abgelehnt.
- Orte/Städte werden auf die GPX-Route projiziert und erst nach Bestätigung übernommen.
- Abbrechen einer Ortprojektion verändert Route und Etappenpunkte nicht.
- Versehentliche direkte Routenplanung bei geladener GPX-Route zeigt eine Bestätigung.
- Unterkunftskandidaten werden je Etappe angezeigt.
- Unterkunft abseits der Route wird als Abstecher gekennzeichnet und verändert die GPX-Route nicht automatisch.
- Unterkunft kann als geplant gemerkt oder als Übernachtungspunkt ausgewählt werden.
- `Alle Änderungen speichern` zeigt nach Erfolg `Tour gespeichert.`.
- Erneutes Öffnen erhält Route, gekürzte Route, Etappen, Etappengeometrien, Reisetage-/Etappenlängen-Einstellung, Orte/Etappenpunkte und Unterkunftszuordnungen.
- GPX-Export schreibt die bearbeitete Routengeometrie; Etappen- und Unterkunftsmetadaten bleiben im MVP im gespeicherten TourState.

## Paket-4-Release-Readiness

Zusätzlich prüfen:

- Startseite beschreibt den aktuellen MVP ohne produktive Überversprechen.
- GPX ist als empfohlener Einstieg erkennbar.
- Demo-Tour wird nur durch ausdrückliche Aktion geladen.
- Direkte Planung ist als BRouter-/OpenStreetMap-Fahrradroute gekennzeichnet und weist auf die notwendige Routenprüfung hin.
- Impressum, Datenschutz, Nutzungsbedingungen und MVP-Hinweis öffnen ohne Fehler.
- Rechtliche Seiten enthalten nur prüfpflichtige Platzhalter und keine erfundenen Betreiberangaben.
- Footer zeigt MVP-Status, Version und Build-Datum.
- Robots/Sitemap sind vorbereitet; Indexierung bleibt bis zur Freigabe gesperrt.
- Partner-/Preisflächen behaupten keine produktive Buchung, Zahlung oder externe Unterkunfts-API.
- Mobile Ansicht der Startseite, Legal-Seiten und des Planers erzeugt keinen horizontalen Overflow.

## Paket 5-7

Zusätzlich gebündelt prüfen:

- `/touren` öffnet ohne Fehler.
- gespeicherte Tour erscheint in der Tourverwaltung.
- Tour lässt sich umbenennen.
- Tour lässt sich duplizieren, ohne die Ursprungstour zu überschreiben.
- Tour lässt sich löschen.
- Tour lässt sich als JSON exportieren.
- JSON-Import stellt eine Tour wieder her.
- Freigabe-Stand kann zwischen Entwurf, Freigabe prüfen und Freigegeben wechseln.
- Öffnen aus der Tourverwaltung lädt die richtige Tour im Planer.
- Demo-Tour und echte Touren sind unterscheidbar.
- Etappen-GPX exportiert Gesamtstrecke und Etappen-Tracks.
- Unterkunftskandidaten zeigen Datenqualität und Suchradius.
- `/api/health` und `/api/version` liefern Version, Build-Datum, MVP-Status, Deployment-Kanal und Indexierungsstatus.
- Robots sperrt Indexierung standardmäßig.
- Keine produktive API, Buchung, Zahlung, Nutzerkonten oder Plesk-Umstellung werden suggeriert.

## Paket 10

Zusätzlich gebündelt prüfen:

- Etappen-Timeline zeigt pro Etappe eine Schwierigkeit `leicht`, `mittel`, `schwer` oder `sehr schwer`.
- Belastungspunkte bleiben zwischen `0` und `100`.
- Distanz, Höhenmeter bergauf, Höhenmeter bergab, Steigungsdichte und Fahrzeit sind kompakt sichtbar.
- Lange Etappen, viele Höhenmeter und lange Abfahrten erzeugen verständliche Hinweise.
- Fehlende Höhendaten werden als unvollständig markiert und erzeugen keine kaputte Bewertung.
- Manuelle Änderungen an Distanz oder Höhenmetern aktualisieren die Bewertung sofort.
- Speichern und erneutes Öffnen erhält Etappenwerte; die Bewertung wird daraus erneut berechnet.
- Die Bewertung behauptet keine Fitness-, Wetter-, Sicherheits- oder E-Bike-Akkugarantie.

## Paket 11

Reale Wege in der Direktplanung gebündelt prüfen:

- Flensburg nach Swinemünde planen; die Geometrie folgt Straßen und Fahrradwegen und besteht nicht nur aus Kontrollpunkten.
- Hamburg nach Dresden planen; die vorhandenen Korridorpunkte werden über reale Wege verbunden.
- Ein eigenes Zwischenziel hinzufügen und prüfen, dass die Route dieses Ziel in der richtigen Reihenfolge anfährt.
- Die Profile `ausgewogen`, `wenig Steigung`, `Fahrradwege bevorzugen`, `Radwanderwege bevorzugen` und `sportlich` vergleichen; Providerhinweis, Geometrie oder Kennzahlen müssen die getrennten BRouter-Anfragen nachvollziehbar machen.
- `Fahrradwege bevorzugen` verwendet `safety`, `Radwanderwege bevorzugen` verwendet `trekking` mit starker Radroutennetzbindung, `wenig Steigung` verstärkte Höhenkosten und `sportlich` `fastbike`.
- Die Radwege-Auswertung zeigt Kilometer und Anteil für erfasste Fahrradinfrastruktur und ausgeschilderte OSM-Radroutennetze.
- Vorhandene Netzebenen (`international`, `national`, `regional`, `lokal`) werden angezeigt; mehrfach markierte Abschnitte werden in der Radwanderwege-Gesamtsumme nicht doppelt gezählt.
- Distanz, Fahrzeit und Höhenprofil werden angezeigt.
- Etappen lassen sich aus der realen Arbeitsroute erzeugen und farbig darstellen.
- Speichern und erneutes Öffnen erhält die geroutete Geometrie.
- Bei nicht erreichbarem Routingdienst erscheint eine Fehlermeldung; es wird keine Luftlinie erzeugt und eine vorhandene Tour bleibt einschließlich Etappen, POI und Unterkunftszuordnungen erhalten.
- Eine lange Route verwendet keine frei interpolierten Luftlinien-Hilfspunkte. Kann kein routbarer BRouter-Korridor ermittelt werden, fordert die App ein nachvollziehbares Zwischenziel an.
- 20 Zwischenziele können angelegt werden. Danach sind Eingabe und Hinzufügen deaktiviert; eine direkte API-Anfrage mit 21 Zwischenzielen wird ebenfalls abgelehnt.
- Mobile Ansicht erzeugt keinen horizontalen Overflow.

## Paket 12

Schwierigkeitsbasierte Etappenplanung gebündelt prüfen:

- Im Schritt `Etappen erzeugen` zwischen Länge, Reisetagen und Schwierigkeit wechseln.
- Für `leicht`, `mittel`, `schwer` und `sehr schwer` eine Ergebnisvorschau mit Distanz, Höhenmetern und Belastungspunkten anzeigen.
- Bei einer hügeligen Route prüfen, dass das Zielniveau `leicht` steigungslastige Bereiche kürzer aufteilt als eine flache Route vergleichbarer Länge.
- Prüfen, dass alle Etappengeometrien lückenlos aufeinander folgen und die Arbeitsroute weder verlassen noch verlagert wird.
- Vorhandene Etappen dürfen erst nach ausdrücklicher Bestätigung ersetzt werden. Die Bestätigung muss direkt im Schritt `Etappen erzeugen` sichtbar werden und automatisch in den Fokus rücken.
- Wenn das Zielniveau in einem sehr belastenden Abschnitt nicht eingehalten werden kann, muss eine Warnung sichtbar bleiben.
- Fehlende Höhendaten müssen als Schätzung gekennzeichnet sein und dürfen keine kaputte Geometrie erzeugen.
- Route kürzen, manuelle Etappenänderung sowie Save/Load müssen weiterhin konsistente Höhenmeter und Geometrien erhalten.
- Speichern und erneutes Öffnen erhält Erzeugungsmodus und gewähltes Zielniveau.
- Mobile Ansicht erzeugt bei 360, 390, 430 und 768 px keinen horizontalen Overflow.

## Paket 13

Unterkunftsplanung gebündelt prüfen:

- Hotel, Pension, Hostel, Campingplatz und Ferienwohnung einzeln filtern.
- maximale Entfernung zur Route und zum Etappenende verändern und Trefferliste prüfen.
- `Nur Fahrradmerkmale` zeigt ausschließlich Unterkünfte mit mindestens einem belegten Merkmal.
- Fahrradabstellplatz, abschließbarer Fahrradraum, E-Bike-Lademöglichkeit und Gepäckaufbewahrung nur gegen tatsächlich vorhandene Quelldaten anzeigen.
- Kartenmarker unterscheiden Unterkunftstyp sowie `vorgeschlagen`, `vorgemerkt` und `Übernachtung`; Marker-Titel nennt die Entfernung zur Route.
- Unterkunft vormerken und als Übernachtung wählen.
- Auswahl in Etappe, lokalem TourState, Tour-JSON und Reiseplan erneut öffnen.
- Unterkunft abseits der Route wählen: BRouter berechnet Hin- und Rückweg, zeigt beide Distanzen separat und zeichnet eine gestrichelte Abstecherlinie.
- Hauptroute vor und nach Unterkunftsauswahl vergleichen; sie muss unverändert bleiben.
- BRouter-Fehler provozieren; die bisherige Unterkunftsauswahl muss unverändert bleiben.
- ohne `ACCOMMODATION_API_URL` darf Produktion keine öffentliche Overpass-Instanz als stillen Fallback verwenden.
- `LocalTestProvider` erscheint nur bei ausdrücklicher Konfiguration.
- OSM-Quelle und ODbL-Attribution sichtbar prüfen.
- Reiseplan zeigt Tag, Unterkunft, Typ, Status, Entfernung, Quelle, belegte Merkmale und gegebenenfalls BRouter-Abstecher.
- mobile Ansicht erzeugt keinen horizontalen Overflow; Browserkonsole bleibt fehlerfrei.

## Paket 14

Kartenzoom auf Desktop, Tablet, Smartphone und Raspberry Pi prüfen:

- Eine gespeicherte oder importierte Tour mit sichtbarer Route öffnen.
- Über `+` bis Zoomstufe 22 hineinzoomen; die Schaltfläche darf vorher nicht künstlich deaktiviert werden.
- Über `−` bis Zoomstufe 0 herauszoomen; die vollständige Übersicht muss erreichbar sein.
- `Route anzeigen` zentriert weiterhin die gesamte Route, ohne den anschließenden manuellen Zoom einzuschränken.
- Touch-Zoom, Mausrad und Tastaturbedienung funktionieren weiterhin.
- Nach Save/Load bleiben Route, Etappen und Unterkunftszuordnungen unverändert.
- Bei Desktop-, Tablet- und Smartphone-Breite bleiben die Zoom-Schaltflächen erreichbar; Browserkonsole und Layout bleiben fehlerfrei.

## Paket 15

Getrennte Routen- und Etappenbedienung auf Desktop, Tablet, Smartphone und Raspberry Pi prüfen:

- `/planer/route` zeigt ausschließlich die Arbeitsschritte für Eingabeart, direkte Route, GPX-Import, Routenübersicht und Routenkürzung.
- Die direkte Routeneingabe enthält Start, Ziel, Zwischenziele und Routingprofil, aber keine Etappen- oder Energieeinstellungen.
- Die Routenübersicht zeigt Grundroute, Karte, Höhenprofil und Radwegeanteil ohne Etappen-, Unterkunfts- oder POI-Darstellung.
- `Zur Etappenplanung` öffnet `/planer/etappen` und übernimmt dieselbe Geometrie, Distanz und Höhenwerte aus dem vorhandenen TourState.
- `/planer/etappen` zeigt ausschließlich Etappenerzeugung, Etappenvorschau und Etappenbearbeitung.
- Ohne vorhandene Route zeigt `/planer/etappen?open=none` einen verständlichen Leerzustand mit Rückweg zur Routenplanung.
- Die gemeinsame Navigation ist in beiden Bereichen sichtbar; ohne Route ist der Wechsel zur Etappenplanung aus der Routenansicht deaktiviert.
- Alte Links wie `/planer?step=stages` werden auf den passenden neuen Planungsbereich weitergeleitet.
- Save/Load erhält Route, Etappen, Etappengeometrien, Einstellungen und Unterkunftszuordnungen unverändert.
- Mit `ACCOMMODATION_PROVIDER=local-test` wird die klar markierte lokale Test-Pension im Raspberry-Pi-App-Container verfügbar; Vormerken, Übernachtung, Save/Load und Kartenmarker prüfen.
- Ohne expliziten Produktionsendpunkt wird keine öffentliche Overpass-Instanz als Fallback verwendet.
- Es gibt keine neue Energie-, E-Bike- oder Akkurechenlogik.
- Bei 390 und 768 px entsteht kein horizontaler Overflow; Browserkonsole und Layout bleiben fehlerfrei.

## Paket 16

Persönliches Fahrer- und Fahrradprofil auf Desktop, Tablet, Smartphone und Raspberry Pi prüfen:

- `/einstellungen/fahrprofil` ist über die Kopf- und Fußnavigation erreichbar.
- Fahrername, Körpergewicht, Fitnesslevel, Erfahrungsniveau, Tagesbelastung sowie bevorzugte und maximale Fahrzeit speichern.
- Maximale Fahrzeit kleiner als bevorzugte Fahrzeit wird verständlich abgelehnt.
- Jeden unterstützten Fahrradtyp auswählen; Fahrrad- und Gepäckgewicht bleiben nach Reload erhalten.
- Fahrradtyp `E-Bike` wählen und Akkukapazität, Akkuanzahl, Motorleistung, Referenzreichweite, Unterstützungsprofil und Reserve speichern.
- Nach Reload werden alle gespeicherten Werte wieder angezeigt.
- Profil als JSON exportieren, Werte ändern und die Datei wieder importieren.
- Eine Tour speichern und als JSON exportieren; der validierte Profilsnapshot ist im TourState enthalten.
- Gespeicherte Tour erneut öffnen; das Profil wird zentral wiederhergestellt.
- Es wird keine Energie-, Reichweiten-, Ladepunkt- oder automatische Etappenberechnung angezeigt oder ausgelöst.
- Bei 390 und 768 px entsteht kein horizontaler Overflow; Browserkonsole bleibt fehlerfrei.

## Paket 17

E-Bike- und Ladeprofil auf Desktop, Tablet, Smartphone und Raspberry Pi prüfen:

- Fahrradtyp `E-Bike` wählen.
- Nutzbare Akkukapazität, Motorunterstützung, Ladegerätleistung und Ladeverluste speichern.
- Persönliches Fahrprofil zwischen `Reichweitenorientiert`, `Ausgewogen` und `Sportlich` wechseln.
- Nach Reload werden alle Paket-16- und Paket-17-Werte wieder angezeigt.
- Profil als JSON exportieren und erneut importieren; die neuen Ladeparameter bleiben erhalten.
- Eine Tour speichern und als JSON exportieren; der Profilsnapshot im TourState enthält die neuen Parameter.
- Ein Profil aus Paket 16 ohne neue Felder laden; definierte Standardwerte werden ergänzt.
- Werte außerhalb der sichtbaren Eingabegrenzen werden abgelehnt.
- Es wird weiterhin keine Energie-, Reichweiten-, Ladezeit- oder Etappenberechnung angezeigt oder ausgelöst.
- Bei 390, 768 und 1280 px entsteht kein horizontaler Overflow; Browserkonsole bleibt fehlerfrei.

## Paket 18

Deterministischen Energie- und Reichweiten-Rechenkern prüfen:

- Dieselben Eingaben mehrfach berechnen; das vollständige Ergebnis bleibt identisch.
- Mit 500 Wh nutzbarer Energie, 80 km Referenzreichweite und 0 % Reserve ergeben 80 flache Kilometer ungefähr 100 % Verbrauch und 0 % Rest.
- Mit denselben Daten und 20 % Reserve ergeben 64 flache Kilometer ungefähr 80 % Verbrauch und 20 % Rest; die Reserve ist gerade eingehalten.
- Mit denselben Daten ergeben 100 flache Kilometer ungefähr 125 % Verbrauch, Status `depleted` und eine nicht ausreichende Akkukapazität.
- Persönliche Referenzreichweite, daraus abgeleitete Wh/km und sichere Reichweite bis zur Reserve werden angezeigt.
- Physikalischen Rohverbrauch, kalibrierten Verbrauch und Kalibrierungsfaktor vergleichen.
- Ein Faktor außerhalb `0,5..2` zeigt einen Prüfhinweis; eine Begrenzung auf `0,1..20` wird ausdrücklich ausgewiesen.
- Flache Referenzstrecke, kurze steile Etappe und lange flache Etappe vergleichen.
- Bei identischen 100-km-Strecken gilt für 100, 1.000 und 2.000 positive Höhenmeter zwingend: Verbrauch A < B < C.
- Der Kalibrierungsfaktor wirkt nur auf den flachen Grundverbrauch; der physikalische Steigungszuschlag wird unskaliert addiert.
- Höheres Gesamtgewicht und höhere Motorunterstützung erhöhen den Akkuanteil am Steigungszuschlag.
- Gefälle reduziert den Bedarf höchstens bis null und erzeugt weder negative Akkuenergie noch Rekuperation.
- Etappenansicht zeigt flachen Grundverbrauch, Steigungszuschlag, Gefälleentlastung, Gesamtverbrauch, positive Höhenmeter und Wh je 100 Hm getrennt.
- Höheres Fahrer-/Fahrrad-/Gepäckgewicht erhöht bei gleicher Strecke den Energiebedarf.
- Höhere Motorunterstützung erhöht den Akkuanteil und senkt den Fahreranteil.
- Klassisches Fahrrad zeigt mechanischen Bedarf und persönliche Belastung, aber keine Akkuwerte.
- Referenzreichweite gilt für die konfigurierte Gesamtakkuanzahl: Ein zweiter Akku verdoppelt die persönliche Reichweite nicht automatisch.
- Nach Änderungen an Akkukapazität, Akkuanzahl oder nutzbarem Anteil weist das Profil sichtbar auf die Prüfung der Referenzreichweite hin.
- Reserveunterschreitung und nicht ausreichende Akkukapazität erzeugen verständliche Warnungen.
- Vollständiges echtes Höhenprofil ergibt hohe, geschätztes Profil höchstens mittlere und fehlendes/unvollständiges Profil niedrige Prognosequalität.
- Etappenansicht zeigt Energiebedarf, Verbrauch, Restenergie, Restkapazität, persönliche Belastung, Restreichweite, Reserve und Qualität.
- Fahrerleistung, Motorwirkungsgrad, Modellgeschwindigkeit und nominaler Unterstützungs-Referenzpunkt werden als Annahmen sichtbar ausgewiesen.
- Profil-JSON exportieren/importieren sowie Tour speichern/laden; die kalibrierte Prognose bleibt identisch.
- Jede Etappe startet rechnerisch mit voller nutzbarer Kapazität; es gibt keine Lade- oder etappenübergreifende Akkufortschreibung.
- Keine automatische Etappenverschiebung, Ladepunktplanung, alternative Route oder Wetter-/Windberechnung wird ausgelöst.
- Bei 390, 768 und 1280 px entsteht kein horizontaler Overflow; Browserkonsole bleibt fehlerfrei.

## Paket 19

Deterministische E-Bike-Ladeplanung prüfen:

- Kurze Tour mit ausreichender Kapazität zeigt keinen unnötigen Ladehalt.
- 500 Wh nutzbare Energie, 80 km Referenzreichweite und 100 km flache Strecke ergeben 625 Wh; ohne Ladepunkt ist die Tour nicht durchführbar, mit Ladepunkt bei km 64 wird ein Ladehalt bei 20 % Ankunftsakku geplant.
- Die korrigierten Höhenmeterfälle 635 Wh bei 100 Hm, 722 Wh bei 1.000 Hm und 819 Wh bei 2.000 Hm werden unverändert und monoton in die Ladeplanung übernommen.
- Längere Tour kennzeichnet die erste kritische Stelle und fügt einen erreichbaren automatischen Ladehalt ein.
- Tour mit mehreren Energiegrenzen erzeugt mehrere Ladehalte in stabiler Routenreihenfolge.
- Ohne erreichbaren Ladepunkt erscheinen Reserve- und Erreichbarkeitswarnung.
- Eigenen Ladepunkt mit Name, Routen-km, Steckertyp, Ladeleistung, Betreiber, Öffnungszeiten, Kosten und Verfügbarkeit erfassen.
- Manuellen Ladehalt hinzufügen, entfernen und in der Reihenfolge verschieben.
- Ziel-Ladung zwischen 80, 90 und 100 % ändern; Ankunftsakku, Abfahrtsakku und Ladezeit werden sofort neu berechnet.
- Unbekannte Ladeleistung verwendet sichtbar die konfigurierte Ladegerätleistung als Schätzannahme.
- Nicht verfügbarer Ladepunkt wird nicht automatisch verwendet und erzeugt bei manueller Auswahl eine Warnung.
- Etappenansicht zeigt Ladehalte, Akkuwerte, Restreichweite und Ladezeit.
- Tourübersicht zeigt Fahrenergie, Nachladung, gesamte Ladezeit und Fahrzeit einschließlich Laden.
- Tour speichern, neu laden sowie als JSON exportieren/importieren; eigene Punkte und manuelle Ladehalte bleiben erhalten.
- Dieselben Eingaben vor und nach Reload ergeben vollständig identische Ladeergebnisse.
- Klassisches Fahrrad zeigt keine Ladeplanung.
- Keine Live-Abfrage, Reservierung, Wetterintegration, Routenänderung oder KI-Optimierung wird ausgelöst.
- Bei 390, 768 und 1280 px entsteht kein horizontaler Overflow; Browserkonsole bleibt fehlerfrei.

## Docker/RPi-Prüfung

Bei Docker-, Deployment- oder Raspberry-Pi-Änderungen:

```bash
docker compose build
docker compose up -d
curl -fsS http://localhost:3000/api/health
```

Raspberry Pi:

```bash
docker compose -f docker-compose.rpi.yml build
docker compose -f docker-compose.rpi.yml up -d
curl -fsS http://localhost:3000/api/health
```

## PR-Dokumentation

PR- oder Issue-Abschlusskommentare sollen enthalten:

- Commit-Hash
- Branch
- Ergebnis `git diff --check`
- Ergebnis `npm test`
- Ergebnis Lint
- Ergebnis Typecheck
- Ergebnis Build
- Ergebnis Artefaktprüfung, falls betroffen
- Ergebnis Docker-/Raspberry-Pi-Test, falls betroffen
- manuelle Prüfpunkte
- Entscheidung: mergefähig oder Nacharbeit erforderlich

## Wenn Tests nicht möglich sind

Dokumentieren:

- welcher Check nicht lief,
- warum er nicht lief,
- welcher Ersatzcheck durchgeführt wurde,
- welcher manuelle Stopppunkt bleibt.
