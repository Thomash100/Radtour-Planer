# BikeTripHub / RadreisePlaner MVP

Lokaler Prototyp fuer die Planung mehrtaegiger Radtouren mit Route, Etappen, POI-Suche, Partnerprofilen, Lead-Anfragen und Admin-Freischaltung.

## Stack

- Next.js App Router mit TypeScript
- Tailwind CSS und shadcn/ui-kompatible Komponenten
- MapLibre GL JS mit OpenStreetMap-Rastertiles
- React Hook Form und Zod
- Prisma ORM mit PostgreSQL/PostGIS
- Redis und BullMQ Worker fuer Hintergrundjobs
- Docker Compose mit `app`, `postgres`, `redis`, `worker`

## Schnellstart mit Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Danach:

- App: http://localhost:3000
- Planer: http://localhost:3000/planer
- Partnerportal: http://localhost:3000/partner
- Admin-Freischaltung: http://localhost:3000/admin/partner

Der `app`-Service fuehrt beim Start aus:

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev -- --hostname 0.0.0.0
```

Die Seed-Daten enthalten eine Demo-Route `Muenchen nach Salzburg`, POI, zwei Partnerbetriebe, einen Lead und eine Anzeige.

## Raspberry Pi Testversion im Container

Fuer den Raspberry Pi gibt es eine produktionsnaehere Compose-Datei mit PostgreSQL/PostGIS, Redis, App und Worker im Container.

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker $USER
sudo reboot
```

Nach dem Neustart:

```bash
git clone https://github.com/Thomash100/Radtour-Planer.git
cd Radtour-Planer
cp .env.rpi.example .env
chmod +x scripts/rpi-install.sh scripts/rpi-update.sh
./scripts/rpi-install.sh
```

Aufruf:

- Direkt auf dem Raspberry Pi: http://localhost:3000
- Aus dem Heimnetz: `http://<rpi-ip>:3000`
- Wenn mDNS aktiv ist: http://raspberrypi.local:3000

Update spaeter:

```bash
cd Radtour-Planer
./scripts/rpi-update.sh
```

Manuelles Update:

```bash
git pull --ff-only
docker compose -f docker-compose.rpi.yml up --build -d --remove-orphans
```

Healthcheck:

```bash
curl http://localhost:3000/api/health
```

Details stehen in [docs/RPI_DEPLOYMENT.md](docs/RPI_DEPLOYMENT.md).

Hinweis: Auf Raspberry Pi/ARM64 verwendet die Compose-Datei `imresamu/postgis:16-3.4-alpine3.21`, weil das offizielle `postgis/postgis`-Image nur fuer `amd64` gebaut ist.

GitHub-Zielrepository:

```text
https://github.com/Thomash100/Radtour-Planer.git
```

## Lokaler Start ohne Docker

Voraussetzungen: Node.js mit npm, PostgreSQL mit PostGIS und Redis.

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Danach lokal oeffnen:

- http://localhost:3000
- im LAN: `http://<rechner-ip>:3000`

Falls PostgreSQL/Redis lokal laufen, setze in `.env.local` zum Beispiel:

```env
DATABASE_URL="postgresql://radreise:radreise@localhost:5432/radreiseplaner?schema=public"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Worker separat starten:

```bash
npm run worker
```

## MVP-Flows

1. `/planer` oeffnen.
2. Start, Ziel, Zwischenziele und Routingprofil waehlen.
3. `Route planen` berechnet eine Mockroute, speichert sie als Arbeitsroute, erzeugt Etappen und laedt POI aus der lokalen Seed-Datenbank.
4. Filterchips fuer Unterkunft, Gepaeck, Werkstatt, Restaurant und weitere Kategorien nutzen.
5. Partner-POI auswaehlen und eine Anfrage senden.
6. `/partner` oeffnen und ein Partnerprofil zur Pruefung einreichen.
7. `/admin/partner` oeffnen und Partner freigeben oder ablehnen.

## API-Auszug

- `POST /api/routes/calculate`
- `POST /api/routes/import-gpx`
- `GET /api/routes/:id`
- `POST /api/routes`
- `PATCH /api/routes/:id`
- `DELETE /api/routes/:id`
- `POST /api/routes/:id/stages/auto-generate`
- `PATCH /api/stages/:id`
- `GET /api/poi/along-route`
- `GET /api/poi/:id`
- `POST /api/poi/sync-osm`
- `POST /api/partner/register`
- `GET /api/partner/me`
- `PATCH /api/partner/me`
- `POST /api/partner/upgrade`
- `POST /api/partner/submit-for-review`
- `POST /api/leads`
- `GET /api/leads/me`
- `PATCH /api/leads/:id/status`
- `GET /api/admin/partners`
- `PATCH /api/admin/partners/:id/approve`
- `PATCH /api/admin/partners/:id/reject`
- `GET /api/admin/leads`
- `GET /api/admin/ads`

## Architekturhinweise

- Routing ist bewusst als austauschbares Mock-Modul in `src/lib/mock-routing.ts` gekapselt. GraphHopper oder OpenRouteService koennen spaeter hinter `POST /api/routes/calculate` eingebunden werden.
- Route-Geometrien werden als GeoJSON in Prisma `Json` gespeichert. PostGIS ist im Datenbankcontainer aktiviert; echte `geometry`-Spalten koennen spaeter fuer produktive Korridorabfragen ergaenzt werden.
- POI-Suche berechnet im MVP die Entfernung zur Route in TypeScript. Fuer Produktion sollte das in PostGIS mit gecachten OSM-Extrakten oder einem kommerziellen Provider laufen.
- `POST /api/poi/sync-osm` legt einen BullMQ-Job an; der Worker enthaelt aktuell einen Platzhalter.

## Rechtliche Leitplanken

- Keine Daten fremder Plattformen kopieren.
- OpenStreetMap korrekt attribuieren.
- Oeffentliche OSM/Overpass/Geocoding-Dienste nicht dauerhaft als Produktionsbackend belasten.
- Partneranzeigen sind als `Gesponsert`/`Werbung` markiert.
- Impressum, Datenschutz und AGB sind als Startseiten vorhanden und muessen vor Launch juristisch finalisiert werden.
