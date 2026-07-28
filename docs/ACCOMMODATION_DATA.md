# Unterkunftsplanung (Paket 13)

Stand: 2026-07-26

## Ziel

Unterkünfte sind ein persistenter Teil der Etappen- und Reiseplanung. BikeTripHub unterstützt Hotel, Pension, Hostel, Campingplatz und Ferienwohnung als belegte Unterkunftstypen. Es gibt keine Buchung, Zahlung, Preisabfrage oder Live-Verfügbarkeit.

## Datenmodell und Status

`StageAccommodation` speichert genau eine aktuelle Unterkunftszuordnung je Etappe:

- Typ, Name, Ort und Koordinate
- Entfernung zur Hauptroute und zum Etappenende
- Quelle und Datenqualität
- Status `vorgemerkt` oder `Übernachtung`
- ausschließlich belegte Fahrradmerkmale
- BRouter-Status, getrennte Hin-/Rückwegdistanz und Abstechergeometrie

Vorschläge werden nicht ungefragt gespeichert. Die Zuordnung wird erst durch `Vormerken` oder `Als Übernachtung wählen` in Etappe, TourState und Reiseplan übernommen.

## Filter

Die Etappenansicht filtert nach:

- Hotel, Pension, Hostel, Campingplatz und Ferienwohnung
- maximaler Entfernung zur Route
- maximaler Entfernung zum Etappenende
- mindestens einem belegten Fahrradmerkmal

Unbekannte Unterkunftstypen werden nicht aus Namen geschätzt. Ohne belegtes Typmerkmal erscheint ein POI nicht als Unterkunftskandidat.

## Belegte Fahrradmerkmale

Die Oberfläche zeigt nur ausdrücklich vorhandene Daten:

- Fahrradabstellplatz
- abschließbarer Fahrradraum
- E-Bike-Lademöglichkeit
- Gepäckaufbewahrung

Fehlende Tags bedeuten `unbekannt`, nicht `nein`. Sie werden weder geschätzt noch als Qualitätsversprechen ausgegeben.

## Provider

Die Suche verwendet die Abstraktion `AccommodationProvider`:

- `LocalTestProvider`: ausschließlich mit `ACCOMMODATION_PROVIDER=local-test`
- `DevelopmentProvider`: Overpass-kompatibler Endpunkt aus `OVERPASS_API_URL`
- `ProductionProvider`: produktiv konfigurierter, Overpass-kompatibler Endpunkt aus `ACCOMMODATION_API_URL`
- deaktivierter Provider: lokale Datenbank-POI bleiben nutzbar

Ohne explizit konfigurierten Endpunkt erfolgt keine öffentliche Overpass-Abfrage. Es gibt keinen fest verdrahteten öffentlichen Produktionsfallback. Provider-Abfragen haben begrenzte Timeouts und einen kurzlebigen serverseitigen Cache. Warnungen werden verständlich an die Oberfläche gegeben und serverseitig ohne Secrets protokolliert.

Beispiel für eine bewusste Entwicklungsaktivierung:

```env
ACCOMMODATION_PROVIDER=development
OVERPASS_API_URL=https://eigener-oder-bewusst-gewaehlter-endpunkt.example/api/interpreter
ACCOMMODATION_TIMEOUT_MS=4000
ACCOMMODATION_CACHE_TTL_MS=300000
```

Produktionsbetrieb:

```env
ACCOMMODATION_PROVIDER=production
ACCOMMODATION_API_URL=https://vertraglich-geeigneter-endpunkt.example/api/interpreter
ACCOMMODATION_TIMEOUT_MS=4000
ACCOMMODATION_CACHE_TTL_MS=900000
```

## Routing

Liegt eine Unterkunft mehr als 150 Meter von der Hauptroute entfernt, berechnet BikeTripHub vor der Auswahl zwei echte BRouter-Verbindungen:

1. Etappenende → Unterkunft
2. Unterkunft → Etappenende

Die Distanzen und die gestrichelte Abstechergeometrie werden separat dargestellt. Die GPX-/BRouter-Hauptroute wird nicht verändert. Scheitert einer der beiden Requests, bleibt die bisherige Unterkunftsauswahl unverändert.

## Quelle und Attribution

Bei OSM-basierten Ergebnissen zeigt die Oberfläche die Quelle `OpenStreetMap`; der Provider liefert die Attribution `© OpenStreetMap-Mitwirkende (ODbL)`. Vor Produktivbetrieb müssen Nutzungsbedingungen, Cache-Strategie, Aktualisierungsintervall und Datenalter des tatsächlich gewählten Endpunkts geprüft werden.

## Nicht enthalten

- Buchung, Reservierung oder Zahlung
- Preise, Bewertungen oder Live-Verfügbarkeit
- aus Namen oder räumlicher Nähe geschätzte Merkmale
- automatische Änderung der Hauptroute
- zwingende Abhängigkeit von einer öffentlichen Overpass-Instanz

## Manueller Prüfablauf

1. Reale oder bewusst konfigurierte Entwicklungsdatenquelle aktivieren.
2. Route und Etappen erzeugen.
3. jeden Unterkunftstypfilter und beide Distanzfilter prüfen.
4. `Nur Fahrradmerkmale` aktivieren und Merkmale gegen Quelldaten prüfen.
5. Marker je Typ sowie die Status `vorgeschlagen`, `vorgemerkt` und `Übernachtung` prüfen.
6. Unterkunft vormerken und als Übernachtung wählen.
7. Tour speichern, neu laden und Reiseplan öffnen.
8. Unterkunft abseits der Route wählen; getrennte BRouter-Distanzen und gestrichelten Abstecher prüfen.
9. BRouter absichtlich unerreichbar machen; bestehende Auswahl muss unverändert bleiben.
10. responsive Darstellung und Browserkonsole prüfen.
