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
- Eine vorhandene Tour wird erst ersetzt, nachdem der neue Provideraufruf erfolgreich abgeschlossen wurde.
- Lange Routen werden sequenziell an expliziten Zwischenpunkten oder an Punkten einer zuvor von BRouter berechneten Korridorlinie geroutet. Frei interpolierte Luftlinienpunkte sind keine zulässigen internen Zwischenziele.
- Die fünf sichtbaren Routingprofile müssen unterschiedliche Providerprofile oder dokumentierte `profile:*`-Parameter verwenden.
- Öffentliche BRouter-Dienste sind nur für MVP/Test vorgesehen; Produktion braucht eine gesonderte Betriebsentscheidung.
- Die Übertragung von Routenkoordinaten und die OSM-Attribution sind in Datenschutz- und Betriebsprüfung einzubeziehen.

## ADR-010: Intelligence als unabhängige deterministische Rechenkerne

Entscheidung: Neue Intelligence-Funktionen werden als versionierte, reine Rechenkerne innerhalb des modularen Monolithen implementiert. Der produktive Energie-Core `biketriphub-energy-v2` und der Lade-Core `biketriphub-charging-v1` bleiben bis zu einer gesonderten Freigabe die Referenz.

Begründung:

- Unterstützungs-, Telemetrie-, Kalibrierungs- und Optimierungslogik haben unterschiedliche Änderungs- und Validierungszyklen.
- Unabhängige Kerne lassen sich mit identischen Eingaben reproduzierbar testen und einzeln deaktivieren.
- Eine schrittweise Erweiterung schützt den geprüften Tourenplaner vor experimentellen Seiteneffekten.

Konsequenz:

- Core-Module haben keine Abhängigkeit von UI, Browser-Speicher, Datenbank, Netzwerk, Systemzeit oder Zufall.
- Ein versioniertes, normalisiertes Szenario ist die gemeinsame Eingabegrenze.
- Ergebnisse enthalten Modellversion, Eingabe-Hash, Qualität und Annahmen.
- Die Orchestrierung verbindet Module, dupliziert aber keine Fachformeln.

## ADR-011: Experimentelle Ergebnisse nur über Shadow Mode und explizite Freigabe

Entscheidung: Ein experimentelles Modell darf produktive Ergebnisse nur vergleichen, nicht automatisch ersetzen. Sichtbare Aktivierungen werden standardmäßig deaktiviert und über versionierte Feature Flags gesteuert.

Begründung:

- Reale Reichweiten- und Belastungsmodelle benötigen längere Validierung gegen unterschiedliche Fahrten und Profile.
- Ein guter Durchschnittswert kann kritische Reservefehler verdecken.
- Benutzerprofile und TourState dürfen sich nicht durch eine Simulation selbst verändern.

Konsequenz:

- Shadow Mode verwendet für Produktiv- und Experimentmodell dasselbe normalisierte Szenario.
- Kalibrierung erzeugt nur bestätigungspflichtige Kandidaten.
- Ein Produktivwechsel benötigt Regressionstests, einen eigenen ADR, Raspberry-Pi- und fachliche Abnahme sowie ausdrückliche Merge-Freigabe.
- Unbekannte, fehlende oder ungültige Flags gelten als deaktiviert.

## ADR-012: Quellen- und Qualitätsnachweis für Intelligence-Daten

Entscheidung: Importierte, gemessene und abgeleitete Intelligence-Werte führen Quelle und Datenqualität mit. Fehlende Werte bleiben unbekannt und werden nicht geschätzt, sofern das konkrete Modell keine sichtbar dokumentierte Schätzung vorsieht.

Begründung:

- Herstellerdaten, App-Exporte, Bilder und Telemetrie besitzen unterschiedliche Belastbarkeit.
- Erklärbare Empfehlungen benötigen die Trennung von Messwert, Benutzereingabe und Ableitung.
- Standort- und Leistungsdaten erfordern transparente lokale Verarbeitung und Zweckbindung.

Konsequenz:

- OCR aus Bildern erzeugt nur bestätigungspflichtige Importkandidaten.
- Rohtelemetrie bleibt unverändert; Normalisierung und Glättung sind versionierte Transformationen.
- Geringe oder unvollständige Qualität senkt die Prognosequalität statt Genauigkeit vorzutäuschen.
- Externe Übertragung oder Serverpersistenz benötigt eine gesonderte Datenschutz- und Betriebsentscheidung.

## ADR-013: Streckenbeschaffenheit zunächst additiv analysieren

Entscheidung: Das versionierte Modell `biketriphub-route-condition-v1` wertet Höhenprofil, Oberfläche, Wegtyp, Qualität und Warnungen als separaten reinen Core aus. Seine Fahrwiderstandsfaktoren verändern in Paket 22 keine bestehende Energie-, Lade-, Unterstützungs-, Fahrstrategie- oder Zeitberechnung.

Begründung:

- GPX, BRouter-Höhenwerte und BRouter-`WayTags` besitzen unterschiedliche Abdeckung und Qualität.
- Eine sofortige produktive Kopplung würde bestehende Ergebnisse unbemerkt verändern.
- Ein additiver Snapshot ermöglicht Alt/Neu-Vergleiche und eine eigenständige fachliche Abnahme.

Konsequenz:

- Unbekannte Oberfläche und fehlende Höhe bleiben unbekannt; es werden keine scheinpräzisen Werte erfunden.
- Rohhöhe und geglättete Auswertung werden getrennt gespeichert.
- Neue produktive Faktoren benötigen eine neue Modellversion, Vergleichstests, eigenen Auftrag und ausdrückliche Freigabe.
- BRouter-`WayTags` werden nur aus dem vorhandenen Routing-Ergebnis übernommen; Paket 22 führt keine neue Live-Abfrage ein.
