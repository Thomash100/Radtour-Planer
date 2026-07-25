# Projektzusammenfassung

Stand: 2026-07-25

## Produktstand

BikeTripHub / Radtour-Planer ist ein MVP für mehrtägige Radtourplanung auf Basis einer vorhandenen GPX-Route oder einer direkt berechneten Fahrradroute. Der aktuelle Schwerpunkt ist eine prüfbare Tour-, Etappen- und Reiseplanung, nicht eine produktive Buchungsplattform.

## Aktueller MVP-Funktionsumfang

- GPX-Datei laden und als feste geometrische Grundlage verwenden.
- Start, Ziel und Zwischenziele direkt eingeben und über BRouter auf realen OpenStreetMap-Wegen verbinden; Fahrradwege und ausgeschilderte Radwanderwege können gezielt bevorzugt werden.
- Route anhand von Start-km und Ziel-km kürzen; Kürzungen werden idempotent aus der unveränderten Original-GPX-Geometrie abgeleitet.
- Etappen nach gewünschter Etappenlänge erzeugen.
- Etappen nach Anzahl Reisetage erzeugen.
- Etappen nach einem Ziel-Schwierigkeitsgrad erzeugen; steigungslastige Abschnitte werden auf Basis des vorhandenen Höhenprofils kürzer geplant.
- Etappen manuell bearbeiten; Geometrie, Distanz, Höhenmeter und Fahrzeit werden aus der aktuellen Arbeitsroute neu berechnet.
- Etappen nach Schwierigkeit und Belastung bewerten; Distanz, Höhenmeter, Steigungsdichte, Belastungspunkte und Hinweise werden je Etappe angezeigt.
- Farbige Etappen direkt auf der Karte anzeigen und anklicken.
- Karte und Höhenprofil in einer gemeinsamen Visualisierungsfläche umschalten.
- Orte/Städte aus lokaler MVP-Liste auf die GPX-Arbeitsroute projizieren und nach Bestätigung als Start, Ziel oder Etappenpunkt übernehmen.
- Unterkunftskandidaten je Etappe anzeigen, vormerken oder als Übernachtungspunkt auswählen.
- Unterkunft abseits der GPX-Route als Abstecher kennzeichnen.
- Gesamte Tour speichern und erneut öffnen.

Der vollständige Browser-TourState umfasst Route, gekürzte Arbeitsroute, Etappen, Etappengeometrien, Reisetage-/Etappenlängen-/Schwierigkeits-Einstellung, gesetzte Orte/Etappenpunkte und Unterkunftszuordnungen.

## Bekannte Einschränkungen

- Keine echte Buchung, Reservierung oder Zahlung.
- Keine Nutzerkonten.
- Reale Unterkunftskandidaten können im Entwicklungs-/MVP-Betrieb aus OpenStreetMap/Overpass ergänzt werden; eine produktionsfähige Unterkunftsquelle ist noch nicht abgeschlossen.
- Lokale MVP-Testdaten bleiben als ausdrücklich markierter Entwicklungsfallback vorhanden.
- Keine produktive POI-Massenabfrage.
- Die direkte Planung nutzt die öffentliche BRouter-Instanz ohne zugesichertes SLA; ein eigener oder vertraglich geeigneter Provider ist vor produktivem Betrieb zu entscheiden.
- Freie Ortssuche ist nicht Bestandteil des Routingpakets; die Direktplanung nutzt weiterhin den lokalen MVP-Ortskatalog.
- Orte und Unterkünfte verlegen die GPX-Route nicht automatisch.
- Die Etappenbewertung ist eine MVP-Planungshilfe und keine Sicherheits-, Fitness-, Wetter- oder Gesundheitsbewertung.
- Wetter, Oberfläche, individuelle Leistungsfähigkeit und E-Bike-Akkureichweite werden in der Etappenbewertung noch nicht berücksichtigt.
- GPX-Export enthält aktuell die bearbeitete Routengeometrie; vollständige Etappen- und Unterkunftsmetadaten bleiben im gespeicherten TourState.
- Rechtliche Seiten sind vorbereitete Platzhalter und müssen vor produktiver Veröffentlichung final geprüft werden.

## Paketstatus

- Paket 1: GPX-Grundbedienung abgeschlossen.
- Paket 2: Planung nach Reisetagen und Städte/Orte entlang der Route abgeschlossen.
- Paket 3: Unterkünfte je Etappe abgeschlossen.
- Paket 4: MVP-Releasefähigkeit und Veröffentlichungsvorbereitung abgeschlossen.
- Paket 5-7: Tourverwaltung, Planungsdatenqualität und Produktions-/Releasevorbereitung abgeschlossen.
- Paket 10: Etappenbewertung nach Schwierigkeit und Belastung abgeschlossen.
- Paket 11: Reale Fahrradwege in der Direktplanung abgeschlossen und über PR #59 in `private` gemergt.
- Paket 12: Schwierigkeitsbasierte Etappenplanung abgeschlossen und über PR #60 in `private` gemergt.
- Konsolidierung Paket 11/12: Nach-Merge-Punkte in Arbeit auf Branch `codex/consolidate-routing-stage-planning`; manueller RPi-Stopppunkt vor Merge.
- Paket 13 / Reiseauftrag: PR #61 bleibt bis nach Routing-/Etappen- und Unterkunftskonsolidierung Draft.

