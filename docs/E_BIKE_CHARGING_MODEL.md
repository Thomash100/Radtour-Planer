# E-Bike-Ladeplanungsmodell

## Zweck und Modellversion

Paket 19 ergänzt den korrigierten Energie-Rechenkern aus Paket 18 um eine getrennte, deterministische Ladeplanung. Das
Modell trägt die Version `biketriphub-charging-v1`.

Bei identischem Fahrer-/Fahrradprofil, identischen Energiesegmenten, Ladepunkten und manuellen Ladehalten entsteht immer
dasselbe Ergebnis. Netzwerk, aktuelle Uhrzeit, Zufall, Wetter und Live-Verfügbarkeit fließen nicht in die Berechnung ein.

## Verbindliche Energiequelle

Die Ladeplanung verwendet ausschließlich den finalen kalibrierten Verbrauch aus `biketriphub-energy-v2`:

- `StageEnergyProjection.batteryEnergyWh` ist der verbindliche Gesamtbedarf der Etappe.
- `terrain.*.batteryEnergyWh` enthält den finalen Bedarf des jeweiligen Segmenttyps.
- `physicalRawBatteryEnergyWh` dient nur der Transparenz und darf nicht für Akkustände, Reservewarnungen oder Ladehalte
  verwendet werden.
- Der verbindliche Bedarf setzt sich aus kalibriertem flachem Grundverbrauch, unskaliertem Steigungszuschlag und
  begrenzter Gefälleentlastung zusammen. Die Komponenten stehen in `energyBreakdown`.

Beim Aufbau streckenbezogener Ladesegmente wird deren Summe deterministisch exakt auf den kalibrierten Etappenbedarf
abgestimmt. Gleiche Profile, Routen, Höhenprofile und Ladepunkte liefern identische Ergebnisse.

## Eingaben

- geordnete Energiesegmente mit Etappe, Start-/End-km, finalem kalibriertem Energiebedarf und Fahrzeit
- nutzbare Akkukapazität und gewünschte Reserve aus dem E-Bike-Profil
- Ladegerätleistung und Ladeverluste aus dem E-Bike-Profil
- Ladepunkte mit ID, Name, Koordinate, Routen-km, Steckertypen und Ladeleistung
- optionale Angaben zu Betreiber, Öffnungszeiten, Kosten und Verfügbarkeit
- optionale manuelle Ladehalte mit Reihenfolge und gewünschter Ziel-Ladung

## Reserve und kritische Stelle

`referenceRangeKm` beschreibt die technische Reichweite bis 0 %. Die gewünschte Reserve wird separat bewertet:

```text
sichere Referenzreichweite = referenceRangeKm × (1 - desiredReservePercent / 100)
```

Bei 80 km Referenzreichweite und 20 % Reserve liegt die sichere Grenze auf einer flachen Referenzstrecke bei 64 km. Eine
flache Tour über 100 km benötigt ohne Ladehalt 125 % der nutzbaren Gesamtenergie. Die Ladeplanung muss daher eine
Reserveunterschreitung, einen leeren Akku oder einen notwendigen Ladehalt ausweisen.

Die Ladeplanung beginnt am Tourstart mit der vollständig nutzbaren Kapazität:

```text
nutzbare Kapazität = Akkukapazität × Anzahl Akkus × nutzbarer Anteil
Reserveenergie = nutzbare Kapazität × gewünschte Reserve
Ankunftsenergie = vorherige Abfahrtsenergie − Energiebedarf bis zum Ladepunkt
```

Der Akkustand wird über Etappen hinweg fortgeschrieben. Anders als die isolierte Etappenprognose beginnt daher nicht jede
Etappe erneut mit vollem Akku. Die erste kritische Stelle ist der Punkt, an dem der kumulierte Energiebedarf erstmals die
Energie oberhalb der Reserve aufbraucht. Innerhalb eines Energiesegments wird dieser Routen-km linear interpoliert.

## Ladepunktquellen

Die Planung verwendet ausschließlich bereits im TourState vorhandene oder ausdrücklich erfasste Daten:

- POI der Kategorie `EBIKE_CHARGING` oder mit belegtem Lade-Merkmal
- ausgewählte Unterkünfte mit belegter E-Bike-Lademöglichkeit
- manuell erfasste Ladepunkte

Es gibt keine Live-Abfrage externer Ladesäulen. Öffnungszeiten und Kosten werden nur angezeigt und nicht interpretiert.
Ein Punkt mit Status `unavailable` wird automatisch nicht ausgewählt.

## Automatische Priorisierung

Wenn das nächste manuelle Ziel oder das Tourziel nicht unter Einhaltung der Reserve erreicht wird, sucht der Algorithmus
reproduzierbar einen Ladepunkt:

