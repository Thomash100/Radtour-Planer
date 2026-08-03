# Raspberry Pi Testinstallation und Update

Diese Anleitung ist fuer eine lokale Testversion auf einem Raspberry Pi gedacht. Sie nutzt Docker Compose mit PostgreSQL/PostGIS, Redis, App und Worker.

## Ziel fuer v0.3.0

Der Raspberry-Pi-Test muss eindeutig zeigen, welcher Stand installiert ist. Pruefe nach dem Start in der Weboberflaeche:

- `Version 0.3.0`
- `Build: 2026-06-03` oder den per `NEXT_PUBLIC_BUILD_DATE` gesetzten Build-Wert

Vor einem Merge nach `main` muessen diese Punkte erfolgreich dokumentiert sein:

- `npm run lint`
- `npm run typecheck` oder `tsc --noEmit`
- `npm run build`
- `docker compose -f docker-compose.rpi.yml build`
- Raspberry-Pi-Smoke-Test

## 1. Raspberry Pi vorbereiten

Auf dem Raspberry Pi:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Danach einmal abmelden und wieder anmelden oder den Raspberry Pi neu starten, damit die Docker-Gruppe aktiv wird.

## 2. Projekt aktualisieren oder klonen

Bestehende Installation:

```bash
cd Radtour-Planer
git fetch --all --prune
git pull --ff-only
```

Neue Testinstallation:

```bash
git clone https://github.com/Thomash100/Radtour-Planer.git
cd Radtour-Planer
```

Wenn der echte Deployment-Branch getestet werden soll:

```bash
git clone --branch private https://github.com/Thomash100/Radtour-Planer.git Radtour-Planer
cd Radtour-Planer
```

Der Branch `public` wird fuer den Raspberry-Pi-Test nicht benoetigt, weil die App aus dem privaten Next.js-/Docker-Bereich laeuft.

Falls ein Testbranch oder PR-Branch geprueft wird:

```bash
git fetch origin
git checkout <branch-name>
git pull --ff-only
```

## 3. Umgebung konfigurieren

```bash
cp .env.rpi.example .env
```

In `.env` mindestens das Passwort und die App-URL anpassen:

```env
POSTGRES_PASSWORD=dein-sicheres-testpasswort
NEXT_PUBLIC_APP_URL=http://<rpi-ip>:3000
NEXT_PUBLIC_BUILD_DATE=2026-06-03
```

Wenn du nur direkt auf dem Raspberry Pi testest, geht auch:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Unterkunftsdaten fuer die Abnahme

Die in `.env.rpi.example` dokumentierten `ACCOMMODATION_*`-Werte werden an den App-Container weitergereicht. Fuer eine reproduzierbare Raspberry-Pi-Abnahme mit klar gekennzeichneten Testdaten:

```env
ACCOMMODATION_PROVIDER=local-test
ACCOMMODATION_API_URL=
ACCOMMODATION_TIMEOUT_MS=4000
ACCOMMODATION_CACHE_TTL_MS=900000
```

`local-test` ist ausschliesslich fuer Entwicklung und Abnahme vorgesehen. Fuer einen produktiven Provider muss `ACCOMMODATION_PROVIDER=production` zusammen mit einer geeigneten `ACCOMMODATION_API_URL` konfiguriert werden. Ohne Endpunkt bleiben externe Unterkunftsdaten deaktiviert; eine oeffentliche Overpass-Instanz wird nicht automatisch verwendet.

Nach dem Containerstart kann die Weitergabe geprueft werden:

```bash
docker compose -f docker-compose.rpi.yml exec -T app printenv | grep '^ACCOMMODATION_'
```

Die IP fuer den Aufruf aus dem Heimnetz bekommst du mit:

```bash
hostname -I
```

## 4. Installation starten

Empfohlen:

```bash
chmod +x scripts/rpi-install.sh scripts/rpi-update.sh
./scripts/rpi-install.sh
```

Alternativ manuell:

```bash
docker compose -f docker-compose.rpi.yml down
docker compose -f docker-compose.rpi.yml build --no-cache
docker compose -f docker-compose.rpi.yml up -d
```

### Gepruefte Startreihenfolge

Der Containerstart ist auf folgende Reihenfolge ausgelegt:

