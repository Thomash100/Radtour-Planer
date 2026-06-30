# Testing und Prüfstandard

Dieses Dokument definiert die Mindestprüfung für Entwicklungsabschnitte.

## Standardchecks

```bash
git diff --check
npm test
npm run typecheck
npm run lint
npm run build
```

Wenn Deployment-Artefakte betroffen sind:

```bash
npm run artifact:private
npm run artifact:check-private
```

Wenn Startseite, öffentliche Seiten oder Webroot-/Asset-Bestandteile betroffen sind:

```bash
npm run artifact:public
npm run artifact:check-public
```

## Erwartete Build-Hinweise

Wenn lokal keine `.env` mit `DATABASE_URL` vorhanden ist, kann `next build` beim Sammeln statischer Seitendaten Prisma-Warnungen ausgeben. Der Build gilt nur als erfolgreich, wenn der Prozess mit Exit-Code 0 endet.

Nicht akzeptabel:

- Redis-Connection-Errors im Build.
- TypeScript-Fehler.
- ESLint-Fehler.
- fehlende oder inkonsistente Lockfile-Abhängigkeiten.

## Manuelle Paketprüfung

Manuelle RPi-/Browser-Prüfungen werden für fachlich zusammenhängende Pakete gebündelt. Kleine UI-/UX-Zwischenschritte werden lokal geprüft und erst am Paketende gemeinsam manuell abgenommen, sofern kein harter Blocker auftritt.

## GPX-/Etappen-MVP

Je nach Paket prüfen:

- Startseite öffnet ohne automatische Demo-Route.
- `/planer` öffnet ohne sichtbare Fehler.
- GPX-Import zeigt die importierte Route.
- Start/Ziel stammen nach GPX-Import nicht aus Demo-Werten.
- Karte ist sichtbar und Etappenlinien sind farbig unterscheidbar.
- Karte/Höhenprofil-Umschaltung funktioniert ohne gequetschte Etappenliste.
- Route kürzen arbeitet aus der Original-GPX-Geometrie, nicht kumulativ.
- Große Startkürzung, z. B. Start ab 300 km, bleibt stabil.
- `Kürzung zurücksetzen` stellt die vollständige Originalroute wieder her.
- Etappen können nach Länge und nach Reisetagen erzeugt werden.
- Manuelle Etappenänderungen aktualisieren Geometrie, Folgeetappen, Distanz, Höhenmeter und Fahrzeit.
- Ungültige km- oder Reisetage-Eingaben werden verständlich abgelehnt.
- Orte/Städte werden auf die GPX-Route projiziert und erst nach Bestätigung übernommen.
- Abbrechen einer Ortprojektion verändert Route und Etappenpunkte nicht.
- Versehentliche direkte Routenplanung bei geladener GPX-Route zeigt eine Bestätigung.
- Unterkunftskandidaten werden je Etappe angezeigt.
- Unterkunft abseits der Route wird als Abstecher gekennzeichnet und verändert die GPX-Route nicht automatisch.
- Unterkunft kann als geplant gemerkt oder als Übernachtungspunkt ausgewählt werden.
- `Alle Änderungen speichern` zeigt nach Erfolg `Tour gespeichert.`.
- Erneutes Öffnen erhält Route, gekürzte Route, Etappen, Etappengeometrien, Reisetage-/Etappenlängen-Einstellung, Orte/Etappenpunkte und Unterkunftszuordnungen.
- GPX-Export schreibt die bearbeitete Routengeometrie; Etappen- und Unterkunftsmetadaten bleiben im MVP im gespeicherten TourState.

## Paket-4-Release-Readiness

Zusätzlich prüfen:

- Startseite beschreibt den aktuellen MVP ohne produktive Überversprechen.
- GPX ist als empfohlener Einstieg erkennbar.
- Demo-Tour wird nur durch ausdrückliche Aktion geladen.
- Direkte Planung ist als Mockrouting bzw. eingeschränkter MVP-Modus gekennzeichnet.
- Impressum, Datenschutz, Nutzungsbedingungen und MVP-Hinweis öffnen ohne Fehler.
- Rechtliche Seiten enthalten nur prüfpflichtige Platzhalter und keine erfundenen Betreiberangaben.
- Footer zeigt MVP-Status, Version und Build-Datum.
- Robots/Sitemap sind vorbereitet; Indexierung bleibt bis zur Freigabe gesperrt.
- Partner-/Preisflächen behaupten keine produktive Buchung, Zahlung oder externe Unterkunfts-API.
- Mobile Ansicht der Startseite, Legal-Seiten und des Planers erzeugt keinen horizontalen Overflow.

## Docker/RPi-Prüfung

Bei Docker-, Deployment- oder Raspberry-Pi-Änderungen:

```bash
docker compose build
docker compose up -d
curl -fsS http://localhost:3000/api/health
```

Raspberry Pi:

```bash
docker compose -f docker-compose.rpi.yml build
docker compose -f docker-compose.rpi.yml up -d
curl -fsS http://localhost:3000/api/health
```

## PR-Dokumentation

PR- oder Issue-Abschlusskommentare sollen enthalten:

- Commit-Hash
- Branch
- Ergebnis `git diff --check`
- Ergebnis `npm test`
- Ergebnis Lint
- Ergebnis Typecheck
- Ergebnis Build
- Ergebnis Artefaktprüfung, falls betroffen
- Ergebnis Docker-/Raspberry-Pi-Test, falls betroffen
- manuelle Prüfpunkte
- Entscheidung: mergefähig oder Nacharbeit erforderlich

## Wenn Tests nicht möglich sind

Dokumentieren:

- welcher Check nicht lief,
- warum er nicht lief,
- welcher Ersatzcheck durchgeführt wurde,
- welcher manuelle Stopppunkt bleibt.
