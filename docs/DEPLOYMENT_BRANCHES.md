# Deployment-Branches public/private

Dieses Dokument beschreibt die initiale Befuellung der echten Deployment-Branches.

## Quelle

- Repository: `Thomash100/Radtour-Planer`
- Integrationsbranch: `codex/prepare-v0.3.0-route-planner-test`
- Quellstand: `92392e7`
- Grundlage: gemergter PR #39 mit public/private-Deployment-Entscheidung

## Branches

### public

Ziel: oeffentlicher Webroot bzw. Reverse-Proxy-/Asset-Bereich.

Erlaubter Inhalt:

- `README.md`
- `health/index.html`
- `_next/static/`, wenn durch `npm run build` erzeugt
- weitere explizit oeffentliche Assets aus `public/`, falls vorhanden

Nicht erlaubt:

- `.env` oder `.env.*`
- `src/`
- `prisma/`
- `node_modules/`
- `.next/server`
- Dockerfiles und Compose-Dateien
- Datenbank-, Log-, Cache- oder Runtime-Dateien
- private Keys oder Zertifikate
- vorgelagerte Serverpfade wie `httpdocs/`

### private

Ziel: privater/serverseitiger App-Bereich.

Erlaubter Inhalt:

- Next.js-App-Quellcode
- API-Routen
- Prisma-Schema und Seed
- Worker- und Deployment-Skripte
- Dockerfiles und Compose-Dateien
- `.env.example`-Dateien
- Betriebs- und Testdokumentation

Nicht erlaubt:

- echte `.env`-Dateien mit Secrets
- `node_modules/`
- `.next/cache`
- Logs und Datenbankdateien
- private Keys oder Zertifikate
- vorgelagerte Serverpfade wie `_private/`

## Erzeugung

```bash
npm install
npm run build
npm run artifact:public
npm run artifact:check-public
npm run artifact:private
npm run artifact:check-private
```

Die Artefakte unter `artifacts/` werden nicht committed. Nur ihr Inhalt wird in die Deployment-Branches uebernommen.

## Webserver-Deployment

Empfohlenes Zielmodell:

- `public` wird in den oeffentlichen Webroot ausgecheckt.
- `private` wird ausserhalb des oeffentlichen Webroots ausgecheckt.
- Reverse Proxy leitet App-Traffic an den Next.js-Server aus dem privaten Bereich weiter.
- Secrets werden auf dem Server in einer echten `.env` angelegt und nicht in Git gespeichert.

Beispiel fuer den privaten Bereich:

```bash
git clone --branch private https://github.com/Thomash100/Radtour-Planer.git radtour-private
cd radtour-private
cp .env.production.example .env
nano .env
docker compose -f docker-compose.prod.yml build --pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
curl -fsS http://localhost:3000/api/health
```

Beispiel fuer den oeffentlichen Bereich:

```bash
git clone --branch public https://github.com/Thomash100/Radtour-Planer.git radtour-public
```

Der oeffentliche Branch ist kein Ersatz fuer den privaten Next.js-Server.

## Raspberry Pi

Fuer Raspberry Pi bleibt der private/serverseitige Stand massgeblich:

```bash
git clone --branch private https://github.com/Thomash100/Radtour-Planer.git Radtour-Planer
cd Radtour-Planer
cp .env.rpi.example .env
docker compose -f docker-compose.rpi.yml build
docker compose -f docker-compose.rpi.yml up -d
curl -fsS http://localhost:3000/api/health
```

Der Branch `public` ist fuer den Raspberry-Pi-Test nicht erforderlich.

## Initiale Remote-Befuellung

Stand: 2026-06-19

- Arbeitsbranch: `codex/create-public-private-deployment-branches`
- Arbeitsbranch-Commit bei Artefakterzeugung: `e73e3af`
- Public-Branch-Commit: `7ea6c08`
- Private-Branch-Commit: `1a0ec81`

Root-Dateiliste `public`:

- `README.md`
- `_next/`
- `health/`

Root-Dateiliste `private`:

- `.env.example`
- `.env.production.example`
- `.env.rpi.example`
- `.gitignore`
- `AGENTS.md`
- `CHANGELOG.md`
- `Caddyfile`
- `DEPLOYMENT_ARTIFACT.md`
- `Dockerfile`
- `Dockerfile.rpi`
- `README.md`
- `components.json`
- `docker-compose.prod.yml`
- `docker-compose.rpi.yml`
- `docker-compose.yml`
- `docs/`
- `next-env.d.ts`
- `next.config.mjs`
- `package-lock.json`
- `package.json`
- `postcss.config.mjs`
- `prisma/`
- `scripts/`
- `src/`
- `tailwind.config.ts`
- `tsconfig.json`

Scan-Ergebnis:

- `public`: keine `.env`, keine Logs, keine Datenbankdateien, keine Runtime-Dateien, keine privaten Configs, keine Secret-Treffer.
- `private`: keine echten `.env`-Dateien, keine Logs, keine Datenbankdateien, keine Keys/Zertifikate, keine Zielpfad-Wrapper.
- `private`: Content-Treffer zu `DATABASE_URL`, `REDIS_URL` und `POSTGRES_PASSWORD` sind Platzhalter bzw. Docker-/Doku-Beispiele, keine echten produktiven Secrets.

## Stopppunkt

Nach dem Push von `public` und `private` ist ein manueller Server- oder Raspberry-Pi-Deploytest erforderlich. Erst dieser Test bestaetigt, dass die Zielumgebung die Branches korrekt verwendet.
