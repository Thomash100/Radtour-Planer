# GPX-/Etappen-MVP

Stand: 2026-06-21

## Bedienlogik

- Die importierte GPX-Route bleibt die feste geometrische Grundlage.
- Start-km bezeichnet den Beginn einer Etappe auf der aktuellen Routengeometrie.
- Ziel-km bezeichnet das Ende einer Etappe auf der aktuellen Routengeometrie.
- Laenge setzt das Ziel relativ zum Start-km.
- Orte dienen im MVP als Etappennamen oder werden auf den naechsten Punkt der bestehenden Route projiziert.
- Orte verlegen die Route aktuell nicht automatisch und starten keine neue Routing-Abfrage.

## Validierung

- Start-km darf nicht kleiner als 0 sein.
- Ziel-km darf nicht groesser als die aktuelle Routenlaenge sein.
- Ziel-km muss groesser als Start-km sein.
- Laenge darf nicht 0 oder negativ sein.
- Ungueltige km-Eingaben erzeugen eine Statusmeldung und lassen die bisherige Etappengeometrie unveraendert.

## Sichtbare Rueckmeldungen

- Eine gekuerzte Route wird im Planer als gekuerzt markiert.
- Die aktuelle gekuerzte Laenge und der urspruengliche GPX-km-Bereich werden angezeigt.
- Nach manueller Etappenanpassung wird die betroffene Etappe als `Geometrie aktualisiert` markiert.
- Nach dem Speichern wird die betroffene Etappe als `Gespeichert` markiert.

## Export und erneutes Oeffnen

- Der GPX-Export schreibt aktuell die bearbeitete Routengeometrie.
- Etappennamen, Etappenfarben und manuelle Etappenschnitte werden nicht in die GPX-Datei geschrieben.
- Gespeicherte Touren laden die persistierte `geometryGeoJson` der Etappen ueber die Datenbank wieder.
- Der lokale Test deckt den JSON-Save/Load-nahen Roundtrip der Etappengeometrie ab; der Browser-/RPi-Test bleibt der manuelle End-to-End-Pruefpunkt.

## Bekannte Einschraenkungen

- Keine automatische Umleitung durch Ortsnamen.
- Keine neue Routing-API.
- Keine produktive POI-Massenabfrage.
- Keine Hotelbuchung oder Nutzerkonten.
- Keine Prisma-Aktualisierung in diesem MVP-Schritt.
