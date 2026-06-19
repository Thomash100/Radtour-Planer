# Public/private-Deployment

Dieses Dokument beschreibt die Zielstruktur fuer eine spaetere Webserver-Installation mit getrennten Deployment-Branches.

## Ziel

Der Radtour-Planer bleibt in Arbeits- und Feature-Branches eine vollstaendige Next.js-Anwendung mit Quellcode, Tests, Doku, Prisma, Docker- und Buildlogik.

Fuer den Betrieb koennen daraus zwei zielordnerreine Artefakte erzeugt werden:

- `public`: oeffentlich auslieferbarer Webroot bzw. Proxy-/Asset-Bereich.
- `private`: privater serverseitiger Runtime-Bereich fuer Next.js, API, Prisma, Redis-/Worker-Anbindung und Konfiguration.

Die Branch-Roots entsprechen den Zielordnern. Es werden keine vorgelagerten Serverpfade wie `/httpdocs/...`, `/var/www/...` oder `/_private/...` in den Branch geschrieben.

## Aktuelle Entscheidung

Die aktuelle App ist nicht sinnvoll als rein statische Seite exportierbar.

Gruende:

- Next.js API-Routen sind Bestandteil des MVP.
- Prisma/PostgreSQL und Redis/BullMQ gehoeren zur serverseitigen Laufzeit.
- Partner-, Lead-, Admin-, Health- und POI-Endpunkte brauchen Serverlogik.
- Der Planer nutzt App-Runtime und lokalen TourState, ist aber Teil derselben Next.js-Anwendung.

Der saubere Webserver-Betrieb ist deshalb:

- `public` enthaelt nur oeffentliche Assets, optionale Proxy-/Startdateien und dokumentierte Platzhalter.
- `private` enthaelt die Next.js-Serveranwendung und wird durch Node/Docker/Reverse Proxy betrieben.

Ein echter statischer Export waere ein separater Produktzuschnitt und darf nicht nebenbei in einem Deployment-Abschnitt eingefuehrt werden.

## Arbeits-/Feature-Branches

Arbeitsbranches enthalten den vollstaendigen Projektstand:

- `src/`
- `prisma/`
- `scripts/`
- `docs/`
- Dockerfiles und Compose-Dateien
- `package.json` und `package-lock.json`
- Tests, Buildlogik und Codex-Aufgaben
- `.env.example`-Dateien

Nicht in Git gehoeren:

- `.env`, `.env.local`, produktive Secret-Dateien
- `node_modules/`
- `.next/`
- `artifacts/`
- Logs, Datenbankdateien, Caches und Upload-Runtime-Dateien

## Public-Artefakt

Das Public-Artefakt ist fuer den oeffentlichen Webroot gedacht.

Erlaubt:

- statische Dateien aus `public/`, falls vorhanden
- statische Next-Assets aus `.next/static` als `_next/static`, wenn vorher gebaut wurde
- dokumentierte Health-/Hinweisdateien
- spaetere serverseitig freigegebene Proxy-Konfiguration, wenn sie keine Secrets enthaelt

Nicht erlaubt:

- `.env` oder `.env.*`
- `src/`
- `prisma/`
- `node_modules/`
- `.next/server`
- `package.json` oder Lockfiles
- Dockerfiles und Compose-Dateien
- Datenbank-, Log-, Cache- oder Upload-Runtime-Dateien
- private Keys, Zertifikate oder Zugangsdaten

## Private-Artefakt

Das Private-Artefakt ist fuer den serverseitigen Bereich gedacht.

Erlaubt:

- Next.js-Quellcode und Serverlaufzeitdateien
- Prisma-Schema und Seeds
- Dockerfiles und Compose-Dateien
- Worker- und Deployment-Skripte
- `.env.example`-Dateien
- Dokumentation fuer Betrieb und Tests

Nicht erlaubt:

- echte `.env`-Dateien mit Secrets
- `node_modules/`
- `.next/cache`
- Logs und Datenbankdateien
- private Keys oder Zertifikate
- vorgelagerte Webserver-Zielpfade als Ordnerstruktur

## Lokale Artefakte erzeugen

Die folgenden Kommandos erzeugen lokale, ignorierte Artefakte unter `artifacts/`:

```bash
npm run artifact:public
npm run artifact:private
```

Die Artefakte werden nicht committed. Sie dienen als vorbereitete Quelle fuer spaetere Befuellung der Branches `public` und `private`.

## Echte Deployment-Branches

Die echten Branches `public` und `private` sind keine Entwicklungsbranches und bekommen keine Pull Requests gegen `main`.

- `public` entspricht direkt dem oeffentlichen Zielordner bzw. Webroot.
- `private` entspricht direkt dem privaten/serverseitigen Zielordner.
- Beide Branches sind zielordnerrein.
- Es werden keine Wrapper-Ordner wie `httpdocs/`, `var/www/`, `_private/` oder projektspezifische Serverpfade angelegt.

Aktuelle Quelle fuer die initiale Befuellung:

- Integrationsbranch: `codex/prepare-v0.3.0-route-planner-test`
- Quellstand: `92392e7`

Die Befuellung erfolgt aus geprueften lokalen Artefakten:

```bash
npm install
npm run build
npm run artifact:public
npm run artifact:check-public
npm run artifact:private
npm run artifact:check-private
```

Danach wird der Inhalt von `artifacts/public` in den Branch `public` und der Inhalt von `artifacts/private` in den Branch `private` uebernommen.

Die Deployment-Branches duerfen nur aktualisiert werden, wenn die Artefakt-Checks erfolgreich waren.

## Artefakte pruefen

```bash
npm run artifact:check-public
npm run artifact:check-private
```

Die Pruefung blockiert typische Fehler:

- Secrets im Public-Artefakt
- serverseitiger Quellcode im Public-Artefakt
- Datenbank-/Log-/Runtime-Dateien in Deploy-Artefakten
- echte `.env`-Dateien im Private-Artefakt
- unklare vorgelagerte Zielordner

## Raspberry Pi und Webserver

Fuer Raspberry Pi bleibt `docker-compose.rpi.yml` der praktische Testpfad.

Fuer Webserver/VPS bleibt `docker-compose.prod.yml` mit Reverse Proxy der produktionsnaehere Pfad. Ein klassischer FTP-Webspace reicht fuer die aktuelle App nicht aus, solange API, Prisma, Redis und Worker Teil des MVP sind.

## Branch-Zuordnung auf Servern

Empfohlene Zuordnung:

- Webroot/oeffentlicher Bereich: Branch `public`
- Privater App-/Runtime-Bereich: Branch `private`

Der Branch `public` ist nicht allein lauffaehig. Er enthaelt nur oeffentlich zulaessige Dateien und optional statische Next-Assets. Die eigentliche Anwendung laeuft aus dem privaten Bereich.

Der Branch `private` enthaelt die Next.js-App, API-Routen, Prisma, Worker- und Docker-Konfiguration. Echte `.env`-Dateien werden auf dem Zielsystem angelegt und nicht aus Git bezogen.

## Manueller Stopppunkt

Vor dem Anlegen oder Befuellen echter Branches `public` und `private` muss entschieden werden:

- Betrieb als Next.js-Server im privaten Bereich mit Webroot/Reverse Proxy im oeffentlichen Bereich.
- Oder bewusster separater Umbau auf eine rein statische Webversion mit reduziertem Funktionsumfang.

Auf Basis des aktuellen MVP ist die Empfehlung eindeutig: Next.js-Server im privaten Bereich, Public nur als Webroot/Proxy-/Asset-Bereich.
