# Übergabevertrag für die E-Bike-Ladeplanung

Paket 19 wird in Draft-PR #69 entwickelt. Der Raspberry-Pi-Praxistest hat gezeigt, dass der ursprüngliche Paket-18-Core
die persönliche Referenzreichweite nicht verwendete. Deshalb bleibt PR #69 bis zur Integration von
`biketriphub-energy-v2` im Draft.

## Verbindliche Energiequelle

Die Ladeplanung darf ausschließlich den kalibrierten Verbrauch verwenden:

- `StageEnergyProjection.batteryEnergyWh` ist der verbindliche Gesamtbedarf der Etappe.
- `terrain.*.batteryEnergyWh` enthält den kalibrierten Bedarf des jeweiligen Segmenttyps.
- `physicalRawBatteryEnergyWh` dient nur der Transparenz und darf nicht für Akkustände, Reservewarnungen oder Ladehalte
  verwendet werden.
- Der verbindliche Bedarf setzt sich aus kalibriertem flachem Grundverbrauch, unskaliertem Steigungszuschlag und
  begrenzter Gefälleentlastung zusammen. Die Komponenten stehen in `energyBreakdown`.

Beim Aufbau streckenbezogener Ladesegmente muss deren Summe deterministisch exakt auf den kalibrierten Etappenbedarf
abgestimmt werden. Gleiche Profile, Routen, Höhenprofile und Ladepunkte müssen identische Ergebnisse liefern.

## Reserve und kritische Stelle

`referenceRangeKm` beschreibt die technische Reichweite bis 0 %. Die gewünschte Reserve wird separat bewertet:

```text
sichere Referenzreichweite = referenceRangeKm × (1 - desiredReservePercent / 100)
```

Bei 80 km Referenzreichweite und 20 % Reserve liegt die sichere Grenze auf einer flachen Referenzstrecke bei 64 km. Eine
flache Tour über 100 km benötigt ohne Ladehalt 125 % der nutzbaren Gesamtenergie. Die Ladeplanung muss daher spätestens
eine Reserveunterschreitung, einen leeren Akku oder einen notwendigen Ladehalt ausweisen.

## Integrationsprüfung nach Merge des Korrektur-PR

Vor einer Freigabe von PR #69 sind verpflichtend:

1. PR #69 auf den aktualisierten Branch `private` rebasen oder sauber neu aufsetzen.
2. Alle Paket-19-Tests erneut ausführen.
3. Einen Regressionstest 500 Wh / 80 km / 100 km ohne Ladehalt ergänzen.
4. Prüfen, dass ein automatischer Ladehalt erforderlich wird und die Reservewarnung den kalibrierten Bedarf verwendet.
5. Prüfen, dass 100 km mit 100, 1.000 und 2.000 positiven Höhenmetern monoton steigende Ladebedarfe ergeben.
6. Save/Load, manuelle Ladehalte und deterministische Wiederholung erneut prüfen.
7. Raspberry-Pi-Praxistest mit denselben Profilwerten wiederholen.

## Grenzen

Diese Korrektur führt keine Live-Ladesäulen, Wetterdaten, Reservierungen oder Online-Dienste ein. Das vollständige
Ladepunktmodell, Ladezeiten und die Oberfläche verbleiben in PR #69.