1. `postgres` startet und meldet `pg_isready` healthy.
2. `redis` startet und meldet `redis-cli ping` healthy.
3. `app` startet erst nach healthy Postgres/Redis und wartet zusaetzlich im Startscript auf Postgres.
4. `app` fuehrt `prisma db push` und `prisma db seed` aus.
5. `app` startet Next.js im Produktionsmodus.
6. `worker` startet erst nach healthy Postgres/Redis und wartet zusaetzlich auf Redis.
7. `app` und `worker` muessen im Compose-Status healthy werden.

Harter Neustarttest fuer Raspberry Pi:

```bash
docker compose -f docker-compose.rpi.yml down --remove-orphans
docker network prune -f
docker compose -f docker-compose.rpi.yml up -d
docker compose -f docker-compose.rpi.yml ps
curl -fsS http://localhost:3000/api/health
```

Erwartung: Der Stack wird ohne manuelles Nachstarten vollstaendig healthy. Bei Fehlern geben `rpi-install.sh` und `rpi-update.sh` App-, Worker-, Redis- und Postgres-Logs aus.

## 5. Abhaengigkeiten optional lokal pruefen

Wenn Node.js/npm auf dem Raspberry Pi direkt verfuegbar sind:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

Wenn kein lokaler Node-Test gemacht wird, muss mindestens der Docker-Build erfolgreich laufen.

## 6. App pruefen

Status:

```bash
docker compose -f docker-compose.rpi.yml ps
```

Logs:

```bash
docker compose -f docker-compose.rpi.yml logs -f app
docker compose -f docker-compose.rpi.yml logs -f worker
docker compose -f docker-compose.rpi.yml logs -f postgres redis
```

Healthcheck:

```bash
curl -fsS http://localhost:3000/api/health
```

Erwartung: HTTP 200 und eine JSON-Antwort mit gesundem Status.

App im Browser:

```text
http://localhost:3000
http://<rpi-ip>:3000
http://raspberrypi.local:3000
```

Pruefpunkte:

- Startseite zeigt `Version 0.3.0` und `Build: 2026-06-03`
- `/` Startseite
- `/planer` Route planen
- `/partner` Partnerprofil anlegen
- `/partner/dashboard` Partner-Dashboard
- `/admin/partner` Partner freischalten
- `/dashboard/routen` gespeicherte Routen
- `/api/health` technischer Healthcheck
- `/planer` laedt ohne Konsolenfehler
- Route mit Start, Ziel und mindestens einem Zwischenziel berechnen
- vorhandene gespeicherte Tour oeffnen, einen BRouter-Fehler provozieren und pruefen, dass Route, Etappen, POI und Unterkuenfte erhalten bleiben
- die Profile `ausgewogen`, `wenig Steigung`, `Fahrradwege bevorzugen`, `Radwanderwege bevorzugen` und `sportlich` mit derselben Strecke vergleichen
- Flensburg nach Swinemuende sowie Hamburg nach Dresden ohne Luftlinien-Hilfspunkte pruefen
- 20 Zwischenziele anlegen und pruefen, dass das 21. mit verstaendlichem Hinweis verhindert wird
- Start-, Ziel- und Zwischenzielmarker sind auf der Karte sichtbar
- Etappenlinien sind farbig unterscheidbar
- im Schritt `Etappen erzeugen` auf `Nach Schwierigkeit` wechseln, ein Zielniveau wählen und `Nach Schwierigkeit planen` auslösen; die Bestätigung zum Ersetzen der vorhandenen Etappen muss unmittelbar sichtbar und bedienbar sein
- Kartenresize funktioniert nach Seitenleisten-/Viewport-Aenderungen
- Demo-Route laesst sich anzeigen
- GPX-Import mit `trkpt`, `rtept` oder `wpt` testen
- GPX-Name und Hoehenprofil werden uebernommen, soweit in der Datei vorhanden
- POI und Marker entlang der Route werden angezeigt
- POI-Filter fuer Unterkunft, Gepaeck, Werkstatt, Restaurant und Zusatzfilter testen
- mit `ACCOMMODATION_PROVIDER=local-test` erscheint die klar markierte lokale Test-Pension; Vormerken, Uebernachtung, Save/Load und Kartenmarker pruefen
- Unterkunfts- oder Gepaecktransfer-Anfrage senden
- `/admin/partner` oeffnen und Partnerstatus pruefen

## 7. Ergebnis dokumentieren

Im PR-Kommentar oder Issue folgende Daten erfassen:

