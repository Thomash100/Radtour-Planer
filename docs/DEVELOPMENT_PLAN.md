# Entwicklungsplan Radtour-Planer

## Zielbild

Der Radtour-Planer soll schrittweise vom aktuellen MVP-Prototyp zu einer stabil nutzbaren Web-App auf dem Raspberry Pi entwickelt werden. Der aktuelle Stand laeuft grundsaetzlich unter `http://raspberrypi.local:3000` und nutzt Docker mit App, Worker, PostgreSQL/PostGIS und Redis.

Die Anwendung soll perspektivisch folgende Kernfunktionen stabil abdecken:

- Routenplanung mit Start, Ziel und Zwischenzielen
- GPX-Import und GPX-Export
- Etappenplanung fuer mehrtaegige Radtouren
- POI-Suche entlang der Route
- Partnerregistrierung und Admin-Freigabe
- Lead-Anfragen an Partnerbetriebe
- spaeter echte Routing-, Geocoding- und OSM-Daten

## Arbeitsregel: GitHub zuerst

Alle Aenderungen und Aktualisierungen am Projekt sollen grundsaetzlich auf GitHub nachvollziehbar abgelegt werden.

- Keine Projektanpassung nur lokal oder nur im Chat belassen, wenn sie den Code, die Dokumentation oder Aufgabenplanung betrifft.
- Aenderungen erfolgen bevorzugt ueber eigenen Branch und Pull Request.
- Kleine Sofortkorrekturen koennen direkt committed werden, wenn dies ausdruecklich gewuenscht ist.
- Neue Aufgaben fuer Codex werden als GitHub-Issue formuliert.
- Nach Abschluss einer Aufgabe wird eine kurze Projektzusammenfassung ergaenzt.

## Phase 1: Basis stabilisieren

Ziel: Die Anwendung muss zuverlaessig starten, aktualisierbar sein und nach Neustart sauber laufen.

| Prioritaet | Aufgabe | Ergebnis |
|---|---|---|
| Hoch | Raspberry-Pi-Deployment finalisieren | Installation, Update und Neustart laufen reproduzierbar |
| Hoch | Deployment-Branch nach `main` uebernehmen | Kein Sonderweg ueber lokalen PR-Branch mehr |
| Hoch | Docker-Compose absichern | Nur App-Port 3000 nach aussen, Postgres/Redis nicht offen ins LAN |
| Hoch | Seed-Verhalten aendern | Demo-Daten nur optional einspielen, nicht bei jedem Start |
| Mittel | Healthcheck erweitern | `/api/health` prueft App, Datenbank und Redis |
| Mittel | Update-Script robuster machen | Backup-Hinweis, Pull, Build, Restart und Statusausgabe |

## Phase 2: Fehlerbereinigung MVP

Ziel: Alle vorhandenen Oberflaechenfunktionen muessen ohne offensichtliche Fehlermeldungen funktionieren.

| Prioritaet | Aufgabe | Ergebnis |
|---|---|---|
| Hoch | Startseite testen | Links `/planer`, `/partner`, `/preise`, `/admin/partner` funktionieren |
| Hoch | Planer testen | Route planen, speichern, Etappen erzeugen, POI laden |
| Hoch | GPX-Import testen | Upload erzeugt Route, Etappen und Kartenanzeige |
| Hoch | Partnerregistrierung korrigieren | Neuer Partner erzeugt nach Freigabe auch einen POI |
| Mittel | Admin-Freigabe testen | Partnerstatus kann freigegeben oder abgelehnt werden |
| Mittel | Lead-Anfrage testen | Anfrage an Partner wird gespeichert und im Admin sichtbar |
| Mittel | Fehlertexte verbessern | Nutzer sieht verstaendliche Meldungen statt technischer API-Fehler |

## Phase 3: Datenmodell und Fachlogik schaerfen

Ziel: Das Datenmodell soll zur spaeteren echten Nutzung passen.

| Prioritaet | Aufgabe | Ergebnis |
|---|---|---|
| Hoch | Partner und POI sauber verbinden | Jeder sichtbare Partner besitzt mindestens einen POI |
| Hoch | Lead-Modell erweitern | Status, Kontaktverlauf, Notizen und Bearbeiter |
| Mittel | Route und Etappe fachlich verbessern | Etappenlaenge, Start/Ziel, Zwischenziele und Tagesplanung |
| Mittel | POI-Kategorien pruefen | Unterkunft, Gepaecktransfer, Werkstatt, Verpflegung und Sehenswuerdigkeiten |
| Mittel | Werbung/Sponsoring sauber trennen | Gesponserte Eintraege klar markiert |
| Niedrig | Mehrbenutzerfaehigkeit vorbereiten | Nutzer, Partner und Admin rollenbasiert trennen |

## Phase 4: Echte Routing- und Kartendaten integrieren

Ziel: Die App soll nicht mehr nur mit Mock-Daten arbeiten.

| Prioritaet | Aufgabe | Ergebnis |
|---|---|---|
| Hoch | Mock-Routing ersetzen | Echte Routenberechnung ueber Routingdienst |
| Hoch | Geocoding integrieren | Orte werden real in Koordinaten umgewandelt |
| Hoch | GPX-Auswertung verbessern | Hoehenprofil, Distanz, Start und Ziel belastbarer |
| Mittel | OSM-POI-Import | POI entlang einer Route automatisch suchen |
| Mittel | Routenkorridor verbessern | Distanzberechnung und POI-Filter zuverlaessiger |
| Niedrig | Offline-/Cache-Konzept | Haeufige Routen und POI lokal puffern |

