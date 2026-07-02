# GPX-/Etappen-MVP

Stand: 2026-06-30

## Grundmodell

Die GPX-Route ist im MVP die feste geometrische Grundlage. Orte, Etappenpunkte und Unterkünfte verändern diese Route nicht automatisch und lösen kein Neurouting aus.

Die sichtbare Arbeitsroute wird aus drei Informationen abgeleitet:

- unveränderte Original-GPX-Geometrie
- Start-km auf der Originalroute
- Ziel-km auf der Originalroute

Jede Korrektur wird wieder aus der Original-GPX-Geometrie berechnet. Die App kürzt nicht kumulativ auf einer bereits gekürzten Route weiter.

## Workflow

1. GPX laden
2. Route kürzen
3. Etappen erzeugen
4. Etappen bearbeiten
5. Karte oder Höhenprofil anzeigen
6. Orte/Städte auf die Route projizieren
7. Unterkunft je Etappe vormerken oder auswählen
8. Alle Änderungen speichern
9. Gespeicherte Tour erneut öffnen

## Etappenlogik

- Etappen können nach gewünschter Etappenlänge erzeugt werden.
- Etappen können nach Anzahl Reisetage erzeugt werden.
- Manuelle Etappenänderungen berechnen die betroffene Geometrie neu.
- Folgeetappen bleiben als zusammenhängende Abschnitte konsistent.
- Bestehende manuelle Etappen werden bei kompletter Neuberechnung nur nach Bestätigung ersetzt.
- Farbige Etappenlinien liegen sichtbar auf der neutralen GPX-Grundroute.
- Etappenlinien sind anklickbar und öffnen die passende Etappenbearbeitung.

## Orte und Städte

- Die lokale MVP-Ortssuche nutzt eine begrenzte Testliste.
- Ein Ort wird auf den nächsten Punkt der aktuellen GPX-Arbeitsroute projiziert.
- Vor Übernahme werden Arbeitsroute-km, Original-km und Abstand zur Route angezeigt.
- Übernahme als Start, Ziel oder Etappenpunkt erfolgt erst nach Bestätigung.
- Abbrechen verändert Route und Etappenpunkte nicht.

## Unterkünfte

- Unterkunftskandidaten werden je Etappe angezeigt.
- Daten je Kandidat: Name, Typ, Ort, Koordinate, Entfernung zum Etappenende, Entfernung zur Route, Quelle/Link und Status.
- Unterkunft kann als geplant vorgemerkt oder als Übernachtungspunkt ausgewählt werden.
- Unterkunft abseits der GPX-Route wird als Abstecher gekennzeichnet.
- Die GPX-Route wird durch eine Unterkunftsauswahl nicht automatisch verändert.
- Kandidaten stammen im MVP aus vorhandenen POI-Daten oder lokalen MVP-Testdaten.

## Speicherung und Export

`Alle Änderungen speichern` ist die eindeutige Aktion für die gesamte Tour. Nach Erfolg zeigt der Planer `Tour gespeichert.` und den Zeitpunkt der letzten Speicherung.

Gespeichert werden:

- GPX-/Arbeitsroute
- gekürzte Route
- Etappen
- Etappengeometrien
- Reisetage-/Etappenlängen-Einstellung
- gesetzte Orte und Etappenpunkte
- Unterkunftszuordnungen

Der GPX-Export schreibt aktuell die bearbeitete Routengeometrie. Etappennamen, Etappenfarben, manuelle Etappenschnitte und Unterkunftsmetadaten bleiben im MVP im gespeicherten TourState und werden noch nicht vollständig in die GPX-Datei geschrieben.

## Bekannte Einschränkungen

- Keine produktive Routing-API.
- Keine automatische Umleitung zu Orten oder Unterkünften.
- Keine produktive externe Unterkunfts-API.
- Keine Hotelbuchung, Zahlung oder Nutzerkonten.
- Keine produktive POI-Massenabfrage.
- Rechtliche Texte, Datenquellen, Lizenzen, Attribution und API-Kosten sind vor Produktivbetrieb separat zu prüfen.
