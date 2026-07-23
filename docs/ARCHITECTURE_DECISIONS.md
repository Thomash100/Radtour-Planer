# Architekturentscheidungen

Dieses Dokument haelt verbindliche Architekturleitplanken fuer den Radtour-Planer fest.

## ADR-001: Modularer Monolith

Entscheidung: Das Projekt bleibt vorerst ein modularer Monolith auf Basis von Next.js.

Begruendung:

- Das MVP braucht schnelle, konsistente Produktentwicklung.
- Karte, Route, Etappen, POI und Reiseplan haengen fachlich eng zusammen.
- Microservices wuerden Deployment, Datenkonsistenz und Betrieb zu frueh verkomplizieren.

Konsequenz:

- Neue Funktionen werden als Feature-Slices umgesetzt.
- Separates Backend oder Microservices nur mit dokumentierter Notwendigkeit.

## ADR-002: Gemeinsame Routengrundlage

Entscheidung: Karte, Eingabe, Etappen und Hoehenprofil muessen dieselbe Routengrundlage verwenden.

Begruendung:

- Unterschiedliche Zustandsquellen fuehren zu springenden Karten, falschen Etappen und unklarer GPX-Bearbeitung.
- GPX-Import und manuelle Planung muessen dieselbe Logik nutzen.

Konsequenz:

- Keine parallelen Demo- oder Fallback-Routen ohne sichtbare Kennzeichnung.
- Keine versteckte Salzburg-Muenchen-Vorbelegung nach GPX-Import.

## ADR-003: Keine Luftlinie als echte Route

Entscheidung: Eine Luftlinie darf nicht als echte Fahrradroute dargestellt werden.

Begruendung:

- Nutzer wuerden Entfernung, Etappen und POI falsch interpretieren.

Konsequenz:

- Mockrouting muss als Mock erkennbar bleiben.
- Echte Routingeinbindung erfolgt spaeter ueber eine RoutingProvider-Struktur.

## ADR-004: MapLibre und OSM-Attribution

Entscheidung: Kartenanzeige erfolgt mit MapLibre GL JS und OSM-basierten Tiles.

Begruendung:

- MapLibre ist offen und produktneutral.
- OSM eignet sich als Basis fuer MVP und spaetere eigene Datenhaltung.

Konsequenz:

- Attribution bleibt sichtbar.
- Fremde Kartendaten werden nicht ohne Lizenzpruefung uebernommen.

## ADR-005: POI-Daten nicht dauerhaft ueber oeffentliche APIs

Entscheidung: Oeffentliche Overpass-/Nominatim-Dienste duerfen nicht als dauerhaftes Produktionsbackend verwendet werden.

Begruendung:

- Oeffentliche Dienste sind nicht fuer produktive Dauerlast gedacht.
- Datenqualitaet, Rate Limits und Verfuegbarkeit waeren unkontrolliert.

Konsequenz:

- MVP nutzt lokale Seed-/Cache-Daten.
- Produktion braucht Caching, eigene Datenbank, OSM-Extrakte oder kommerzielle Provider.

## ADR-006: Redis lazy initialisieren

Entscheidung: Redis/BullMQ darf beim Build nicht automatisch verbinden.

Begruendung:

- `next build` muss ohne laufenden Redis-Container funktionieren.
- Hintergrundjobs sollen erst bei Queue-Nutzung initialisiert werden.

Konsequenz:

- Queue-Code muss lazy bleiben.
- Redis-Connection-Errors im Build sind nicht akzeptabel.

## ADR-007: Docker Compose als Betriebsbasis

Entscheidung: Lokale Entwicklung, Raspberry-Pi-Test und Webserver-Deployment nutzen Docker Compose.

Begruendung:

- PostgreSQL/PostGIS, Redis, App und Worker muessen reproduzierbar zusammen laufen.
- Raspberry-Pi-Tests brauchen eindeutig identifizierbare Staende.

Konsequenz:

- Deployment-Aenderungen muessen README oder Deployment-Doku aktualisieren.
- Version und Build-Kennung muessen in Teststaenden sichtbar bleiben.

## ADR-008: Codex-Abschnitte als PRs

Entscheidung: Jeder Codex-Abschnitt wird auf einem eigenen Branch und per PR dokumentiert.

Begruendung:

- Die Roadmap enthaelt viele fachlich verwandte Themen.
- Ohne klare Abschnitte wird die App unuebersichtlich und schwer pruefbar.

Konsequenz:

- Kein unklarer Zwischenstand.
- PRs enthalten Tests, Build-Ergebnis, manuelle Pruefpunkte und offene Risiken.

## ADR-009: Reale Direktplanung über RoutingProvider

Entscheidung: Die direkte Routenplanung verwendet standardmäßig BRouter auf Basis von OpenStreetMap. Der Provider bleibt über Umgebungsvariablen austauschbar.

Begruendung:

- Start, Ziel und Zwischenziele dürfen nicht als Luftlinie oder künstlich gekrümmte Testlinie dargestellt werden.
- BRouter unterstützt Fahrradrouting und liefert eine echte Wegegeometrie ohne neue Datenbankstruktur.
- Eine Provider-Grenze ermöglicht später eine eigene BRouter-Instanz oder einen vertraglich geeigneten Dienst.

Konsequenz:

- Routingfehler führen zu einer sichtbaren Fehlermeldung, nie zu einem stillen Luftlinien-Fallback.
- Lange Routen werden sequenziell an Zwischenpunkten berechnet, um einzelne Provideranfragen begrenzt zu halten.
- Öffentliche BRouter-Dienste sind nur für MVP/Test vorgesehen; Produktion braucht eine gesonderte Betriebsentscheidung.
- Die Übertragung von Routenkoordinaten und die OSM-Attribution sind in Datenschutz- und Betriebsprüfung einzubeziehen.
