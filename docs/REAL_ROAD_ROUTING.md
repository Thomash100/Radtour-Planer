# Reale Fahrradwege in der Direktplanung

Stand: 2026-07-20

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

Die MVP-Profile werden so abgebildet:

| Planerprofil | BRouter-Profil |
| --- | --- |
| ausgewogen | `trekking` |
| Fahrradwege bevorzugen | `safety` |
| wenig Steigung | `trekking` |
| Radwanderwege bevorzugen | `trekking` |
| sportlich | `fastbike` |

`safety` gewichtet sichere, für Fahrräder geeignete Wege stärker. Das BRouter-Profil `trekking` berücksichtigt das ausgeschilderte OSM-Radroutennetz und macht solche Abschnitte in seiner Kostenfunktion besonders günstig. Dadurch kann die Route bewusst internationalen, nationalen, regionalen oder lokalen Radwanderwegen folgen. Insbesondere `wenig Steigung` bleibt im MVP eine Präferenz, aber keine Garantie für die höhenärmste mögliche Strecke.

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

Lange Touren werden nacheinander zwischen den bekannten Zwischenpunkten berechnet und anschließend zu einer durchgängigen GeoJSON-Linie verbunden. Abschnitte mit mehr als `ROUTING_MAX_SEGMENT_KM` Luftliniendistanz erhalten zusätzlich interne Hilfspunkte, weil die öffentliche BRouter-Instanz lange Einzelanfragen früh abbrechen kann. Diese Hilfspunkte erscheinen nicht als Nutzer-Zwischenziele. Das reduziert lange Einzelanfragen und bewahrt die vom Nutzer festgelegte Reihenfolge. Zwischen zwei Provider-Abschnitten wird keine größere Lücke durch eine Luftlinie geschlossen.

Für ausgewählte lange Demo-Korridore ergänzt die vorhandene lokale Ortsliste sinnvolle Zwischenorte. Vom Nutzer gesetzte Zwischenziele haben Vorrang.

## Daten und Grenzen

- BRouter nutzt OpenStreetMap-Wege und liefert Distanz, Fahrzeit und Höheninformationen.
- Die Radwege-Anteile hängen von Vollständigkeit und Aktualität der OSM-Weg- und Radroutenmerkmale ab. Sie garantieren weder eine lückenlose Beschilderung noch eine aktuell freie oder für das konkrete Fahrrad geeignete Strecke.
- Ortsauflösung verwendet weiterhin den lokalen MVP-Ortskatalog; eine freie produktive Ortssuche ist nicht Bestandteil dieses Pakets.
- Die öffentliche BRouter-Instanz hat kein zugesichertes SLA und priorisiert kurze Anfragen. Für einen produktiven Betrieb ist eine eigene BRouter-Instanz oder ein vertraglich geeigneter Routingprovider zu entscheiden.
- Bei einer Routinganfrage werden die Koordinaten der Start-, Ziel- und Zwischenpunkte serverseitig an den konfigurierten BRouter-Dienst übertragen.
- Die Route bleibt eine Planungshilfe. Befahrbarkeit, Sperrungen, Verkehrsregeln und aktuelle Bedingungen müssen vor und während der Fahrt geprüft werden.
- `ROUTING_PROVIDER=mock` bleibt nur als ausdrücklich aktivierbarer Offline-/Entwicklungsmodus erhalten. Es gibt keinen stillen Mock-Fallback.

## Paketprüfung

- Flensburg nach Swinemünde folgt realen Straßen und Radwegen.
- Hamburg nach Dresden folgt realen Straßen und Radwegen.
- Ein manuelles Zwischenziel bleibt Bestandteil der Route.
- Die Linie enthält deutlich mehr als nur die eingegebenen Kontrollpunkte.
- Distanz und Fahrzeit stammen aus dem Routingdienst.
- Routingfehler erzeugen keine Luftlinie.
- Speichern, Etappenerzeugung und erneutes Öffnen erhalten die berechnete Geometrie.
