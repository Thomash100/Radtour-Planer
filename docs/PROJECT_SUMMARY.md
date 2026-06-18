# Projektzusammenfassung

Stand: 2026-06-19

## Produkt

BikeTripHub / RadreisePlaner ist ein MVP fuer mehrtaegige Radtourplanung. Ziel ist keine reine Kartenanzeige, sondern ein planbarer Reiseablauf mit Route, Etappen, POI, Unterkuenften, Gepaecktransfer, Fahrradservice und spaeter Partner-/Monetarisierungsfunktionen.

## Aktuelle Richtung

Die aktuelle Roadmap steht in Issue #26:

https://github.com/Thomash100/Radtour-Planer/issues/26

P0-Fokus:

- Startseite ohne automatische Demo-Route: umgesetzt in #28-Schnitt.
- Gefuehrter Workflow fuer direkte Eingabe oder GPX-Import: als mehrstufige Planerstruktur vorbereitet.
- Stabile Kartenansicht mit Vollbildmodus: eigene Route `/planer/karte` nutzt denselben lokalen TourState.
- GPX-Bearbeitung und Etappenlogik.
- Keine Salzburg-Muenchen-Vorbelegung nach GPX-Import.
- Keine Luftlinie als echte Route.
- Codex-Arbeitsstandard und Leitplanken.

## Technischer Stand

- Next.js App Router mit TypeScript.
- Tailwind CSS und shadcn/ui-kompatible Komponenten.
- MapLibre GL JS mit OpenStreetMap-Rastertiles.
- Prisma ORM mit PostgreSQL/PostGIS.
- Redis und BullMQ fuer Hintergrundjobs.
- Docker Compose fuer lokale Entwicklung, Raspberry Pi und Webserver.
- Public/private-Deployment-Artefakte sind als naechster Strukturstandard vorbereitet.

## Wichtige Architekturprinzipien

- Modularer Monolith vor Microservices.
- Feature-Slices statt breiter Umbauten.
- Route, Etappen, Karte und Hoehenprofil muessen dieselbe Routengrundlage nutzen.
- GPX-Import bleibt eine zentrale Grundlage fuer die erste echte Testplanung.
- Oeffentliche OSM-/Overpass-/Geocoding-Dienste duerfen nicht als dauerhaftes Produktionsbackend verwendet werden.
- Datenquellen, Lizenzen und Attribution muessen sichtbar bleiben.

## Qualitaetsstandard

Vor Abschluss eines Entwicklungsabschnitts:

- `git diff --check`
- `npm run lint`
- `npm run typecheck` oder `tsc --noEmit`
- `npm run build`
- bei Deployment: Docker-/Raspberry-Pi-Pruefung
- PR oder Issue mit Testergebnis und manuellen Pruefpunkten aktualisieren

## Aktueller Arbeitsstandard

Issue #27 legt fest, dass jeder Codex-Abschnitt mit einem geprueften und dokumentierten Stand endet:

https://github.com/Thomash100/Radtour-Planer/issues/27

Details stehen in:

- [AGENTS.md](../AGENTS.md)
- [docs/CODEX_WORKFLOW.md](CODEX_WORKFLOW.md)
- [docs/ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md)
- [docs/TESTING.md](TESTING.md)

## Aktueller Stand nach #28-Schnitt

- Startseite zeigt keine Salzburg-/Muenchen-Vorbelegung mehr.
- `/planer` trennt Eingabeart, direkte Route, GPX-Import, Uebersicht, Bearbeitung und Etappen als Workflow-Schritte.
- Explizite Demo-Tour bleibt verfuegbar, wird aber nicht automatisch geladen.
- Lokaler TourState speichert Route, Etappen und POI fuer Ruecksprung und Vollbildkarte.
- `/planer/karte` ist ein eigener Kartenarbeitsbereich mit Ruecksprung zur Bearbeitung und Etappenplanung.

## Deployment-Struktur

- Arbeitsbranches bleiben vollstaendige Entwicklungsstaende mit Quellcode, Tests, Doku und Buildlogik.
- `public` soll nur oeffentlich auslieferbare Webroot-/Asset-/Proxy-Dateien enthalten.
- `private` soll die serverseitige Next.js-Anwendung mit API, Prisma, Redis-/Worker-Anbindung und Beispielkonfiguration enthalten.
- Die aktuelle App ist nicht als rein statischer Export geeignet; empfohlen ist Next.js-Serverbetrieb im privaten Bereich mit oeffentlichem Webroot/Reverse Proxy.
- Lokale Artefakte werden mit `npm run artifact:public` und `npm run artifact:private` unter `artifacts/` erzeugt und mit den zugehoerigen Check-Skripten geprueft.

## Naechste fachliche Arbeit

#29 bleibt getrennt: GPX-Bearbeitung und Etappenlogik sollen auf dem neuen Workflow aufsetzen, ohne die Bedienstruktur wieder zu ueberladen.
