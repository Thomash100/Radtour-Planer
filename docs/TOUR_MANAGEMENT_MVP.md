# Tourverwaltung, Export und Import

Stand: 2026-06-30

## Ziel

Paket 5 erweitert den MVP um eine lokale Tourverwaltung. Der Fokus liegt auf stabiler Wiederaufnahme, Demo-/Echt-Tour-Trennung und tragbarem JSON-Export ohne Nutzerkonten und ohne neue Datenbankmigration.

## Funktionsumfang

- Touren lokal im Browser verwalten.
- Tour umbenennen.
- Tour duplizieren.
- Tour löschen.
- Tour als JSON exportieren.
- Tour aus JSON wieder importieren.
- Freigabe-Stand markieren:
  - Entwurf
  - Freigabe prüfen
  - Freigegeben
- Demo-Touren und echte Planungen klar unterscheiden.
- Letzten Browser-TourState weiterhin öffnen.

## Gespeicherte Daten

Der Tour-JSON-Export enthält:

- Route und Arbeitsroute
- gekürzte Route
- Etappen und Etappengeometrien
- Etappenlängen-/Reisetage-Einstellung
- gesetzte Orte und Etappenpunkte
- Unterkunftszuordnungen
- POI-Kandidaten und Auswahlzustände
- MVP-Freigabe-Stand

## GPX-Export

Der bestehende GPX-Export schreibt die bearbeitete Routengeometrie.

Zusätzlich gibt es einen Etappen-GPX-Export:

- Gesamtstrecke als Track.
- Jede Etappe als eigener Track.
- Unterkunfts- und Freigabemetadaten bleiben im Tour-JSON und werden nicht in GPX übertragen.

## Einschränkungen

- Die Tourverwaltung ist lokal im Browser und kein Nutzerkonto.
- JSON-Dateien enthalten Planungsdaten und sollten nicht ungeprüft veröffentlicht werden.
- Duplizierte Touren sind lokale Kopien; sie lösen keine Datenbank-Duplizierung aus.
- Export/Import ersetzt keine Backupstrategie für Serverdaten.
