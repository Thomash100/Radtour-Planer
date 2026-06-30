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

Je nach Aufgabe prüfen:

- Startseite öffnet ohne automatische Demo-Route.
- `/planer` öffnet ohne sichtbare Fehler.
- GPX-Import zeigt die importierte Route.
- Start/Ziel stammen nach GPX-Import nicht aus Demo-Werten.
- Karte springt nicht unkontrolliert.
- Vollbildkarte kann geöffnet und verlassen werden.
- Etappenlinien sind farbig unterscheidbar.
- Etappen können erzeugt, angepasst und gespeichert werden.
- Ungültige Etappen-km werden verständlich abgelehnt und verändern die bisherige Geometrie nicht.
- Wiederholte Routenkürzungen werden aus der Original-GPX-Route berechnet: Start 300 km, danach 250 km, danach 0 km dürfen nicht kumulativ schrumpfen.
- `Kürzung zurücksetzen` stellt die vollständige Originalroute wieder her und setzt Etappen/POI zur Neuberechnung zurück.
- Startortsuche ist im GPX-Kürzungsworkflow deaktiviert oder zeigt den Hinweis auf Start-km statt automatischer Routenänderung.
- Gekürzte Routen zeigen gekürzte Länge und GPX-km-Bereich an.
- Große Startkürzung, z. B. Start ab 300 km auf einer langen Route, bleibt stabil.
- Änderung der Etappenlänge erzeugt Vorschläge neu; bestehende Etappen werden nur nach Bestätigung ersetzt.
- Aufteilung nach Reisetagen erzeugt die gewünschte Anzahl Etappen; bestehende Etappen werden nur nach Bestätigung ersetzt.
- Ungültige Reisetage wie 0, negative Werte, Kommazahlen oder unbrauchbar viele Tage werden verständlich abgelehnt.
- Ortssuche im GPX-Modus projiziert lokale MVP-Orte auf die bestehende GPX-Route und zeigt Arbeitsroute-km, Original-km und Abstand zur Route.
- Ort als Start, Ziel oder Etappenpunkt wird erst nach ausdrücklicher Bestätigung übernommen.
- Abbrechen einer Ortprojektion verändert weder Route noch Etappenpunkte.
- Versehentliche direkte Routenplanung bei geladener GPX-Route zeigt eine Bestätigung und erhält die GPX-Route bei Abbruch.
- Karte ist Standardansicht; Umschalten auf Höhenprofil funktioniert ohne die Etappenliste seitlich zusammenzudrücken.
- Geänderte Etappen zeigen eine Rückmeldung zur neu berechneten Geometrie.
- `Alle Änderungen speichern` zeigt nach Erfolg `Tour gespeichert.` und erhält Route, gekürzte Route, Etappen, Etappengeometrien, Reisetage-/Etappenlängen-Einstellung sowie gesetzte Orte/Etappenpunkte beim erneuten Öffnen.
- GPX-Export schreibt die bearbeitete Routengeometrie; Etappenmetadaten bleiben im MVP in der gespeicherten Tour.
- Höhenprofil passt zur geladenen Route.
- POI werden zur aktuellen Route bzw. Etappe angezeigt.
- Unterkunftskandidaten werden je Etappe angezeigt, inklusive Entfernung zum Etappenende und Entfernung zur Route.
- Unterkunft abseits der Route wird als Abstecher gekennzeichnet und verändert die GPX-Route nicht automatisch.
- Unterkunft kann als geplant gemerkt oder als Übernachtungspunkt ausgewählt werden.
- Speichern und erneutes Öffnen erhalten die Unterkunftszuordnung je Etappe.
- Lead-/Partner-/Admin-Flows bleiben erreichbar, wenn betroffen.

Manuelle RPi-/Browser-Prüfungen werden für fachlich zusammenhängende Pakete gebündelt. Kleine UI-/UX-Zwischenschritte werden lokal geprüft und erst am Paketende gemeinsam manuell abgenommen, sofern kein harter Blocker auftritt.

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