1. nur Punkte vor dem nächsten manuellen Ziel oder Tourziel
2. nicht als `unavailable` gekennzeichnet
3. noch nicht verwendet
4. mit der aktuellen Restenergie physisch erreichbar
5. zuerst Punkte, bei deren Ankunft die Reserve erhalten bleibt
6. danach der am weitesten fortgeschrittene Routen-km
7. bei Gleichstand höhere bekannte Ladeleistung und anschließend lexikografische ID

Kann kein Punkt unter Erhaltung der Reserve erreicht werden, darf ein physisch noch erreichbarer Punkt verwendet werden;
die Reserveunterschreitung wird ausdrücklich gewarnt. Ist kein Punkt vor der Entladung erreichbar, ist der Plan nicht
durchführbar.

Automatische Ladehalte laden nur so viel wie erforderlich:

- reicht eine Teil-Ladung bis zum nächsten Ziel einschließlich Reserve, wird genau diese Zielenergie verwendet;
- ist dafür mehr als die nutzbare Kapazität nötig, wird bis 100 % geladen und später ein weiterer Ladehalt gesucht.

## Manuelle Ladehalte

Manuelle Ladehalte besitzen eine gespeicherte Reihenfolge und eine Ziel-Ladung von 80, 90 oder 100 %. Änderungen lösen
unmittelbar eine vollständige Neuberechnung aus.

Die Reihenfolge muss dem Verlauf der Route entsprechen. Eine rückwärts laufende Reihenfolge wird als nicht durchführbar
gewarnt. Reicht die gewählte Ziel-Ladung nicht bis zum nächsten Ladehalt oder Ziel und ist kein weiterer Punkt erreichbar,
erscheint zusätzlich die Warnung `geplante Ladung reicht nicht aus`.

## Ladezeit

Die wirksame Ladeleistung ist durch Ladepunkt und eigenes Ladegerät begrenzt:

```text
wirksame Leistung = min(Ladepunktleistung, Ladegerätleistung)
Verlustenergie = nachgeladene Akkuenergie × Ladeverlustanteil
Ladezeit in Stunden = (nachgeladene Akkuenergie + Verlustenergie) / wirksame Leistung
```

Ist die Ladepunktleistung unbekannt, wird für die reproduzierbare Schätzung die konfigurierte Ladegerätleistung verwendet
und eine Warnung ausgegeben. Die Tourzeit ergibt sich aus vorhandener Fahrzeit plus Ladezeit. Pausen-, Rüst- und
Wartezeiten sind nicht enthalten.

## Datenhaltung

Im TourState wird `chargingPlanning` mit `schemaVersion: 1` gespeichert:

- `customPoints`: eigene Ladepunkte in stabiler Routenreihenfolge
- `manualStops`: Ladepunktreferenz, Reihenfolge und Ziel-Ladung

Automatische Ladehalte und Rechenergebnisse werden aus den gespeicherten Eingaben neu erzeugt und nicht als zweite
Wahrheit persistiert. Alte TourStates ohne `chargingPlanning` werden mit einem leeren Version-1-Modell geladen.
Tour-Export und -Import übernehmen das Modell unverändert validiert.

## Beispiel

```text
Nutzbare Kapazität: 500 Wh
Reserve: 100 Wh
Ankunft Ladepunkt: 140 Wh (28 %)
Benötigte Abfahrt: 280 Wh (56 %)
Nachladung: 140 Wh
Ladeverluste: 14 Wh
Wirksame Leistung: 250 W
Ladezeit: rund 37 Minuten
```

## Verbindliche Integrationsregressionen

- 500 Wh / 80 km Referenzreichweite / 100 km flach benötigt 625 Wh und mindestens einen Ladehalt.
- Die Reservewarnung verwendet den kalibrierten Bedarf und tritt an der korrigierten kritischen Stelle auf.
- 100 km mit 100, 1.000 und 2.000 positiven Höhenmetern ergeben monoton steigende Energie- und Ladebedarfe.
- Save/Load, manuelle Ladehalte und deterministische Wiederholung verändern keine Energie-, Reserve- oder Ladewerte.

## Warnungen

- keine erreichbare Ladestation
- Reserve unterschritten
- geplante Ladung reicht nicht aus
- Ladeleistung unbekannt
- Ladepunkt nicht verfügbar
- manuelle Reihenfolge widerspricht dem Routenverlauf

## Bekannte Grenzen

- keine Live-Verfügbarkeit oder automatische Prüfung von Öffnungszeiten
- keine Reservierung und keine Online-Dienste
- keine Wetter-, Wind- oder Verkehrsdaten
- keine Ladeleistungskurve abhängig vom Akkustand; konstante wirksame Leistung
- keine automatische Änderung von Route oder Etappengrenzen
- keine Bewertung von Steckdosenkompatibilität über die dokumentierten Steckertypen hinaus
- alle Ergebnisse sind Planungshilfen, keine Garantie für reale Reichweite oder Verfügbarkeit
