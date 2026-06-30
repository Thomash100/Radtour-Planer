# Public/private-Deployment

Stand: 2026-06-30

## Zielstruktur

Arbeits- und Feature-Branches enthalten die vollständige Next.js-Anwendung mit Quellcode, Tests, Prisma, Docker-, Worker- und Buildlogik.

Daraus werden bei Bedarf zwei zielordnerreine Artefakte erzeugt:

- `public`: öffentlicher Webroot-/Asset-/Proxy-Bereich.
- `private`: privater serverseitiger Runtime-Bereich für Next.js, API-Routen, Prisma, Redis/Worker und Deployment-Skripte.

Die Branch-Roots entsprechen den Zielordnern. Es werden keine vorgelagerten Serverpfade wie `/httpdocs`, `/var/www` oder `_private` in die Branches geschrieben.

## Aktuelle Bewertung für den MVP

Die vollständige App ist nicht als rein statische Webseite geeignet.

Gründe:

- API-Routen sind Bestandteil des MVP.
- Prisma/PostgreSQL und Redis/BullMQ gehören zum serverseitigen Betrieb.
- Health-, Routen-, Etappen-, POI-, Partner- und Admin-Endpunkte benötigen Serverlogik.
- Der GPX-/Etappenplaner nutzt zwar lokalen Browser-TourState, bleibt aber Teil der Next.js-App.

Der sinnvolle Betrieb bleibt deshalb:

- `public` enthält nur öffentlich zulässige Assets, Hinweisdateien und gegebenenfalls Reverse-Proxy-/Webroot-Bestandteile ohne Secrets.
- `private` enthält die serverseitige Next.js-App und wird über Node/Docker/Reverse Proxy betrieben.

Eine Plesk- oder statische Webseitenvariante wäre ein separater Produktzuschnitt mit reduziertem Funktionsumfang. Paket 4 dokumentiert diese Bewertung, nimmt aber keine Plesk-Umstellung vor.

## Artefakte erzeugen

```bash
npm run artifact:public
npm run artifact:private
```

Die Artefakte werden lokal unter `artifacts/` erzeugt und nicht committed.

## Artefakte prüfen

```bash
npm run artifact:check-public
npm run artifact:check-private
```

Die Checks blockieren typische Fehler:

- Secrets im Public-Artefakt.
- serverseitiger Quellcode im Public-Artefakt.
- echte `.env`-Dateien im Private-Artefakt.
- Datenbank-, Log-, Cache- oder Schlüsseldateien in Deployment-Artefakten.
- unklare vorgelagerte Zielordner.

## Branch-Zuordnung

- `public`: öffentlicher Zielordner/Webroot.
- `private`: privater App-/Runtime-Bereich.

Der Branch `public` ist allein nicht lauffähig. Die eigentliche Anwendung läuft aus dem privaten Bereich.

## Aktueller Paketstand

- Letzter nachgezogener `private`-Stand vor Paket 4: `a238223a82700c11600f31bf1e0534dce8eabbbb`.
- Paket 4 ändert das Public-/Private-Konzept nicht.
- Paket 4 aktualisiert `private` nicht vor manueller Paketabnahme.
- Prisma wird in Paket 4 nicht aktualisiert.
- Keine produktive externe Unterkunfts-API wird angebunden.

## Manueller Deployment-Prüfpunkt

Vor einer produktiven Veröffentlichung muss separat entschieden und geprüft werden:

- finaler Hostname und Betreiberangaben
- TLS/Reverse Proxy
- echte `.env`-Werte auf dem Zielsystem
- Datenbank- und Backupstrategie
- Datenschutz, Logs, Monitoring und Datenquellen
- finale Freigabe für Indexierung oder Robots
- ob eine statische Plesk-Variante mit reduziertem Funktionsumfang überhaupt gewünscht ist
