# Unterkunftsdaten je Etappe

Stand: 2026-07-02

## Ziel

Paket 8 ergänzt echte Unterkunftsdaten als Planungsdaten je Etappe. Die App soll Hotels, Pensionen, Gästehäuser, Hostels, Campingplätze, Ferienwohnungen und Hütten entlang der Route vorschlagen, ohne eine Buchung, Reservierung oder Verfügbarkeitsgarantie auszulösen.

## Umgesetzt

- Der bestehende POI-Endpunkt `/api/poi/along-route` kann echte Unterkunftsdaten aus OpenStreetMap über Overpass ergänzen.
- Die Abfrage läuft nur, wenn Unterkünfte im Filter enthalten sind und kein reiner Partnerfilter aktiv ist.
- Die App nutzt weiter lokale Daten und Partnerdaten; OSM-Daten werden zusätzlich eingemischt und nach Routenkorridor gefiltert.
- Öffentliche Overpass-Daten werden nicht als Buchungsdaten behandelt.
- Datenqualität wird im Unterkunftsworkflow als `OSM-Daten`, `Partnerdaten`, `POI-Daten`, `manuell geprüft` oder `Lokale MVP-Testdaten` ausgewiesen.
- Die vorhandene Etappenlogik bleibt unverändert: Unterkunftskandidaten verändern die GPX-Route nicht automatisch.

## Unterstützte OSM-Unterkunftstypen

- `tourism=hotel`
- `tourism=guest_house`
- `tourism=bed_and_breakfast`
- `tourism=hostel`
- `tourism=motel`
- `tourism=camp_site`
- `tourism=caravan_site`
- `tourism=apartment`
- `tourism=chalet`
- `tourism=alpine_hut`
- `tourism=wilderness_hut`

## Betriebsverhalten

Die Overpass-Abfrage ist bewusst defensiv:

- Standard-Endpunkt: `https://overpass-api.de/api/interpreter`
- optional überschreibbar über `OVERPASS_API_URL`
- Timeout serverseitig begrenzt
- bei Fehler oder Zeitüberschreitung läuft die App mit lokalen POI bzw. markierten Testdaten weiter
- Ergebnisse werden nicht in der Datenbank gespeichert
- keine Secrets erforderlich

## Datenschutz und Lizenzhinweise

OpenStreetMap-/Overpass-Daten sind echte externe Daten, aber keine Buchungsdaten. Vor produktiver Veröffentlichung sind mindestens zu prüfen:

- ODbL-/Attributionspflichten
- Caching- und Nutzungsgrenzen öffentlicher Overpass-Instanzen
- eigene Overpass-/Importstrategie bei höherer Nutzung
- Aktualisierungsintervall und Datenalter
- Betreiberangaben und Haftungshinweis zur Datenqualität

## Bewusst nicht enthalten

- keine Booking-/Expedia-/Google-Places-Buchung
- keine Live-Verfügbarkeit
- keine Preisabfrage
- keine Reservierung
- keine Zahlung
- keine automatische Routenverlegung zur Unterkunft
- keine produktive Massensynchronisation in PostgreSQL

## Manueller Test

1. `/planer` öffnen.
2. Demo-Tour oder GPX-Route laden.
3. Filter `Unterkunft` aktiv lassen.
4. POI aktualisieren.
5. In der Etappen-Timeline prüfen, ob Unterkunftskandidaten mit Quelle `OpenStreetMap` und Datenqualität `OSM-Daten` erscheinen.
6. Unterkunft vormerken oder als Übernachtung wählen.
7. Tour speichern und über `/touren` erneut öffnen.
8. Prüfen, dass keine Buchung oder Verfügbarkeitsgarantie suggeriert wird.
