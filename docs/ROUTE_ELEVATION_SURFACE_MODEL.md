# Deterministisches Höhenprofil- und Streckenbeschaffenheitsmodell

- Modellversion: `biketriphub-route-condition-v1`
- Zustandsversion: `1`
- Paket: 22
- Branch: `codex/route-elevation-surface-model`
- Status: additive Planungsanalyse; bestehende Energie- und Zeitmodelle bleiben unverändert

## Fachliches Ziel

Das Modell wertet dieselbe Routengeometrie aus, die Karte, Etappen und bestehende Rechenkerne verwenden. Es verbindet belegbare Höhen-, Oberflächen- und Wegtypinformationen zu einer reproduzierbaren Analyse je Segment, Etappe und Tour. Fehlende Daten bleiben unbekannt; die Oberfläche zeigt dann Qualitätsstatus und Warnungen statt scheinpräziser Werte.

Die Analyse ist eine Planungshilfe. Sie garantiert weder Befahrbarkeit noch aktuellen Wegzustand und ändert keine Route automatisch.

## Architektur

```text
GPX-Höhenpunkte / BRouter-Höhenpunkte / gespeicherte Ergänzungen
                               |
BRouter WayTags / gespeicherte Streckensegmente
                               |
                               v
          route-elevation-surface.ts (reiner Core)
                               |
              +----------------+----------------+
              |                                 |
      Tour-/Etappenanzeige            versionierter TourState
```

Der Core kennt keine React-Komponente, Datenbank, Browser-API, Netzwerkabfrage, Systemzeit oder Zufallsquelle. Die UI leitet keine Berechnung aus Bildschirmkoordinaten ab.

## Datenquellen

Zulässige Quellen sind:

- `gpx`: Höhenpunkte aus `<ele>` in vorhandenen GPX-Tracks oder -Routen,
- `brouter`: Höhenkoordinaten und bereits im Routing-Ergebnis enthaltene `WayTags`,
- `provider`: vorhandene, belegte Providerdaten,
- `manual`: ausdrücklich gespeicherte Ergänzungen,
- `stored`: versionierte Bestandsdaten,
- `estimated`: sichtbar als Schätzung gekennzeichnete bestehende Höhenwerte,
- `unknown`: Quelle oder Merkmal ist nicht belegt.

Paket 22 führt keinen neuen Live-Dienst und keine OSM-/Höhendienst-Abfrage ein. Ein öffentliches Overpass- oder Nominatim-System ist keine Abhängigkeit.

## Datenverträge

Die Laufzeittypen liegen in `src/lib/route-elevation-surface.ts`:

- bestehender gemeinsamer `ElevationPoint` aus `src/lib/geo.ts`,
- `RouteConditionSourceSegment`,
- `ElevationSegmentAnalysis`,
- `SurfaceClassification`,
- `RouteWayClassification`,
- `RouteDataQuality`,
- `RouteConditionWarning`,
- `RouteConditionAnalysis`,
- `RouteConditionStoredState`.

Jede Analyse enthält Modellversion und Eingabe-Fingerprint. Segment-IDs folgen der stabilen Routenreihenfolge. Die Auswertung sortiert Quellen nach Position und ID.

## Höhenberechnung

Die Rohpunkte werden nach Entfernung sortiert, ungültige Punkte entfernt und doppelte Entfernungen deterministisch aufgelöst. Zwischen vorhandenen Punkten wird linear interpoliert. Außerhalb der belegten Abdeckung wird keine Höhe extrapoliert.

Für zwei aufeinanderfolgende Auswertungspunkte gilt:

```text
delta_h = h_ende - h_start
steigung_prozent = delta_h / segmentlaenge_meter * 100
positive_hm = max(0, delta_h)
negative_hm = max(0, -delta_h)
```

Tour- und Etappenwerte sind die Summe der geglätteten Segmentdifferenzen. Der maximale berechenbare Steigungsbetrag ist das Maximum der inneren Teilintervalle. Sehr kurze Intervalle werden ausgewertet, aber als unzuverlässig gewarnt.

## Glättung

Version 1 verwendet einen zentrierten Median aus drei Punkten:

- Radius: ein Nachbarpunkt je Seite,
- maximale Entfernung zum Nachbarn: `1 km`,
- Anfangs- und Endpunkt bleiben unverändert,
- monotone längere Steigungen bleiben erhalten, weil der mittlere Wert eines monotonen Tripels unverändert bleibt,
- Rohwerte werden separat gespeichert und angezeigt,
- eine Abweichung ab `8 m` wird als angewandte Glättung dokumentiert.

