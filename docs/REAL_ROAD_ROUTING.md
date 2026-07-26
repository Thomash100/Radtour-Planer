# Reale Fahrradwege in der Direktplanung

Stand: 2026-07-25

## Ziel

Die direkte Planung verbindet Start, Ziel und Zwischenziele nicht mehr mit künstlichen Linien. `POST /api/routes/calculate` verwendet standardmäßig BRouter und berechnet eine Fahrradroute auf dem Wegenetz von OpenStreetMap.

Eine Luftlinie wird bei Fehlern ausdrücklich nicht als Route ausgegeben. Ist der Routingdienst nicht erreichbar oder liefert er unvollständige Abschnitte, erhält der Nutzer eine verständliche Fehlermeldung und die bestehende Planung bleibt unverändert.

## Provider und Profile

Konfiguration:

```env
ROUTING_PROVIDER=brouter
BROUTER_BASE_URL=https://brouter.de/brouter
ROUTING_TIMEOUT_MS=60000
ROUTING_MAX_SEGMENT_KM=80
```

Die MVP-Profile erzeugen technisch getrennte BRouter-Anfragen:

| Planerprofil | BRouter-Konfiguration | Fachliche Wirkung |
| --- | --- | --- |
| ausgewogen | `trekking`, `ignore_cycleroutes=1` | ausgewogene Wege-, Oberflächen- und Höhenbewertung ohne zusätzliche Bindung an ausgeschilderte Radrouten |
| Fahrradwege bevorzugen | `safety` | sichere Wege und erfasste Fahrradinfrastruktur stärker gewichten |
| wenig Steigung | `trekking`, `ignore_cycleroutes=1`, `uphillcost=500`, `downhillcost=500` | Anstiege und Abfahrten deutlich stärker gewichten |
| Radwanderwege bevorzugen | `trekking`, `stick_to_cycleroutes=1` | ausgeschilderte OSM-Radroutennetze besonders stark einbinden |
| sportlich | `fastbike` | zügige, sportliche Verbindung bevorzugen |

