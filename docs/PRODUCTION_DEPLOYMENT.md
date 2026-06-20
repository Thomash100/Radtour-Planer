# Webserver-Deployment

Diese Anleitung beschreibt eine einfache Installation auf einem Linux-Webserver oder VPS mit Docker Compose. Sie ist fuer einen normalen Server mit Domain gedacht, nicht fuer klassischen FTP-Webspace.

## Voraussetzungen

- Linux-Server mit SSH-Zugriff
- Docker und Docker Compose Plugin
- Git
- Domain oder Subdomain mit DNS-A-Record auf die Server-IP
- Freie Ports `80` und `443`

Installationsbeispiel:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker $USER
sudo reboot
```

## Projekt installieren

```bash
git clone https://github.com/Thomash100/Radtour-Planer.git
cd Radtour-Planer
```

Vor dem Merge nach `main` kann auch ein Testbranch installiert werden:

```bash
git fetch origin
git switch codex/prepare-v0.3.0-route-planner-test
```

## Deployment-Branches public/private

Fuer getrennte Serverbereiche koennen die zielordnerreinen Deployment-Branches verwendet werden:

- `public`: oeffentlicher Webroot bzw. Proxy-/Asset-Bereich.
- `private`: privater Next.js-/API-/Prisma-/Worker-Bereich.

Der Branch `public` enthaelt keine lauffaehige App und keine Secrets. Die App laeuft aus `private`.

Privater Bereich:

```bash
git clone --branch private https://github.com/Thomash100/Radtour-Planer.git radtour-private
cd radtour-private
```

Oeffentlicher Bereich:

```bash
git clone --branch public https://github.com/Thomash100/Radtour-Planer.git radtour-public
```

Details stehen in [docs/DEPLOYMENT_BRANCHES.md](DEPLOYMENT_BRANCHES.md).

## Umgebung konfigurieren

```bash
cp .env.production.example .env
nano .env
```

Mindestens setzen:

```env
POSTGRES_PASSWORD=ein-langes-sicheres-passwort
APP_DOMAIN=radreiseplaner.example.com
NEXT_PUBLIC_APP_URL=https://radreiseplaner.example.com
NEXT_PUBLIC_BUILD_DATE=2026-06-03
APP_IMAGE_TAG=v0.3.0
```

`APP_DOMAIN` wird von Caddy fuer HTTPS genutzt. Die Domain muss bereits per DNS auf den Server zeigen.

## Deploy ausfuehren

Nach dem Merge nach `main`:

```bash
chmod +x scripts/deploy-prod.sh
./scripts/deploy-prod.sh main
```

Fuer einen PR- oder Testbranch:

```bash
./scripts/deploy-prod.sh codex/prepare-v0.3.0-route-planner-test
```

Das Script fuehrt aus:

- Branch per Git aktualisieren
- Docker-Images bauen
- `app`, `worker`, `postgres`, `redis` und `caddy` starten
- internen `/api/health`-Check pruefen

Startrobustheit:

- `app` wartet vor `prisma db push` und `prisma db seed` auf Postgres.
- `worker` wartet vor Queue-Start auf Redis.
- `worker` besitzt einen Redis-basierten Healthcheck.

## Manuelle Befehle

Falls das Script nicht verwendet werden soll:

```bash
git pull --ff-only
docker compose -f docker-compose.prod.yml build --pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml ps
```

Healthcheck:

```bash
docker compose -f docker-compose.prod.yml exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{console.log(r.status); console.log(await r.text()); process.exit(r.ok?0:1)}).catch(e=>{console.error(e); process.exit(1)})"
```

Oeffentlicher Test:

```bash
curl -fsS https://radreiseplaner.example.com/api/health
```

## Pruefpunkte nach dem Deploy

- Startseite oeffnet per HTTPS
- Footer zeigt `Version 0.3.0`
- Footer zeigt den gesetzten Build-Wert
- `/planer` oeffnet ohne Fehler
- GPX-Import funktioniert
- Route mit Zwischenzielen wird angezeigt
- Auto-Zoom-Schalter funktioniert
- Etappenlinien und Marker sind sichtbar
- POI-Filter und Test-POI sind nachvollziehbar
- Lead-Anfrage funktioniert
- `/admin/partner` ist erreichbar

## Betrieb

Logs:

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f worker
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f postgres redis
```

Stoppen:

```bash
docker compose -f docker-compose.prod.yml down
```

Update:

```bash
./scripts/deploy-prod.sh main
```

Datenbank-Backup:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U radreise radreiseplaner > backup-radreiseplaner.sql
```

## Hinweise

- PostgreSQL und Redis werden im Produktions-Compose nicht nach aussen veroeffentlicht.
- Caddy uebernimmt Reverse Proxy und HTTPS-Zertifikate.
- Fuer Raspberry Pi bleibt `docker-compose.rpi.yml` die empfohlene Variante.
- Fuer echte Produktion sollten Secrets, Backups, Monitoring, Datenschutztexte, Mailversand, Auth und Zahlungs-/Lead-Prozesse vor dem oeffentlichen Betrieb finalisiert werden.