## Phase 5: Benutzeroberflaeche und Bedienbarkeit

Ziel: Die Anwendung soll fuer reale Nutzung verstaendlich und robust wirken.

| Prioritaet | Aufgabe | Ergebnis |
|---|---|---|
| Hoch | Mobile Ansicht pruefen | Planer auf Handy und Tablet nutzbar |
| Hoch | Statusmeldungen vereinheitlichen | Klare Hinweise bei Planung, Fehlern und Speicherung |
| Mittel | Ladezustaende verbessern | Spinner und deaktivierte Buttons bei API-Aufrufen |
| Mittel | Formularvalidierung sichtbarer machen | Pflichtfelder und falsche Eingaben direkt erkennbar |
| Mittel | Kartenbedienung verbessern | Marker, Layer, POI-Auswahl und Zoom |
| Niedrig | Design vereinheitlichen | Begriffe, Farben, Abstaende und Texte konsistent |

## Phase 6: Betrieb, Sicherheit und Datenschutz

Ziel: Betrieb auf dem Raspberry Pi soll wartbar und vertretbar sicher sein.

| Prioritaet | Aufgabe | Ergebnis |
|---|---|---|
| Hoch | `.env` sauber dokumentieren | Keine Standardpasswoerter im echten Betrieb |
| Hoch | Datenbank-Backup einrichten | Wiederherstellung nach Fehler moeglich |
| Hoch | Ports absichern | Nur App erreichbar, DB/Redis intern |
| Mittel | Datenschutzseite erstellen | Zweck, Datenarten, Speicherung und Kontakt |
| Mittel | Impressum vorbereiten | Fuer oeffentliche Bereitstellung erforderlich |
| Mittel | Nutzungsbedingungen ergaenzen | Test-/Beta-Hinweis, Haftung und Verfuegbarkeit |
| Niedrig | HTTPS/Reverse Proxy | Spaeter fuer oeffentliche Nutzung noetig |

## Phase 7: Qualitaetssicherung und CI/CD

Ziel: Aenderungen sollen nicht mehr zufaellig Fehler erzeugen.

| Prioritaet | Aufgabe | Ergebnis |
|---|---|---|
| Hoch | Build-Test einrichten | `npm run build` muss vor Merge erfolgreich sein |
| Hoch | Lint/Test-Workflow in GitHub Actions | Automatische Pruefung bei Push und PR |
| Mittel | API-Smoke-Tests | Health, Route, Partner, POI und Leads pruefen |
| Mittel | Docker-Build-Test | Raspberry-Pi-Image wird geprueft |
| Niedrig | Release-Notizen | Jede Version mit Aenderungen und Updatehinweisen |

## Empfohlene Reihenfolge

### Schritt 1: Stabilitaets-Patch

1. `docker-compose.rpi.yml` absichern.
2. `scripts/start-production.sh` so anpassen, dass Seed-Daten optional sind.
3. `.env.rpi.example` um `SEED_DEMO_DATA=true` erweitern.
4. `README.md` und `docs/RPI_DEPLOYMENT.md` aktualisieren.
5. Build und Raspberry-Pi-Start pruefen.

### Schritt 2: Partner-POI-Fehler beheben

1. Bei Partnerregistrierung automatisch POI anlegen oder aktualisieren.
2. Bei Admin-Freigabe POI sichtbar machen.
3. POI-Kategorie aus Partnerkategorie ableiten.
4. Test: Partner anlegen, freigeben, Route planen, POI sichtbar.

### Schritt 3: MVP-Funktionstest

Folgende Routen und Endpunkte pruefen:

- `/`
- `/planer`
- `/partner`
- `/admin/partner`
- `/preise`
- `/api/health`
- `/api/routes`
- `/api/admin/partners`

### Schritt 4: Echte Datenanbindung

1. Routingdienst auswaehlen.
2. Geocoding integrieren.
3. OSM-POI-Suche oder Overpass-Integration ergaenzen.
4. Mock-Routing als Fallback behalten.

## Meilensteine

| Meilenstein | Inhalt | Zielzustand |
|---|---|---|
| M0 | Raspberry Pi laeuft stabil | App erreichbar, Neustart sicher |
| M1 | MVP fehlerarm | Planer, Partner, Admin und Leads funktionieren |
| M2 | Datenmodell bereinigt | Partner, POI und Leads logisch verbunden |
| M3 | Reale Routen | Routing und Geocoding nicht mehr nur Mock |
| M4 | Nutzbare Beta | Datenschutz, Impressum, Backup und Updateprozess |
| M5 | Oeffentliche Testversion | Stabiler Betrieb mit echten Testnutzern |

## Codex-Hinweis

Neue Codex-Aufgaben sollen jeweils klein genug sein, um in einem Pull Request abgeschlossen und getestet zu werden. Nach Abschluss jeder Codex-Aufgabe ist eine kurze Projektzusammenfassung zu ergaenzen, bestehend aus:

- umgesetzten Aenderungen
- betroffenen Dateien
- ausgefuehrten Tests
- offenen Punkten
