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
- Start-, Ziel- und Zwischenzielmarker sind auf der Karte sichtbar
- Etappenlinien sind farbig unterscheidbar
- Kartenresize funktioniert nach Seitenleisten-/Viewport-Aenderungen
- Demo-Route laesst sich anzeigen
- GPX-Import mit `trkpt`, `rtept` oder `wpt` testen
- GPX-Name und Hoehenprofil werden uebernommen, soweit in der Datei vorhanden
- POI und Marker entlang der Route werden angezeigt
- POI-Filter fuer Unterkunft, Gepaeck, Werkstatt, Restaurant und Zusatzfilter testen
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
- Ergebnis GPX-Import
- Ergebnis Karte, Marker, POI und Etappenfarben
- Entscheidung: Merge empfohlen oder Nacharbeit erforderlich

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
- Beim App-Start werden Prisma-Client, Schema-Push und Seed-Daten ausgefuehrt.
- Die App besitzt einen Healthcheck unter `/api/health`.
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