- Commit-Hash
- Branch oder PR
- Raspberry-Pi-Modell und OS-Version
- Ergebnis `npm run lint`
- Ergebnis `npm run typecheck`
- Ergebnis `npm run build`
- Ergebnis `docker compose -f docker-compose.rpi.yml build`
- Ergebnis Healthcheck `/api/health`
- Ergebnis `/planer`
- Ergebnis Fehlerfall mit erhaltener bestehender Tour
- Ergebnis Profilvergleich und Langstreckenrouting
- Ergebnis Zwischenziellimit 20/21
- Ergebnis Etappenplanung nach Schwierigkeit einschliesslich sichtbarer Ersetzungsbestaetigung
- Ergebnis GPX-Import
- Ergebnis Karte, Marker, POI und Etappenfarben
- Ergebnis `/einstellungen/fahrprofil`, Profil-Speicherung, Reload sowie Profil-Export/-Import
- Ergebnis E-Bike-Grunddaten ohne Energie- oder Reichweitenberechnung
- Ergebnis nutzbare Akkukapazität, Motorunterstützung, Ladegerätleistung, Ladeverluste und persönliches Fahrprofil
- Ergebnis Paket-16-Profilmigration sowie Profil- und Tour-JSON mit den Paket-17-Feldern
- Ergebnis weiterhin ohne Energie-, Reichweiten-, Ladezeit- oder Etappenberechnung
- Ergebnis Energieprognose je Etappe mit Verbrauch, Rest, persönlicher Belastung, Reichweite, Reserve und Qualität
- Ergebnis Referenzkalibrierung mit 500 Wh nutzbarer Energie und 80 km Referenzreichweite: 80 km flach ≈ 100 %, 64 km bei 20 % Reserve ≈ 80 %, 100 km flach ≈ 125 % und `depleted`
- Ergebnis sichtbare persönliche Referenzreichweite, Referenzverbrauch in Wh/km, sichere Reichweite, physikalischer Rohverbrauch, kalibrierter Verbrauch und Kalibrierungsfaktor
- Ergebnis 100-km-Höhenvergleich mit identischem Profil: 100 Hm ≈ 635 Wh / 126,9 %, 1.000 Hm ≈ 722 Wh / 144,4 %, 2.000 Hm ≈ 819 Wh / 163,8 %
- Ergebnis sichtbarer flacher Grundverbrauch, Steigungszuschlag, Gefälleentlastung, Gesamtverbrauch, positive Höhenmeter und Wh je 100 Hm
- Ergebnis Gefälle ohne negative Akkuenergie und ohne Rekuperation
- Ergebnis Hinweis nach Änderung von Akkukapazität oder Akkuanzahl, dass die Referenzreichweite für die Gesamtkonfiguration geprüft werden muss
- Ergebnis Profil-/Tour-Save/Load und JSON-Import ohne Änderung der kalibrierten Prognose
- Ergebnis für klassische Fahrräder sowie E-Bike mit einem und zwei Akkus
- Ergebnis mit vollständigem und fehlendem/unvollständigem Höhenprofil
- Ergebnis deterministische Wiederholung ohne veränderte Werte
- Ergebnis ohne automatische Etappenänderung, Ladepunktplanung oder Wetter-/Winddaten
- Ergebnis responsive Darstellung bei 390 und 768 px
- Entscheidung: Merge empfohlen oder Nacharbeit erforderlich

### Paket 19 – Ladeplanung

- E-Bike-Profil mit Kapazität, Reserve, Ladegerätleistung und Ladeverlusten speichern
- Referenzfall 500 Wh / 80 km / 100 km flach prüfen: 625 Wh Fahrenergie, kritische Stelle bei km 64, ohne Ladepunkt nicht durchführbar und mit Ladepunkt bei km 64 zwingender Ladehalt bei 20 % Ankunftsakku
- Höhenmeterfälle mit 100, 1.000 und 2.000 Hm prüfen: 635 Wh < 722 Wh < 819 Wh müssen auch in der Ladeplanung erhalten bleiben
- Tour ohne Ladebedarf und Tour mit Reserveunterschreitung vergleichen
- erste kritische Stelle und automatischen Ladehalt prüfen
- eigenen Ladepunkt erfassen und mehrere manuelle Ladehalte hinzufügen
- Ziel-Ladung 80/90/100 %, Entfernen und Reihenfolgeänderung prüfen
- Ankunftsakku, Abfahrtsakku, Restreichweite, Nachladeenergie und Ladezeit prüfen
- Tourübersicht mit Gesamtfahrzeit einschließlich Laden prüfen
- Warnungen für fehlenden Ladepunkt, Reserve, unzureichende Ziel-Ladung, unbekannte Leistung und Nichtverfügbarkeit prüfen
- Save/Load und Tour-JSON-Export/-Import prüfen
- nach Reload identische Ergebnisse prüfen
- klassische Fahrradkonfiguration ohne Ladeplanung prüfen
- responsive Darstellung bei 390, 768 und 1280 px sowie fehlerfreie Browserkonsole prüfen
- keine Live-Abfrage, Reservierung, Routen-/Etappenänderung oder Online-Abhängigkeit auslösen

