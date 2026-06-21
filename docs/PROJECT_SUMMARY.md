# Projektzusammenfassung

Stand: 2026-06-21

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
- Echte Deployment-Branches `public` und `private` werden aus geprueften Artefakten befuellt.
- RPi-/Produktionsstart wartet explizit auf Postgres und Redis, damit App und Worker nach Neustart oder Update stabil anlaufen.

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
- [docs/GPX_STAGE_MVP.md](GPX_STAGE_MVP.md)
- [docs/TESTING.md](TESTING.md)

## Aktueller Stand nach #28-Schnitt

- Startseite zeigt keine Salzburg-/Muenchen-Vorbelegung mehr.
- `/planer` trennt Eingabeart, direkte Route, GPX-Import, Uebersicht, Bearbeitung und Etappen als Workflow-Schritte.
- Explizite Demo-Tour bleibt verfuegbar, wird aber nicht automatisch geladen.
- Lokaler TourState speichert Route, Etappen und POI fuer Ruecksprung und Vollbildkarte.
- `/planer/karte` ist ein eigener Kartenarbeitsbereich mit Ruecksprung zur Bearbeitung und Etappenplanung.

## Aktueller Stand nach #29-Abnahme

- PR #25 wurde nach fachlicher RPi-/Browser-Abnahme in den Integrationsbranch gemergt: `5c15c827624f75005595d05e2c63df0778a31886`.
- Der #29-Branch wurde auf dem Raspberry Pi per `rpi-update.sh` gestartet; App- und Worker-Healthcheck waren erfolgreich.
- Im Browser wurde eine echte GPX-Datei aus `gps-touring/sample-gpx` geladen und vollstaendig angezeigt.
- GPX-Start und -Ende wurden entlang der Route getrimmt: km 2,0 bis km 76,8.
- Nach dem Trim wurden 2 Etappen nach km erzeugt.
- Eine Etappe wurde manuell per Start-km, Ziel-km und Laenge geaendert: 0,0 -> 0,5 km, 37,4 -> 38,9 km und 37,4 -> 38,4 km.
- Distanz, Hoehenmeter und Fahrzeit wurden neu berechnet; Hoehenmeter stiegen im Test von 259 auf 266 Hm.
- Farbige Etappenlinien, Speichern, erneutes Oeffnen und persistierte Etappengeometrie wurden geprueft.
- Nach dem Merge wurde ein kurzer RPi-Smoke-Test durchgefuehrt: `/api/health` meldete `ok`, `/planer` oeffnete die Planer-Seite und die gespeicherte Beispielroute `cmqnvfw150043fuiv96ttfpr2` oeffnete mit persistierter Etappe `38.4 km`.
- Prisma wurde im Rahmen von #29 nicht aktualisiert; der angezeigte Prisma-Update-Hinweis bleibt ein separater technischer Auftrag.

## Aktueller Stand nach GPX-/Etappen-MVP-Konsolidierung

- Der Planer erklaert direkt im Etappenbereich, dass die GPX-Route die feste Grundlage bleibt.
- Start-km, Ziel-km und Laenge werden im Arbeitskontext kurz erklaert.
- Orte dienen im MVP als Etappennamen oder Projektion auf die bestehende Route und verlegen die Route nicht automatisch.
- Ungueltige km-Eingaben werden abgefangen: Start-km kleiner 0, Ziel-km groesser als Routenlaenge, Ziel-km kleiner/gleich Start-km und Laenge kleiner/gleich 0 erzeugen Statusmeldungen statt kaputter Geometrie.
- Gekuerzte Routen werden sichtbar markiert; die gekuerzte Laenge und der zugrunde liegende GPX-km-Bereich werden angezeigt.
- Kuerzungen werden idempotent aus der unveraenderten Original-GPX-Geometrie abgeleitet; nachtraegliche Korrekturen kuerzen nicht erneut die bereits gekuerzte Arbeitsroute.
- `Kuerzung zuruecksetzen` stellt die vollstaendige Original-GPX-Route wieder her.
- Startort-Vorschau ist vorbereitet: lokaler Ort wird auf den naechsten Punkt der Original-GPX-Route projiziert und muss vor dem Kuerzen uebernommen werden.
- Grosse Startkuerzungen wie 300 km bleiben stabil, wenn das End-km-Feld durch die Anzeige auf eine Nachkommastelle gerundet ist.
- Karte und Höhenprofil sind im Planer umschaltbar; die Etappenbearbeitung wird nicht mehr dauerhaft durch das Höhenprofil in eine schmale Spalte gedrueckt.
- Manuell geaenderte Etappen werden als `Geometrie aktualisiert` markiert und nach dem Speichern als `Gespeichert`.
- Exportstand ist dokumentiert: GPX exportiert die bearbeitete Routengeometrie; vollstaendige Etappenmetadaten bleiben in der gespeicherten Tour und werden noch nicht in GPX geschrieben.
- Tests decken ungueltige km-Bereiche, ausserhalb der Route liegende Grenzen, manuelle Geometrie-Neuberechnung und einen JSON-Save/Load-nahen Roundtrip der `geometryGeoJson` ab.

## Deployment-Struktur

- Arbeitsbranches bleiben vollstaendige Entwicklungsstaende mit Quellcode, Tests, Doku und Buildlogik.
- `public` soll nur oeffentlich auslieferbare Webroot-/Asset-/Proxy-Dateien enthalten.
- `private` soll die serverseitige Next.js-Anwendung mit API, Prisma, Redis-/Worker-Anbindung und Beispielkonfiguration enthalten.
- Die aktuelle App ist nicht als rein statischer Export geeignet; empfohlen ist Next.js-Serverbetrieb im privaten Bereich mit oeffentlichem Webroot/Reverse Proxy.
- Lokale Artefakte werden mit `npm run artifact:public` und `npm run artifact:private` unter `artifacts/` erzeugt und mit den zugehoerigen Check-Skripten geprueft.
- Der Branch `public` entspricht dem oeffentlichen Zielordner; der Branch `private` entspricht dem privaten/serverseitigen Zielordner.
- Nach dem Push der Deployment-Branches bleibt ein manueller Server- oder Raspberry-Pi-Deploytest erforderlich.

## RPi-Startrobustheit

- `scripts/start-production.sh` wartet vor Prisma auf Postgres.
- `worker` wartet vor BullMQ-Start auf Redis.
- `scripts/rpi-install.sh` und `scripts/rpi-update.sh` pruefen App- und Worker-Health und geben bei Fehlern relevante Logs aus.
- PR #40 wurde auf dem Raspberry Pi mit hartem Neustarttest erfolgreich abgenommen: `docker compose down --remove-orphans`, `docker network prune -f`, `docker compose up -d --build`, danach `postgres`, `redis`, `app` und `worker` healthy.
- Der Healthcheck `/api/health` meldete `{"status":"ok","service":"radtour-planer","timestamp":"2026-06-20T22:14:48.092Z"}`.

## Naechste fachliche Arbeit

- #29 ist fachlich abgenommen und integriert.
- Naechste fachliche Erweiterungen bleiben ausserhalb dieses Stands: Hotelbuchung, Nutzerkonten, produktive POI-Massenabfrage, neue Routing-API und Aenderungen am public/private-Konzept.
