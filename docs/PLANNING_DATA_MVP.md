# Planungsdaten für Orte, POI und Unterkünfte

Stand: 2026-06-30

## Ziel

Paket 6 verbessert die Datenklarheit für Orte, POI und Unterkünfte, ohne eine produktive externe API anzubinden.

## Datenquellen im MVP

- Lokale MVP-Ortsliste für Stadt-/Ortprojektion auf die vorhandene GPX-Route.
- Vorhandene POI-Daten aus der App.
- Lokal erzeugte MVP-Testdaten, wenn entlang einer Route keine passenden POI gefunden werden.
- Partnerdaten, falls vorhandene freigeschaltete Partner in POI-Daten referenziert sind.

## Datenqualität

Unterkunftskandidaten zeigen eine Datenqualitätsmarkierung:

- `Partnerdaten`: vorhandener freigeschalteter Partnerbezug.
- `POI-Daten`: vorhandene POI-Daten ohne produktive Buchungszusage.
- `Lokale MVP-Testdaten`: lokal erzeugte Kandidaten für Review und Demo.

Diese Markierung ist eine Planungsinformation und keine Garantie für Verfügbarkeit, Öffnungszeiten, Preise oder Buchbarkeit.

## Suchradius je Etappe

Der MVP berechnet einen einfachen Suchradius am Etappenende:

- kurze Etappen: 5 km
- mittlere Etappen: 8 km
- lange Etappen: 12 km

Der Suchradius dient nur der lokalen Kandidatenauswahl und löst keine externe Suche aus.

## Entfernung und Abstecher

Je Unterkunft werden zwei Entfernungen angezeigt:

- Entfernung zum Etappenende
- Entfernung zur GPX-Route

Unterkünfte weiter als 1,5 km von der GPX-Route entfernt werden als Abstecher gekennzeichnet. Die GPX-Route wird dadurch nicht automatisch verändert.

## Abgrenzung

- Keine produktive externe Unterkunfts-API.
- Keine Buchung, Reservierung oder Zahlung.
- Keine automatische Routenverlagerung zur Unterkunft.
- Keine produktive POI-Massenabfrage.
- Datenquellen, Lizenzen, Kosten und Datenschutz müssen vor produktiver Nutzung separat geprüft werden.
