# Projektzusammenfassung

Stand: 2026-06-30

## Produktstand

BikeTripHub / Radtour-Planer ist ein MVP für mehrtägige Radtourplanung auf Basis einer vorhandenen GPX-Route. Der aktuelle Schwerpunkt ist die Vorführ- und Reviewfähigkeit des GPX-Workflows, nicht eine produktive Buchungs- oder Routingplattform.

## Aktueller MVP-Funktionsumfang

- GPX-Datei laden und als feste geometrische Grundlage verwenden.
- Route anhand von Start-km und Ziel-km kürzen; Kürzungen werden idempotent aus der unveränderten Original-GPX-Geometrie abgeleitet.
- Etappen nach gewünschter Etappenlänge erzeugen.
- Etappen nach Anzahl Reisetage erzeugen.
- Etappen manuell bearbeiten; Geometrie, Distanz, Höhenmeter und Fahrzeit werden aus der aktuellen Arbeitsroute neu berechnet.
- Farbige Etappen direkt auf der Karte anzeigen und anklicken.
- Karte und Höhenprofil in einer gemeinsamen Visualisierungsfläche umschalten.
- Orte/Städte aus lokaler MVP-Liste auf die GPX-Arbeitsroute projizieren und nach Bestätigung als Start, Ziel oder Etappenpunkt übernehmen.
- Unterkunftskandidaten je Etappe anzeigen, vormerken oder als Übernachtungspunkt auswählen.
- Unterkunft abseits der GPX-Route als Abstecher kennzeichnen.
- Gesamte Tour speichern und erneut öffnen.

Der vollständige Browser-TourState umfasst Route, gekürzte Arbeitsroute, Etappen, Etappengeometrien, Reisetage-/Etappenlängen-Einstellung, gesetzte Orte/Etappenpunkte und Unterkunftszuordnungen.

## Bekannte Einschränkungen

- Keine echte Buchung, Reservierung oder Zahlung.
- Keine Nutzerkonten.
- Keine produktive externe Unterkunfts-API.
- Unterkunftskandidaten kommen im MVP aus vorhandenen POI-Daten oder lokalen MVP-Testdaten.
- Keine produktive POI-Massenabfrage.
- Keine neue Routing-API; direkte Planung nutzt weiterhin Mockrouting.
- Orte und Unterkünfte verlegen die GPX-Route nicht automatisch.
- GPX-Export enthält aktuell die bearbeitete Routengeometrie; vollständige Etappen- und Unterkunftsmetadaten bleiben im gespeicherten TourState.
- Rechtliche Seiten sind vorbereitete Platzhalter und müssen vor produktiver Veröffentlichung final geprüft werden.

## Paketstatus

- Paket 1: GPX-Grundbedienung abgeschlossen.
- Paket 2: Planung nach Reisetagen und Städte/Orte entlang der Route abgeschlossen.
- Paket 3: Unterkünfte je Etappe abgeschlossen.
- Paket 4: MVP-Releasefähigkeit und Veröffentlichungsvorbereitung in Arbeit auf Branch `codex/package-4-mvp-release-readiness`.
- Paket 5-7: Tourverwaltung, Planungsdatenqualität und Produktions-/Releasevorbereitung in Arbeit auf Branch `codex/packages-5-7-tour-data-release`.

Letzter nachgezogener Deployment-Stand vor Paket 4:

- `private`: `a238223a82700c11600f31bf1e0534dce8eabbbb`
- RPi-Smoke: erfolgreich
- Prisma: nicht aktualisiert
- Plesk: unverändert
- keine produktive externe Unterkunfts-API

## Paket 4: Release-Readiness

Paket 4 konsolidiert Darstellung, Dokumentation, Demo-Fähigkeit, rechtliche Grundstruktur, SEO-Basis und Deployment-Bewertung. Es enthält keine neue Fachfunktion und keine Änderung am Public-/Private-Konzept.

Umgesetzt bzw. vorbereitet:

- Startseite beschreibt den aktuellen MVP-Stand und bevorzugt GPX als Einstieg.
- Demo-Tour wird nur nach ausdrücklicher Aktion geladen und zeigt den MVP mit Reisetagen, Orten, Etappen und Unterkunftskandidaten.
- Direkte Planung ist als Mockrouting gekennzeichnet.
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
