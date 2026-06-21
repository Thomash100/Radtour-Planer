# Testing und Pruefstandard

Dieses Dokument definiert die Mindestpruefung fuer Entwicklungsabschnitte.

## Standardchecks

Vor Commit oder PR-Kommentar:

```bash
git diff --check
npm run lint
npm run typecheck
npm run build
```

Wenn `npm run typecheck` nicht vorhanden ist, direkt ausfuehren:

```bash
npx tsc --noEmit
```

## Erwartete Build-Hinweise

Wenn lokal keine `.env` mit `DATABASE_URL` vorhanden ist, kann `next build` beim Sammeln statischer Seitendaten Prisma-Warnungen ausgeben. Der Build gilt nur als erfolgreich, wenn der Prozess mit Exit-Code 0 endet.

Nicht akzeptabel:

- Redis-Connection-Errors im Build.
- TypeScript-Fehler.
- ESLint-Fehler.
- fehlende oder inkonsistente Lockfile-Abhaengigkeiten.

## Docker-Pruefung

Bei Docker-, Deployment- oder Raspberry-Pi-Aenderungen:

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

## Public/private-Artefaktpruefung

Bei Webserver- oder public/private-Deployment-Aenderungen:

```bash
npm run artifact:public
npm run artifact:check-public
npm run artifact:private
npm run artifact:check-private
```

Die Artefakte liegen lokal unter `artifacts/` und werden nicht committed.

## Manuelle UI-Pruefung

Je nach Aufgabe pruefen:

- Startseite oeffnet ohne automatische Demo-Route.
- `/planer` oeffnet ohne sichtbare Fehler.
- GPX-Import zeigt die importierte Route.
- Start/Ziel stammen nach GPX-Import nicht aus Demo-Werten.
- Karte springt nicht unkontrolliert.
- Vollbildkarte kann geoeffnet und verlassen werden.
- Etappenlinien sind farbig unterscheidbar.
- Etappen koennen erzeugt, angepasst und gespeichert werden.
- Ungueltige Etappen-km werden verstaendlich abgelehnt und veraendern die bisherige Geometrie nicht.
- Gekuerzte Routen zeigen gekuerzte Laenge und GPX-km-Bereich an.
- Geaenderte Etappen zeigen eine Rueckmeldung zur neu berechneten Geometrie.
- GPX-Export schreibt die bearbeitete Routengeometrie; Etappenmetadaten bleiben im MVP in der gespeicherten Tour.
- Hoehenprofil passt zur geladenen Route.
- POI werden zur aktuellen Route bzw. Etappe angezeigt.
- Lead-/Partner-/Admin-Flows bleiben erreichbar, wenn betroffen.

## PR-Dokumentation

Jeder PR oder Issue-Abschlusskommentar muss enthalten:

- Commit-Hash
- Branch
- Ergebnis `git diff --check`
- Ergebnis Lint
- Ergebnis Typecheck
- Ergebnis Build
- Ergebnis Docker-/Raspberry-Pi-Test, falls betroffen
- Ergebnis public/private-Artefaktpruefung, falls betroffen
- manuelle Pruefpunkte
- Entscheidung: merge empfohlen oder Nacharbeit erforderlich

## Wenn Tests nicht moeglich sind

Wenn eine Pruefung lokal nicht moeglich ist, muss dokumentiert werden:

- welcher Check nicht lief,
- warum er nicht lief,
- welcher Ersatzcheck durchgefuehrt wurde,
- welcher manuelle Stopppunkt fuer den Nutzer bleibt.
