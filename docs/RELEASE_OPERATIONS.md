# Produktionsbetrieb und Veröffentlichung

Stand: 2026-06-30

## Ziel

Paket 7 bereitet den späteren Produktionsbetrieb und eine Veröffentlichung vor. Es nimmt keine Plesk-Umstellung vor und veröffentlicht die App nicht produktiv.

## Aktuelle Betriebsentscheidung

Die vollständige App bleibt eine serverseitige Next.js-Anwendung im privaten Runtime-Bereich.

- `private`: Next.js-App, API-Routen, Prisma, Worker, Docker, Deployment-Skripte.
- `public`: öffentlicher Webroot-/Asset-/Proxy-Bereich.

Eine rein statische Plesk-Webseite hätte nur reduzierten Funktionsumfang und ist ein separater Produktzuschnitt.

## Health und Version

Für Smoke-Tests und Monitoring stehen bereit:

- `/api/health`
- `/api/version`

Beide Endpunkte liefern:

- Version
- Build-Datum
- MVP-Status
- Deployment-Kanal
- Indexierungsfreigabe

Keine Secrets oder Verbindungsdaten werden ausgegeben.

## Indexing und Robots

Standard:

- `NEXT_PUBLIC_ALLOW_INDEXING` ist nicht gesetzt.
- Robots sperrt Indexierung.
- Root-Metadata setzt `index=false`.

Freigabe:

- Indexierung darf erst nach separater Veröffentlichungsgenehmigung aktiviert werden.
- Dafür `NEXT_PUBLIC_ALLOW_INDEXING=true` beim Build setzen.
- Rechtliche Seiten, Betreiberangaben, Datenschutz, Datenquellen und Domain müssen vorher final geprüft sein.

## Backup-Konzept

Für den aktuellen MVP gibt es zwei Ebenen:

1. Browser-Touren
   - Nutzer kann Touren als JSON exportieren.
   - JSON enthält Planungszustand inklusive Etappen, Orte und Unterkünfte.
   - JSON ist kein Serverbackup.

2. Serverdaten
   - PostgreSQL muss separat per `pg_dump` oder Container-Backup gesichert werden.
   - `.env` und Secrets werden nicht im Repository gesichert.
   - Upload-/Runtime-Verzeichnisse, falls später eingeführt, brauchen eigene Backupregeln.

Empfohlener manueller RPi-/Docker-Prüfpunkt:

```bash
docker compose -f docker-compose.rpi.yml ps
curl -fsS http://localhost:3000/api/health
curl -fsS http://localhost:3000/api/version
```

Beispiel für ein Datenbankbackup im Docker-Betrieb, nach Zielsystem anzupassen:

```bash
docker compose -f docker-compose.rpi.yml exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

## Vor produktiver Veröffentlichung zu entscheiden

- Zielhosting: RPi, VPS, Docker-Server oder separater statischer Webauftritt.
- Domain und TLS.
- Reverse Proxy.
- Betreiberangaben und rechtliche Texte.
- Datenschutz, Logging, Monitoring und Auftragsverarbeitung.
- Backup- und Restore-Test.
- Datenquellen für Orte, POI und Unterkünfte.
- Indexierungsfreigabe.
- Release- und Rollback-Prozess.

## Abgrenzung

- Keine produktive Veröffentlichung in diesem Paket.
- Keine Plesk-Umstellung.
- Keine Änderung am Public-/Private-Konzept.
- Keine Prisma-Aktualisierung.
- Keine externe Unterkunfts- oder Buchungs-API.