Grenzparameter stehen zentral in `elevationSmoothingParameters`. Das Verfahren hängt weder von Bildschirmbreite noch SVG-Auflösung ab.

## Steigungsklassen

Die zentralen Grenzen stehen in `slopeClassThresholds`:

| Klasse | Bereich |
| --- | ---: |
| Gefälle stark | bis einschließlich `-8 %` |
| Gefälle leicht | über `-8 %` bis einschließlich `-1 %` |
| Nahezu eben | über `-1 %` bis unter `1 %` |
| Leichte Steigung | ab `1 %` bis unter `4 %` |
| Mittlere Steigung | ab `4 %` bis unter `7 %` |
| Starke Steigung | ab `7 %` bis unter `12 %` |
| Sehr starke Steigung | ab `12 %` |

Ein Sprung über `35 %` und mindestens `25 m` Höhendifferenz wird als unplausibel markiert. Das Modell korrigiert den Rohwert nicht still.

## Oberflächenklassen und Faktoren

| Klasse | Beispiele | Oberfläche | Komfort | Tempo | Energie | Sicherheit |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Asphalt | `asphalt`, `chipseal` | 1,00 | 1,00 | 1,00 | 1,00 | sicher |
| Beton | `concrete`, Platten | 1,02 | 0,95 | 0,98 | 1,01 | sicher |
| Pflaster | `paving_stones`, `sett` | 1,12 | 0,72 | 0,84 | 1,10 | Hinweis |
| Befestigt | `compacted`, `paved` | 1,08 | 0,82 | 0,90 | 1,06 | sicher |
| Feiner Schotter | `fine_gravel` | 1,13 | 0,70 | 0,82 | 1,11 | Hinweis |
| Grober Schotter | `gravel`, `rock` | 1,28 | 0,48 | 0,66 | 1,23 | Hinweis |
| Unbefestigt | `unpaved` | 1,30 | 0,45 | 0,64 | 1,25 | Hinweis |
| Waldweg | `wood`, `woodchips` | 1,34 | 0,42 | 0,60 | 1,28 | Hinweis |
| Erdweg | `ground`, `dirt`, `mud`, `sand`, `grass` | 1,38 | 0,38 | 0,56 | 1,32 | Hinweis |
| Unbekannt | kein belegter Wert | 1,00 | 1,00 | 1,00 | 1,00 | unbekannt |

Die Faktoren sind versionierte Bewertungswerte, noch keine produktiven Korrekturen. Bei unbekannter Oberfläche bleibt Faktor 1,0 ausdrücklich neutral; das ist keine Behauptung von Asphaltqualität.

## Wegtypen

Unterstützt werden Straße, Radweg, gemeinsamer Geh- und Radweg, Wirtschaftsweg, Feldweg, Waldweg, Pfad und unbekannt. Die Ableitung nutzt vorhandene `highway`, `bicycle`, `foot`, `landuse` und `wood`-Tags. `highway=steps` oder `bicycle=dismount` erzeugt einen kritischen Hinweis auf Treppe beziehungsweise Schiebestrecke.

Weitere BRouter-Tags bleiben im Segment unter `rawTags` erhalten. Nicht belegte Breite, Freigabe, Tunnel, Brücke oder Fähre werden nicht erfunden.

## Qualitätsmodell

Die Qualitätsstufe wird aus einem Score `0..100` abgeleitet:

- `hoch`: ab 80,
- `mittel`: ab 60,
- `gering`: ab 30,
- `unbekannt`: unter 30.

Der Tourwert berücksichtigt Quelle, Höhenabdeckung, Punktdichte, Plausibilität, bekannte Oberfläche, bekannten Wegtyp, notwendige Interpolation und tatsächlich angewandte Glättung. Das Ergebnis enthält maschinenlesbare `reasonCodes`, nutzerverständliche `reasons` und die verwendeten Kennzahlen.

## Warnlogik

Warnungen unterscheiden `info`, `warning` und `critical`:

| Code | Bedeutung |
| --- | --- |
| `elevation_missing` | Keine belastbare Steigungsberechnung möglich. |
| `elevation_incomplete` | Profil deckt die Route nicht vollständig ab. |
| `implausible_elevation_jump` | Sprung überschreitet die zentralen Plausibilitätsgrenzen. |
| `noisy_elevation_profile` | Medianfilter hat auffällige Einzelwerte reduziert. |
| `segment_too_short` | Intervall unter 50 m. |
| `surface_unknown` | Oberfläche nicht belegt. |
| `way_type_unknown` | Wegtyp nicht belegt. |
| `possibly_unsuitable` | Untergrund oder Zugriff kann ungeeignet sein. |
| `pushing_or_steps` | Treppe oder Schieben ist belegt. |
| `low_quality` | Gesamtqualität ist gering oder unbekannt. |
| `interpolated_data` | Wesentliche Höhenwerte wurden zwischen Messpunkten interpoliert. |

