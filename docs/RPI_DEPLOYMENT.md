# Raspberry Pi Testinstallation und Update

Diese Anleitung ist fuer eine lokale Testversion auf einem Raspberry Pi gedacht. Sie nutzt Docker Compose mit PostgreSQL/PostGIS, Redis, App und Worker.

## 1. Raspberry Pi vorbereiten

Auf dem Raspberry Pi:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Danach einmal abmelden und wieder anmelden oder den Raspberry Pi neu starten, damit die Docker-Gruppe aktiv wird.

## 2. Projekt klonen

```bash
git clone https://github.com/Thomash100/Radtour-Planer.git
cd Radtour-Planer
cp .env.rpi.example .env
```

In `.env` mindestens das Passwort und die lokale Adresse anpassen:

```env
POSTGRES_PASSWORD=dein-sicheres-testpasswort
NEXT_PUBLIC_APP_URL=http://<rpi-ip>:3000
```

Wenn du nur direkt auf dem Raspberry Pi testest, geht auch:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Die IP fuer den Aufruf aus dem Heimnetz bekommst du mit:

```bash
hostname -I
```

## 3. Installation starten

Empfohlen:

```bash
chmod +x scripts/rpi-install.sh scripts/rpi-update.sh
./scripts/rpi-install.sh
```

Alternativ manuell:

```bash
docker compose -f docker-compose.rpi.yml up --build -d
```

## 4. App pruefen

Status:

```bash
docker compose -f docker-compose.rpi.yml ps
```

Logs:

```bash
docker compose -f docker-compose.rpi.yml logs -f app
```

Healthcheck:

```bash
curl http://localhost:3000/api/health
```

App im Browser:

```text
http://localhost:3000
http://<rpi-ip>:3000
http://raspberrypi.local:3000
```

## 5. Wichtige Testseiten

- `/` Startseite
- `/planer` Route planen
- `/partner` Partnerprofil anlegen
- `/partner/dashboard` Partner-Dashboard
- `/admin/partner` Partner freischalten
- `/dashboard/routen` gespeicherte Routen
- `/api/health` technischer Healthcheck

## 6. Updates einspielen

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
docker compose -f docker-compose.rpi.yml up --build -d --remove-orphans
```

## 7. Stoppen

```bash
docker compose -f docker-compose.rpi.yml down
```

Mit Datenbankloeschung:

```bash
docker compose -f docker-compose.rpi.yml down -v
```

## 8. Hinweise fuer den Betrieb

- Die RPI-Datei nutzt `Dockerfile.rpi` und startet Next.js im Produktionsmodus.
- Fuer PostGIS nutzt die RPI-Datei ein ARM64-kompatibles Image: `imresamu/postgis:16-3.4-alpine3.21`.
- Beim App-Start werden Prisma-Client, Schema-Push und Seed-Daten ausgefuehrt.
- Die App besitzt einen Healthcheck unter `/api/health`.
- Das ist fuer eine Testversion bequem. Fuer Produktion sollten Migrationen, Secrets, Backups, Auth, HTTPS und Reverse Proxy sauber getrennt werden.

## 9. Typische Fehler

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
