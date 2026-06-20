# Codex Workflow

Dieses Dokument beschreibt den verbindlichen Ablauf fuer Codex-Entwicklungsabschnitte im Radtour-Planer.

## Ziel

Codex soll das Projekt in kleinen, pruefbaren Abschnitten weiterentwickeln. Jeder Abschnitt muss fachlich nachvollziehbar, technisch geprueft und auf GitHub dokumentiert sein.

## Start eines Abschnitts

1. Relevantes Issue lesen.
2. Roadmap #26 beruecksichtigen: https://github.com/Thomash100/Radtour-Planer/issues/26
3. Repository-Zustand pruefen:
   - `git status --short --branch`
   - aktuellen Branch pruefen
   - offene lokale Aenderungen identifizieren
4. Passende Branch-Basis waehlen.
5. Branch nach Schema `codex/<auftrag>` erstellen.

## Pflichtstruktur fuer Aufgaben

Jede Codex-Aufgabe soll diese Abschnitte enthalten:

- Ziel: fachliches Ergebnis.
- Ausgangslage: aktuelles Problem oder Kontext.
- Branchname: vorgesehener Arbeitsbranch.
- Umfang: konkrete Dateien, Seiten, APIs oder Flows.
- Abgrenzung: was bewusst nicht umgesetzt wird.
- Tests: automatische und manuelle Pruefungen.
- Akzeptanzkriterien: sichtbare Erfolgskriterien.
- Projektzusammenfassung: Auswirkungen auf Produktstand und naechste Arbeit.
- Manueller Stopppunkt: klarer Punkt, an dem der Nutzer pruefen muss.

## Umsetzung

- Bestehende Architektur lesen, bevor neue Struktur eingefuehrt wird.
- Kleine Feature-Slices bevorzugen.
- Keine grossen Refactorings mit Funktionsaenderungen vermischen.
- Keine lokalen Nebenprodukte committen:
  - `node_modules`
  - `.next`
  - lokale `.env`-Dateien
  - `tsconfig.tsbuildinfo`
- Prisma-, Docker- und Deployment-Aenderungen nur mit passender Dokumentation.

## Abschluss eines Abschnitts

Ein Abschnitt gilt erst als abgeschlossen, wenn mindestens einer dieser Zustaende erreicht ist:

- gepruefter Stand ist nach GitHub gepusht,
- PR ist erstellt oder aktualisiert,
- Tests und Build sind im PR oder Issue dokumentiert,
- Projektzusammenfassung ist aktualisiert,
- oder ein klarer manueller Pruefschritt ist erreicht.

Unklare Zwischenstaende sind nicht erlaubt.

## PR-Anforderungen

Jeder PR muss enthalten:

- Ziel
- Umsetzung
- Abgrenzung
- Tests
- manuelle Pruefpunkte
- bekannte Risiken oder Folgeaufgaben
- Link zum zugrunde liegenden Issue

## Manuelle Pruefpunkte

Manuelle Pruefpunkte muessen konkret sein. Beispiel:

- GPX-Datei importieren.
- Ansicht `Etappen` oeffnen.
- Etappenpunkt setzen.
- Pruefen, ob Marker auf der GPX-Route liegt.
- `Etappen neu berechnen` ausfuehren.
- Karte und Etappenfarben pruefen.

## Stop-Regel

Codex stoppt nicht mitten in einer lokalen Aenderung. Gestoppt wird nur bei:

- sauberem GitHub-Stand,
- dokumentiertem PR,
- bestandenen oder begruendet nicht ausfuehrbaren Tests,
- oder einem eindeutig benannten manuellen Pruefschritt.