Warnungen werden nach Routenposition, Schweregrad und Code stabil sortiert und dedupliziert.

## Save/Load und Modellversionierung

`StoredTourState.routeCondition` speichert Schema- und Modellversion, geordnete Quellsegmente sowie den letzten vollständigen Analysesnapshot einschließlich Roh- und Glättungsprofil, Qualität und Warnungen. Die Route führt zusätzlich aktuelle und originale Quellsegmente, damit Kürzen und Zurücksetzen dieselbe Datenbasis verwenden.

Alte Touren ohne Paket-22-Felder erhalten Zustand Version 1 mit leerer Quellenliste. Die aktuelle Analyse wird aus Route und Höhenprofil reproduzierbar neu berechnet. Ein Snapshot dient Nachvollziehbarkeit, nicht als ungeprüfte Berechnungsquelle.

## Integration in bestehende Modelle

Paket 22 stellt die neuen Ergebnisse nur über Typen und Anzeige bereit. Folgende produktive Module bleiben unverändert:

- `biketriphub-energy-v2`,
- `biketriphub-charging-v1`,
- `biketriphub-assistance-v1`,
- `biketriphub-riding-strategy-v1`,
- bestehende Fahrzeitberechnung.

`RouteConditionAnalysis.existingCalculationsChanged` ist deshalb immer `false`. Eine spätere Verwendung von Oberflächen- oder Wegfaktoren benötigt eine neue Modellversion, Alt/Neu-Vergleichstests, eigenen Auftrag und ausdrückliche Freigabe.

## Darstellung

Die Tourübersicht zeigt Höhenmeter, maximale Steigung, befestigte, unbefestigte und unbekannte Anteile, Verteilungen, Qualität und Warnstatus. Die Etappenansicht zeigt Profil, Höhenwerte, Oberflächenanteile und auffällige Segmente. Segmentdetails nennen Länge, Höhe, Steigung, Oberfläche, Wegtyp, Faktoren, Quelle, Qualitätsgründe und Warnungen.

Die SVG-Grafik verwendet eine feste fachunabhängige ViewBox, responsive Breite und markiert starke beziehungsweise unsichere Bereiche. Sie erzeugt bei 390 Pixel keine Seitenüberbreite.

## Determinismus

- keine Zeit-, Zufalls-, Netzwerk- oder Locale-Eingaben,
- zentrale Versionen und Grenzwerte,
- stabile Sortierung von Punkten, Quellen und Warnungen,
- Rundung an Ergebnisgrenzen,
- FNV-1a-Fingerprint der normalisierten Eingaben,
- identische JSON-Eingaben erzeugen identische Ergebnisse und Fingerprints.

## Bekannte Grenzen

- keine Live-Prüfung von Sperrungen, Nässe, Bodenfeuchte oder Verkehr,
- GPX enthält üblicherweise keine Oberflächen- oder Wegtypinformation,
- BRouter-`WayTags` sind nur verfügbar, wenn die bestehende Instanz sie im Routing-Ergebnis liefert,
- unbekannte Oberflächen bleiben neutral bewertet und senken die Qualität,
- keine automatische Änderung von Energie, Zeit, Route oder Etappen,
- keine Rekuperation,
- Median-3 ist ein vorsichtiger Einzelwertfilter, kein digitales Geländemodell.

## Beispiele

### GPX mit Höhe, ohne Oberfläche

Höhenwerte werden ausgewertet. Oberfläche und Wegtyp bleiben unbekannt; die UI zeigt 100 % unbekannte Oberfläche und senkt die Gesamtqualität.

### BRouter mit `WayTags`

`surface=asphalt highway=cycleway` wird zu Asphalt/Radweg. Ein nachfolgendes `surface=gravel highway=track` wird zu grobem Schotter/Feldweg. Beide Abschnitte behalten ihre BRouter-Quelle.

### Unvollständiges Profil

Liegt der erste Höhenpunkt erst bei km 1, bleibt km 0–1 ohne Höhe. Das Modell interpoliert nicht außerhalb der belegten Abdeckung und meldet `elevation_incomplete`.
