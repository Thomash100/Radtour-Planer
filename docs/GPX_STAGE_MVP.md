# GPX-/Etappen-MVP

Stand: 2026-06-22

## Workflow

1. GPX laden
2. Route kürzen
3. Etappen erzeugen
4. Etappen bearbeiten
5. Unterkunft je Etappe planen
6. Karte oder Höhenprofil anzeigen
7. Speichern oder GPX exportieren

## Bedienlogik

- Die importierte GPX-Route bleibt die feste geometrische Grundlage.
- Die sichtbare Route ist eine abgeleitete Arbeitsgeometrie aus Original-GPX, Start-km und Ziel-km.
- Jede Korrektur wird wieder aus der Original-GPX-Route berechnet und nicht auf eine bereits gekürzte Route angewendet.
- Start-km bezeichnet den Beginn einer Etappe auf der aktuellen Arbeitsroute.
- Ziel-km bezeichnet das Ende einer Etappe auf der aktuellen Arbeitsroute.
- Länge setzt das Ziel relativ zum Start-km.
- Orte dienen im MVP als Etappennamen oder als Projektion auf den nächsten Punkt der bestehenden Route.
- Die lokale MVP-Ortssuche projiziert bekannte Städte/Orte auf die aktuelle GPX-Arbeitsroute und zeigt Arbeitsroute-km, Original-km und Abstand zur Route.
- Orte können nach Bestätigung als Start, Ziel oder Etappenpunkt übernommen werden.
- Orte verlegen die Route nicht automatisch und starten keine neue Routing-Abfrage.
- Unterkünfte werden als Planungsdaten je Etappe geführt und verlegen die GPX-Route nicht automatisch.
- Unterkünfte abseits der GPX-Route werden als Abstecher gekennzeichnet.
- Ein Wechsel zur direkten Routenplanung verwirft eine geladene GPX-Route nur nach ausdrücklicher Bestätigung.

## Validierung

- Start-km darf nicht kleiner als 0 sein.
- Ziel-km darf nicht größer als die aktuelle Routenlänge sein.
- Ziel-km muss größer als Start-km sein.
- Länge darf nicht 0 oder negativ sein.
- Ungültige km-Eingaben erzeugen eine Statusmeldung und lassen die bisherige Etappengeometrie unverändert.
- Beim Kürzen wird ein auf eine Nachkommastelle gerundeter End-km-Wert innerhalb der Anzeige-Toleranz auf das echte Routenende normalisiert. Dadurch bleiben große Startkürzungen wie 300 km auch bei gerundeter Anzeige stabil.
- `Kürzung zurücksetzen` stellt die volle Original-GPX-Route wieder her und setzt Etappen/POI zur Neuberechnung zurück.
- Etappen-Neuberechnung überschreibt bestehende Etappen nur nach Bestätigung.
- Reisetage müssen eine positive ganze Zahl sein; zu viele Reisetage mit unbrauchbar kurzen Tagesabschnitten werden abgelehnt.

## Sichtbare Rückmeldungen

- Eine gekürzte Route wird im Planer als gekürzt markiert.
- Die aktuelle gekürzte Länge und der ursprüngliche GPX-km-Bereich werden angezeigt.
- Route kürzen, Etappen erzeugen und Etappen bearbeiten sind getrennte Workflow-Schritte.
- Nach manueller Etappenanpassung wird die betroffene Etappe als `Geometrie aktualisiert` markiert.
- Nach dem Speichern wird die betroffene Etappe als `Gespeichert` markiert.
- `Alle Änderungen speichern` ist die eindeutige Aktion für die komplette Tour.
- Nach erfolgreicher Gesamt-Speicherung zeigt der Planer `Tour gespeichert.` und `Zuletzt gespeichert: HH:MM`.
- Karte und Höhenprofil werden im Planer über eine gemeinsame Ansichtsauswahl umgeschaltet. Standard ist die Karte.
- Das Höhenprofil belegt dadurch nicht dauerhaft Platz neben der Etappenbearbeitung.
- Etappen können entweder nach gewünschter Etappenlänge oder nach Anzahl Reisetage erzeugt werden.
- Bei Erzeugung nach Reisetagen zeigt der Planer die berechnete durchschnittliche Etappenlänge an.
- Je Etappe zeigt der Planer einen Bereich `Unterkunft` mit Kandidaten, Entfernungen zum Etappenende und Entfernung zur Route.
- Ausgewählte oder geplante Unterkünfte werden mit ihrem Status angezeigt.

## Export und erneutes Öffnen

- Der GPX-Export schreibt aktuell die bearbeitete Routengeometrie.
- Etappennamen, Etappenfarben und manuelle Etappenschnitte werden nicht in die GPX-Datei geschrieben.
- `Alle Änderungen speichern` schreibt den vollständigen Browser-TourState: GPX-/Arbeitsroute, gekürzte Route, Etappen, Etappengeometrien, Reisetage-/Etappenlängen-Einstellung, gesetzte Etappenpunkte, übernommene Orte/Städte und Unterkunftszuordnungen je Etappe.
- Gespeicherte Touren laden die persistierte `geometryGeoJson` der Etappen über die Datenbank wieder.
- Der lokale Test deckt den JSON-Save/Load-nahen Roundtrip der Etappengeometrie ab; der Browser-/RPi-Test bleibt der manuelle End-to-End-Prüfpunkt.

## Bekannte Einschränkungen

- Keine automatische Umleitung durch Ortsnamen.
- Ortssuche nutzt im MVP eine lokale Testliste und noch keinen produktiven externen Geocoder.
- Unterkunftskandidaten nutzen im MVP vorhandene POI-Daten oder lokale Testdaten und noch keine produktive externe Unterkunfts-API.
- Keine neue Routing-API.
- Keine produktive POI-Massenabfrage.
- Keine Hotelbuchung oder Nutzerkonten.
- Keine Prisma-Aktualisierung in diesem MVP-Schritt.