Die Parameter werden über die von BRouter unterstützten `profile:*`-URL-Parameter übergeben. BRouter beschreibt diese Schnittstelle im
[ServerHandler](https://github.com/abrensch/brouter/blob/master/brouter-server/src/main/java/btools/server/request/ServerHandler.java);
die verwendeten Optionen stammen aus dem offiziellen
[`trekking.brf`](https://github.com/abrensch/brouter/blob/master/misc/profiles2/trekking.brf).

Die Profile sind Präferenzen, keine Garantien. Wenn zwischen zwei Orten nur eine sinnvolle Verbindung existiert, können Ergebnisse trotz unterschiedlicher Requests gleich ausfallen. `wenig Steigung` garantiert insbesondere nicht die absolut höhenärmste mögliche Route.

## Fahrradwege und Radwanderwege

BRouter liefert neben der Routengeometrie Wegmerkmale für die berechneten Abschnitte. Der Planer wertet daraus zwei voneinander unabhängige Anteile aus:

- **Fahrradinfrastruktur:** als `highway=cycleway`, `bicycle=designated` oder über ein positives `cycleway*`-Merkmal erfasste Abschnitte.
- **Ausgeschilderte Radwanderwege:** Abschnitte in einem OSM-Radroutennetz mit `route_bicycle_icn`, `route_bicycle_ncn`, `route_bicycle_rcn` oder `route_bicycle_lcn`.

Im Planer werden Kilometer und Prozentanteil sowie vorhandene Netzebenen angezeigt:

- `icn`: internationales Radroutennetz
- `ncn`: nationales Radroutennetz
- `rcn`: regionales Radroutennetz
- `lcn`: lokales Radroutennetz

Ein Abschnitt kann zugleich Fahrradinfrastruktur und Teil eines Radwanderwegs sein. Er wird daher in beiden fachlichen Kennzahlen berücksichtigt, innerhalb der Gesamtstrecke der Radwanderwege aber auch bei mehreren Netzkennzeichnungen nur einmal gezählt. Die Auswertung wird mit dem Browser-Tourzustand gespeichert und bleibt beim JSON-Export/-Import erhalten.

## Lange Strecken

Lange Touren werden nacheinander zwischen den bekannten Zwischenpunkten berechnet und anschließend zu einer durchgängigen GeoJSON-Linie verbunden. Für einen Abschnitt oberhalb von `ROUTING_MAX_SEGMENT_KM` wird zuerst über das BRouter-Profil `shortest` ein routbarer Korridor angefordert. Die internen Segmentpunkte werden anschließend entlang genau dieser Providergeometrie abgeleitet. Erst danach werden die kürzeren Teilstücke mit dem vom Nutzer gewählten Fahrradprofil berechnet.

Es werden keine frei interpolierten Punkte auf der Luftlinie zwischen Start und Ziel mehr als verpflichtende Zwischenziele verwendet. Kann BRouter keinen routbaren Korridor liefern oder schlägt ein Teilstück fehl, bricht die Berechnung mit einer verständlichen Meldung ab. Die App ergänzt weder eine Geometrieabkürzung noch eine Luftlinie.

Für ausgewählte lange Demo-Korridore ergänzt die vorhandene lokale Ortsliste sinnvolle Zwischenorte. Vom Nutzer gesetzte Zwischenziele haben Vorrang.

## Daten und Grenzen

- BRouter nutzt OpenStreetMap-Wege und liefert Distanz, Fahrzeit und Höheninformationen.
- Die Radwege-Anteile hängen von Vollständigkeit und Aktualität der OSM-Weg- und Radroutenmerkmale ab. Sie garantieren weder eine lückenlose Beschilderung noch eine aktuell freie oder für das konkrete Fahrrad geeignete Strecke.
- Ortsauflösung verwendet weiterhin den lokalen MVP-Ortskatalog; eine freie produktive Ortssuche ist nicht Bestandteil dieses Pakets.
- Die öffentliche BRouter-Instanz hat kein zugesichertes SLA und priorisiert kurze Anfragen. Für einen produktiven Betrieb ist eine eigene BRouter-Instanz oder ein vertraglich geeigneter Routingprovider zu entscheiden.
- Scheitert die Korridorberechnung einer langen Verbindung am Providerlimit, fordert die App ein nachvollziehbares Zwischenziel an, statt einen freien Hilfspunkt zu erfinden.
- Bei einer Routinganfrage werden die Koordinaten der Start-, Ziel- und Zwischenpunkte serverseitig an den konfigurierten BRouter-Dienst übertragen.
- Die Route bleibt eine Planungshilfe. Befahrbarkeit, Sperrungen, Verkehrsregeln und aktuelle Bedingungen müssen vor und während der Fahrt geprüft werden.
- `ROUTING_PROVIDER=mock` bleibt nur als ausdrücklich aktivierbarer Offline-/Entwicklungsmodus erhalten. Es gibt keinen stillen Mock-Fallback.

## Paketprüfung

- Flensburg nach Swinemünde folgt realen Straßen und Radwegen.
- Hamburg nach Dresden folgt realen Straßen und Radwegen.
- Eine vorhandene Tour bleibt bei einem BRouter-Fehler einschließlich Etappen, POI und Unterkunftszuordnungen erhalten.
- Alle fünf Planerprofile erzeugen fachlich nachvollziehbare, technisch unterschiedliche BRouter-Anfragen.
- Lange Abschnitte verwenden ausschließlich Punkte einer zuvor gerouteten Korridorlinie; bei fehlender Korridorroute erscheint ein klarer Fehler.
- 20 Zwischenziele sind zulässig; das 21. wird im UI und im API-Schema abgelehnt.
- Ein manuelles Zwischenziel bleibt Bestandteil der Route.
- Die Linie enthält deutlich mehr als nur die eingegebenen Kontrollpunkte.
- Distanz und Fahrzeit stammen aus dem Routingdienst.
- Routingfehler erzeugen keine Luftlinie.
- Speichern, Etappenerzeugung und erneutes Öffnen erhalten die berechnete Geometrie.
