# Chat-Zusammenfuehrung Radtour-Planer

Stand: 2026-06-02

## Hinweis zur Herkunft

Diese Zusammenfassung fuehrt die verfuegbaren Projektkontexte zum Thema Radtour-Planer zusammen. Sie ersetzt keine vollstaendige Rohdaten-Archivierung aller Chatverlaeufe, sondern dient als konsolidierter Arbeitsstand fuer diesen Projektchat.

## Projektidee

Arbeitstitel: `RadreisePlaner` / `BikeTripHub`

Ziel ist eine Reisevorbereitungs-Plattform fuer individuelle mehrtaegige Radtouren. Die Anwendung soll Routenplanung, Etappenplanung, GPX-Import/-Export, POI-Suche, Partnerbetriebe, Buchungs-/Anfrageprozesse und spaeter Monetarisierung ueber Leads, Buchungen und Werbung zusammenfuehren.

## Kernfunktionen

- Start/Ziel/Zwischenziele fuer Routenplanung
- mehrtaegige Etappenplanung
- GPX-Import und GPX-Export
- Kartenanzeige der Route
- POI entlang der Route
- Unterkuenfte, Gepaecktransfer, Fahrradservice, Restaurants, Supermaerkte, Trinkwasser, Sehenswuerdigkeiten
- Partnerregistrierung
- Admin-Freigabe fuer Partner
- Lead-Anfragen an Partnerbetriebe
- spaeter echte Routing-, Geocoding- und OSM-/Overpass-Daten

## Technischer Stand

Repository: `Thomash100/Radtour-Planer`

- GitHub-Repo ist oeffentlich.
- Default-Branch ist `main`.
- Schreibrechte sind vorhanden.
- Raspberry-Pi-Deployment ist eingerichtet.
- App ist lokal unter `http://raspberrypi.local:3000` erreichbar.
- Docker-Stack umfasst App, Worker, PostgreSQL/PostGIS und Redis.
- Ein frueherer Startfehler durch ein altes Postgres-Volume mit abweichendem Passwort wurde durch Neuinitialisierung geloest.

## Wichtige GitHub-Staende

### PR #4

Titel: `Dokumentiere Entwicklungsplan fuer Radtour-Planer`

Inhalt:

- `docs/DEVELOPMENT_PLAN.md`
- Entwicklungsphasen von Stabilisierung bis CI/CD
- Meilensteine M0 bis M5
- Regel `GitHub zuerst`
- Codex-Hinweis mit Projektzusammenfassung nach Abschluss

### Issue #3

Titel: `Codex: Stabilisierung MVP und Raspberry-Pi-Betrieb`

Inhalt:

- Raspberry-Pi-Betrieb absichern
- Postgres/Redis nicht offen ins LAN veroeffentlichen
- Seed-Daten nur optional ausfuehren
- Partnerregistrierung so erweitern, dass ein sichtbarer POI entsteht
- Healthcheck fuer App, Datenbank und Redis verbessern
- Projektzusammenfassung nach Abschluss ergaenzen

### Issue #5

Titel: `Codex: Kartenanzeige der Route reparieren und Demo-Visualisierung erweitern`

Inhalt:

- Fehler bei Kartenanzeige der Route beheben
- Route nach `Route planen` sichtbar darstellen
- Route nach GPX-Import sichtbar darstellen
- Race-Condition zwischen MapLibre-Initialisierung, Load-Event und `setData` pruefen
- mehr Demo-Routen ergaenzen
- mehr POIs fuer Visualisierung ergaenzen
- Start-/Zielmarker und Zwischenzielmarker pruefen
- bessere Statusmeldungen bei keinen POI-Treffern

## Arbeitsregel

Alle Aktualisierungen am Projekt sollen auf GitHub nachvollziehbar hochgeladen werden.

- Codeaenderungen als Branch/Commit/PR
- Dokumentationsaenderungen ebenfalls als Commit/PR
- neue Codex-Aufgaben als GitHub-Issue
- nach Abschluss einer Aufgabe Projektzusammenfassung ergaenzen

## Bekannte Probleme und offene Punkte

### Kartenanzeige

Die Route wird in der aktuellen MVP-Phase nicht zuverlaessig auf der Karte angezeigt. Zu pruefen sind MapLibre-Initialisierung, Layer/Source-Ladezeitpunkt und Aktualisierung der GeoJSON-Daten.

### Demo-Daten

Es werden mehr POIs und Routendaten benoetigt, damit die Visualisierung sinnvoll pruefbar ist. Besonders benoetigt werden Demo-Routen mit mehreren Etappen sowie POIs im Routenkorridor.

### Partner/POI-Verknuepfung

Die Partnerregistrierung speichert aktuell den Partnerdatensatz, soll aber auch einen zugehoerigen sichtbaren POI erzeugen oder aktualisieren.

### Deployment

Postgres und Redis sollen nicht unnoetig ins LAN veroeffentlicht werden. Seed-Daten sollen nicht bei jedem Start automatisch ausgefuehrt werden.

## Abgrenzung

Das Projekt `Projektverwaltung_WTF` wurde separat betrachtet. Dort war der `Radtour-Planer` zeitweise als Git-Submodule eingebunden. Der Radtour-Planer bleibt ein eigenstaendiges Repository. Die Projektverwaltungs-App ist nicht der Hauptentwicklungsort fuer den Radtour-Planer.

## Naechste empfohlene Reihenfolge

1. PR #4 pruefen und mergen, damit der Entwicklungsplan im `main` liegt.
2. Issue #3 als Stabilitaetsaufgabe durch Codex bearbeiten lassen.
3. Issue #5 als Karten-/Visualisierungsaufgabe durch Codex bearbeiten lassen.
4. Nach jedem abgeschlossenen Issue Projektzusammenfassung in GitHub ergaenzen.
5. Danach echte Routing-/Geocoding-/OSM-Daten planen.

## Projektzusammenfassung

Der Radtour-Planer ist aktuell ein lauffaehiger MVP-Prototyp auf dem Raspberry Pi. Der Fokus liegt nun nicht auf komplett neuen Funktionen, sondern auf Stabilisierung, belastbarer Kartenanzeige, besseren Demo-Daten und sauberer GitHub-gefuehrter Aufgabensteuerung.