Aktueller Integrationsstand nach Paket 12:

- `private`: `e23c843ba825cc11204b88412babbde59b1fcd83`
- gemeinsamer Paket-11-/12-RPi- und Browser-Smoke: erfolgreich dokumentiert
- Prisma: nicht aktualisiert
- Plesk: unverändert
- keine produktive externe Unterkunfts-API

## Paket 4: Release-Readiness

Paket 4 konsolidiert Darstellung, Dokumentation, Demo-Fähigkeit, rechtliche Grundstruktur, SEO-Basis und Deployment-Bewertung. Es enthält keine neue Fachfunktion und keine Änderung am Public-/Private-Konzept.

Umgesetzt bzw. vorbereitet:

- Startseite beschreibt den aktuellen MVP-Stand und bevorzugt GPX als Einstieg.
- Demo-Tour wird nur nach ausdrücklicher Aktion geladen und zeigt den MVP mit Reisetagen, Orten, Etappen und Unterkunftskandidaten.
- Direkte Planung ist als MVP-Modus gekennzeichnet; seit Paket 11 verwendet sie reale BRouter-/OpenStreetMap-Wege.
- Footer zeigt Version, Build-Datum und MVP-Status.
- Impressum, Datenschutz, Nutzungsbedingungen und MVP-Hinweis sind als prüfpflichtige Platzhalter vorbereitet.
- Basis-Metadaten, OpenGraph, Robots und Sitemap sind vorbereitet; Indexierung bleibt wegen MVP-/Teststatus gesperrt.
- Partner-/Preisflächen sind als MVP-Ausblick gekennzeichnet und behaupten keine produktive Zahlung oder Buchung.

## Deployment-Strategie

Der aktuelle MVP ist keine rein statische Website. Die vollständige App benötigt weiter den privaten Next.js-/Docker-Stack mit API-Routen, Prisma/PostgreSQL, Redis und Worker.

Aktueller Ansatz:

- `public`: öffentlicher Webroot-/Asset-/Proxy-Bereich mit reduziertem Umfang.
- `private`: serverseitige Next.js-App inklusive API, Prisma, Worker- und Deployment-Skripten.

Eine Plesk- oder rein statische Webseitenvariante wäre ein separater Produktzuschnitt mit reduziertem Funktionsumfang und wird in Paket 4 nicht umgesetzt.

## Qualitätsstandard

Vor Paket-4-Stopppunkt:

```bash
git diff --check
npm test
npm run typecheck
npm run lint
npm run build
npm run artifact:private
npm run artifact:check-private
```

Zusätzlich, weil Startseite, Legal-Seiten und öffentliche Basisartefakte betroffen sind:

```bash
npm run artifact:public
npm run artifact:check-public
```

## Manueller Paket-Review nach lokalem Abschluss

- `/api/health`
- `/planer`
- Startseite
- Demo-/Beispielroute
- GPX laden
- Route kürzen
- Etappen nach Tagen erzeugen
- Orte/Städte übernehmen
- Unterkunft zuordnen
- gesamte Tour speichern
- Route erneut öffnen
- Rechtliche Seiten öffnen
- Footer/Version prüfen
- mobile Ansicht prüfen
- prüfen, dass keine produktive externe API, Buchung oder Zahlung suggeriert wird

## Paket 5-7: nächster zusammenhängender Entwicklungsblock

Paket 5-7 bündelt die nächsten größeren Themen ohne kleine Zwischenabnahmen:

- Tourverwaltung, Export/Import und Freigabe-Stand.
- Echte Planungsdatenstruktur für Orte, POI und Unterkünfte vorbereiten.
- Produktionsbetrieb und Veröffentlichung dokumentieren.

Paket 5 ergänzt:

- lokale Tourverwaltung unter `/touren`
- Tour umbenennen, duplizieren und löschen
- JSON-Export und JSON-Import
- Freigabe-Status für lokale Touren
- Etappen-GPX-Export mit Gesamtstrecke und Etappen-Tracks
- klare Trennung von Demo-Touren und echten Planungen

Paket 6 ergänzt:

- Datenqualitätsmarkierung für Unterkunftskandidaten
- Suchradius je Etappe
- klarere Unterscheidung zwischen Partnerdaten, POI-Daten und lokalen MVP-Testdaten
- Abstecherhinweis bleibt ohne automatische Routenänderung