### Paket 20 – Kontinuierliche Unterstützungsstrategie

```bash
cd ~/Radtour-Planer
bash ./scripts/rpi-update.sh codex/continuous-assistance-model
git rev-parse --short HEAD
curl -fsS http://localhost:3000/api/health
```

Verbindlich prüfen:

- E-Bike-Profil mit realistischen Gewichten, Motor, Akku, Referenzreichweite und persönlicher Fahrweise laden.
- Tour mit echtem Höhenprofil und mindestens einer flachen, einer mittleren und einer steilen Etappe öffnen.
- In der Etappenansicht erscheint `Unterstützungsstrategie` mit Badge `Simulation`.
- Aufgeklappte Abschnitte zeigen km von/bis, Länge, Ø-/Maximalsteigung, Abschnitts- und Anstiegsdauer, Zieltempo, Motorbereich, Modus, Wh sowie Start-/Endakku.
- Flach < mittlere Steigung < starke Steigung ergibt einen nachvollziehbar steigenden Motorbedarf, sofern keine Grenze erreicht ist.
- Ein langer Anstieg wird anders begründet als eine kurze Rampe.
- Persönliche Fahrweise `Reichweitenorientiert`, `Ausgewogen` und `Sportlich` führt zu den dokumentierten Strategien.
- Bei gefährdeter Reserve sinkt das Zieltempo und eine verständliche Warnung erscheint.
- Ab 15 % erscheint der Grenzbereichshinweis.
- Generische Modi werden nicht als belegte Herstellermodi dargestellt.
- Fehlendes Höhenprofil zeigt einen unvollständigen Zustand statt erfundener Abschnitte.
- Klassisches Fahrrad zeigt keine Unterstützungsstrategie.
- Bestehende Energie- und Ladewerte bleiben unverändert und verwenden weiterhin `biketriphub-energy-v2` sowie `biketriphub-charging-v1`.
- Tour speichern, neu laden und identische Unterstützungswerte vergleichen.
- Keine Route, Etappe, Ladeplanung oder Unterkunft wird automatisch verändert.
- Desktop 1280 px, Tablet 768 px und Smartphone 390 px ohne horizontalen Overflow prüfen.
- Browserkonsole bleibt fehlerfrei.

Der PR bleibt bis zur dokumentierten Raspberry-Pi- und fachlichen Abnahme sowie ausdrücklichen Freigabe im Draft. Kein Tag und kein Release.

### Paket 21 – Adaptive E-Bike-Fahrstrategie

```bash
cd ~/Radtour-Planer
bash ./scripts/rpi-update.sh codex/adaptive-riding-strategy
git rev-parse --short HEAD
curl -fsS http://localhost:3000/api/health
```

Verbindlich prüfen:

- E-Bike-Tour mit mindestens zwei Etappen und echtem Höhenprofil laden.
- Tourweite Fahrstrategie erscheint oberhalb der Ladeplanung.
- Modi `Ausgewogen`, `Reichweite`, `Komfort` und `Manuell` wechseln; Werte werden unmittelbar neu berechnet.
- `Reichweite` schützt mehr Reserve und benötigt weniger Strategieenergie als `Komfort`.
- Automatischen und manuellen Ladehalt prüfen; beide werden in der Fahrstrategie berücksichtigt.
- Etappe mit später starker Steigung zeigt nachvollziehbar geschützte Unterstützung gegenüber flachen Abschnitten.
- Manuelle Unterstützung einer Etappe setzen; Badge wechselt auf `manuell`.
- Manuelle Vorgabe zurücksetzen; automatische Empfehlung wird wiederhergestellt.
- Nicht erreichbare Tour, Reserveunterschreitung und unzureichende Nachladung erzeugen verständliche Warnungen.
- Tour speichern, neu laden und Modus, Overrides, Empfehlungen sowie Fingerprint vergleichen.
- Ältere gespeicherte Tour ohne Fahrstrategiefeld laden; Standard `Ausgewogen` erscheint fehlerfrei.
- Klassisches Fahrrad zeigt keine Akku-Fahrstrategie.
- Energie-, Lade- und Assistance-Werte bleiben fachlich unverändert.
- Desktop 1280 px, Tablet 768 px und Smartphone 390 px ohne horizontalen Overflow prüfen.
- Browserkonsole bleibt ohne Fehler oder Warnungen.
- Keine Route, Etappe, Ladehaltreihenfolge oder Profilangabe wird automatisch verändert.

