# Codex Arbeitsstandard

Dieses Repository nutzt Codex fuer abgegrenzte Entwicklungsabschnitte. Diese Regeln sind verbindlich, damit keine unklaren Zwischenstaende entstehen.

## Grundlage

- Roadmap: https://github.com/Thomash100/Radtour-Planer/issues/26
- Arbeitsstandard: https://github.com/Thomash100/Radtour-Planer/issues/27
- Detailregeln: [docs/CODEX_WORKFLOW.md](docs/CODEX_WORKFLOW.md)
- Projektstand: [docs/PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md)

## Abschnittsvertrag

Jeder Codex-Abschnitt braucht vor der Umsetzung:

- Ziel
- Ausgangslage
- Branchname
- Umfang
- Abgrenzung
- Tests
- Akzeptanzkriterien
- Projektzusammenfassung
- manuellen Stopppunkt

Wenn ein Issue diese Angaben nicht enthaelt, muss Codex die fehlenden Annahmen knapp benennen und den kleinsten sinnvollen Abschnitt waehlen.

## Abschlussregel

Ein Abschnitt endet erst, wenn mindestens einer dieser Zustaende erreicht ist:

- gepruefter Stand ist auf GitHub veroeffentlicht,
- Pull Request ist erstellt oder aktualisiert,
- Tests und Build sind dokumentiert,
- Projektzusammenfassung ist aktualisiert,
- oder ein klarer manueller Pruefschritt ist benannt.

Kein Abschnitt endet mit unklarem Zwischenstand.

## Abnahme und Merge-Freigabe

Ab Paket 16 gilt für alle Entwicklungspakete verbindlich:

1. Entwicklung abschließen.
2. Automatische Prüfungen dokumentieren.
3. Draft-PR erstellen oder aktualisieren.
4. Raspberry-Pi-Abnahme durchführen.
5. Fachliche Abnahme durch den Auftraggeber dokumentieren.
6. Ausdrückliche Merge-Freigabe des Auftraggebers abwarten.
7. Erst danach Draft auf Ready setzen, nach `private` mergen, `private` aktualisieren und das nächste Paket beginnen.

Ohne die ausdrückliche Formulierung `PR #<nummer> ist zum Merge freigegeben.` darf Codex keinen Paket-PR mergen. Eine technische oder fachliche Abnahme allein ersetzt diese Freigabe nicht.

## Branch- und PR-Regel

- Neue Arbeit erfolgt auf `codex/<kurzer-auftrag>`.
- Nicht direkt auf `main` arbeiten.
- Wenn `main` nicht der aktuelle Integrationsstand ist, den im Projekt benannten Integrationsbranch verwenden.
- Jeder fachliche Abschnitt bekommt einen eigenen PR oder aktualisiert einen eindeutig passenden vorhandenen PR.
- PR-Beschreibungen muessen Ziel, Umsetzung, Tests, manuelle Pruefpunkte und offene Risiken nennen.

## Produktleitplanken

- Keine komplette Neuentwicklung ohne dokumentierte Begruendung.
- Modularer Monolith und Feature-Slices bevorzugen.
- Keine Microservices ohne zwingenden Grund.
- Karte, Eingabe, Etappen und Hoehenprofil muessen denselben TourState bzw. dieselbe Routengrundlage nutzen.
- Keine Demo-Orte automatisch beim Start laden.
- Keine Luftlinie als echte Fahrradroute darstellen.
- Keine geheimen API-Keys im Frontend.
- Keine produktive Abhaengigkeit von oeffentlichem Overpass oder Nominatim.
- Datenquellen, Lizenzen und Attribution sichtbar dokumentieren.
- Public/private-Branch-Regel bei Deployment-Aufgaben einhalten.

## Qualitaet

Vor einem PR oder Abschlusskommentar sind die passenden Checks auszufuehren:

- `git diff --check`
- `npm run lint`
- `npm run typecheck` oder `tsc --noEmit`
- `npm run build`
- bei Deployment-Aufgaben zusaetzlich Docker-/Raspberry-Pi-Pruefung

Wenn ein Check lokal nicht moeglich ist, muss der Grund genannt und ein manueller Ersatzpruefschritt dokumentiert werden.