Paket 7 ergänzt:

- `/api/version`
- erweiterte Health-/Version-Daten ohne Secrets
- Indexing-Steuerung über `NEXT_PUBLIC_ALLOW_INDEXING`
- Release-/Backup-/Betriebsdokumentation
- keine Plesk-Umstellung und keine produktive Veröffentlichung

## Paket 10: Etappenbewertung nach Schwierigkeit

Paket 10 ergänzt eine erklärbare MVP-Bewertung je Etappe. Die App berechnet Belastungspunkte von `0..100` aus Distanz, Höhenmetern bergauf, Höhenmetern bergab, Steigungsdichte und Längenzuschlägen. Die Etappen-Timeline zeigt daraus eine Stufe `leicht`, `mittel`, `schwer` oder `sehr schwer`, kompakte Kennzahlen und konkrete Hinweise.

Dokumentation der Formel, Schwellen und Grenzen: [docs/STAGE_DIFFICULTY_MVP.md](STAGE_DIFFICULTY_MVP.md).

Nicht enthalten:

- Wetter-, Wind- oder Oberflächenbewertung
- individuelle Fitnessprofile
- E-Bike-Akkureichweite
- medizinische oder sicherheitsrelevante Eignungsprüfung
- automatische Neuoptimierung der Etappen ohne Nutzerbestätigung

## Paket 11: Reale Fahrradwege

Paket 11 ersetzt die künstliche Direktverbindung zwischen Start, Ziel und Zwischenpunkten durch einen konfigurierbaren BRouter-Provider. Lange Touren werden abschnittsweise an expliziten Kontrollpunkten oder an Punkten einer zuvor gerouteten BRouter-Korridorlinie berechnet und ohne stillen Luftlinien-Fallback zusammengefügt.

Enthalten:

- BRouter-GeoJSON als tatsächliche Arbeitsgeometrie
- OSM-basierte Fahrradwege für direkte Routen
- technisch getrennte Requests für `ausgewogen`, `wenig Steigung`, `Fahrradwege bevorzugen`, `Radwanderwege bevorzugen` und `sportlich`
- sichere Fahrradinfrastruktur über `safety`, Radwanderwege über `trekking` mit `stick_to_cycleroutes=1`, höhenärmere Planung über verstärkte Höhenkosten
- Kilometer-/Prozentanzeige für erfasste Fahrradinfrastruktur und internationale, nationale, regionale oder lokale OSM-Radroutennetze
- Distanz, Fahrzeit und Höhenprofil aus dem Provider
- Profilabbildung auf `safety`, `trekking` und `fastbike`
- verständliche Provider- und Timeoutfehler
- expliziter Offline-Testmodus über `ROUTING_PROVIDER=mock`
- Docker-/RPi-Konfiguration und Datenschutz-/Betriebshinweise

Details und Grenzen: [docs/REAL_ROAD_ROUTING.md](REAL_ROAD_ROUTING.md).

## Paket 12: Etappenplanung nach Schwierigkeit

Paket 12 verwendet die erklärbare Belastungsbewertung aus Paket 10 erstmals als Planungsziel. Der Nutzer wählt `leicht`, `mittel`, `schwer` oder `sehr schwer`; die App erzeugt daraufhin lückenlose Etappen entlang der unveränderten Arbeitsroute. Steigungsreiche Abschnitte werden kürzer angesetzt, flache Abschnitte können länger werden.

Enthalten:

- Vorschau mit Distanz, Höhenmetern, Einstufung und Belastungspunkten je Etappe
- echte Höhenprofilwerte beim Kürzen, automatischen Erzeugen und manuellen Nachbearbeiten
- explizite Bestätigung, bevor bestehende oder manuell geänderte Etappen ersetzt werden
- persistiertes Zielniveau im lokalen TourState
- Warnung, wenn Höhendaten geschätzt werden oder ein Abschnitt das Zielniveau nicht einhalten kann
- keine Änderung der GPX-/BRouter-Geometrie und kein automatisches Neu-Routing

Formel, Zielwerte und Grenzen: [docs/STAGE_DIFFICULTY_MVP.md](STAGE_DIFFICULTY_MVP.md).

## Konsolidierung nach Paket 11 und 12

Der Nach-Merge-Abschnitt führt keine neue Produktfunktion ein. Er schließt vier Reviewpunkte:

- vorhandene Tour bei BRouter-Fehler vollständig erhalten
- sichtbare Routingprofile technisch und fachlich trennen
- lange Routen nur mit Segmentpunkten einer gerouteten Korridorlinie teilen
- maximal 20 Zwischenziele konsistent in UI und API erzwingen

Die bestehenden GPX-, Save/Load-, Höhenprofil-, Belastungs- und Schwierigkeitsflows bleiben unverändert. Der Abschnitt endet am dokumentierten manuellen Raspberry-Pi-/Browser-Stopppunkt.