Der PR bleibt bis zur dokumentierten Raspberry-Pi- und fachlichen Abnahme sowie ausdrücklichen Freigabe im Draft. Kein Tag und kein Release. Paket 22 wird nicht begonnen.

### BikeTripHub Intelligence INT-00 – Dokumentationsabnahme

Dieser Konzeptabschnitt ändert keine App-, Datenbank-, Docker- oder Rechenlogik. Für die verbindliche Raspberry-Pi-Abnahme genügt nach dem Update des Konzept-Branches:

```bash
cd ~/Radtour-Planer
bash ./scripts/rpi-update.sh codex/biketriphub-intelligence-concept
git rev-parse --short HEAD
curl -fsS http://localhost:3000/api/health
```

Danach prüfen und dokumentieren:

- Container starten unverändert und der Healthcheck ist erfolgreich.
- `/planer/route` und `/planer/etappen` sind erreichbar.
- Eine vorhandene E-Bike-Energieprognose und Ladeplanung zeigt weiterhin die produktiven Modellversionen `biketriphub-energy-v2` und `biketriphub-charging-v1`.
- Es erscheint keine neue Intelligence-Funktion und keine experimentelle Berechnung im Produktivpfad.
- Die Browserkonsole bleibt fehlerfrei.
- Fachkonzept, Vertragsentwurf und Roadmap wurden auf klare Modulgrenzen, Einheiten, Datenqualität und Stopppunkte geprüft.

Ohne ausdrückliche Freigabe bleibt der Konzept-PR im Draft. Kein Tag und kein Release.

## 8. Updates einspielen

Empfohlen:

```bash
./scripts/rpi-update.sh
```

Optional kann ein Branch angegeben werden:

```bash
./scripts/rpi-update.sh main
```

Manuelles Update:

```bash
git pull --ff-only
docker compose -f docker-compose.rpi.yml build
docker compose -f docker-compose.rpi.yml up -d --remove-orphans
```

## 9. Stoppen

```bash
docker compose -f docker-compose.rpi.yml down
```

Mit Datenbankloeschung:

```bash
docker compose -f docker-compose.rpi.yml down -v
```

## 10. Hinweise fuer den Betrieb

- Die RPI-Datei nutzt `Dockerfile.rpi` und startet Next.js im Produktionsmodus.
- Fuer PostGIS nutzt die RPI-Datei ein ARM64-kompatibles Image: `imresamu/postgis:16-3.4-alpine3.21`.
- Beim App-Start wird zuerst auf Postgres gewartet; danach werden Prisma-Client, Schema-Push und Seed-Daten ausgefuehrt.
- Der Worker wartet vor dem Queue-Start auf Redis.
- Die App besitzt einen Healthcheck unter `/api/health`.
- Der Worker besitzt einen Redis-basierten Healthcheck.
- Das ist fuer eine Testversion bequem. Fuer Produktion sollten Migrationen, Secrets, Backups, Auth, HTTPS und Reverse Proxy sauber getrennt werden.
- Nicht nach `main` mergen, solange Lint, Typecheck, Build, Dockerfile.rpi-Build und Raspberry-Pi-Smoke-Test nicht erfolgreich dokumentiert sind.

## 11. Typische Fehler

### Docker permission denied

```bash
sudo usermod -aG docker $USER
sudo reboot
```

### Port 3000 ist bereits belegt

In `.env` anpassen:

```env
APP_PORT=3001
NEXT_PUBLIC_APP_URL=http://<rpi-ip>:3001
```

Danach:

```bash
./scripts/rpi-update.sh
```

### Datenbank neu aufsetzen

Nur fuer Testdaten verwenden, da alle Daten geloescht werden:

```bash
docker compose -f docker-compose.rpi.yml down -v
docker compose -f docker-compose.rpi.yml up --build -d
```
