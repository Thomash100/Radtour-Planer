# Deterministischer Energie- und Reichweiten-Rechenkern

Die Modellversion `biketriphub-energy-v2` kalibriert den segmentweisen physikalischen Rechenkern mit der persönlichen
flachen Referenzreichweite. Der Rechenkern liegt in `src/lib/ebike-energy.ts` und ist eine reine Funktion ohne Netzwerk-,
Zeit- oder Zufallsabhängigkeit.

## Bedeutung der Referenzreichweite

`referenceRangeKm` ist die technische Reichweite von 100 % der **nutzbaren Gesamtenergie bis 0 %** unter flachen
Referenzbedingungen. Sie gilt für die gesamte aktuell konfigurierte Akkuanzahl, nicht für einen einzelnen Akku.

```text
nutzbare Gesamtenergie = Kapazität je Akku × Akkuanzahl × nutzbarer Anteil
persönlicher Referenzverbrauch = nutzbare Gesamtenergie / Referenzreichweite
sichere Reichweite = Referenzreichweite × (1 - gewünschte Reserve / 100)
```

Beispiel mit 500 Wh nutzbarer Energie, 80 km Referenzreichweite und 20 % Reserve:

```text
Referenzverbrauch = 500 Wh / 80 km = 6,25 Wh/km
sichere Reichweite = 80 km × 0,8 = 64 km
80 km flach = 500 Wh = 100 % Verbrauch
100 km flach = 625 Wh = 125 % Verbrauch, Akku reicht nicht bis zum Ziel
```

Die Reserve verändert die Referenzreichweite nicht. Sie wird anschließend als Sicherheitsgrenze bewertet. Änderungen an
Akkukapazität, Akkuanzahl, nutzbarem Anteil oder Unterstützungsparametern ändern die Referenzbedingungen. Die Oberfläche
weist deshalb darauf hin, den persönlichen Erfahrungswert danach zu prüfen und gegebenenfalls anzupassen.

## Referenzbedingungen

Die flache physikalische Referenzrechnung verwendet:

- das gespeicherte Fahrer-, Fahrrad- und Gepäckgewicht,
- Fahrradtyp, Motorleistung, Wirkungsgrad, Fitness und persönliches Fahrprofil,
- das gespeicherte Unterstützungsprofil (`eco`, `tour`, `sport` oder `auto`),
- 100 % nominale Motorunterstützung als reproduzierbaren Referenzpunkt,
- keine Steigung, kein Gefälle, keinen Wind und keine Wetterdaten.

Die konfigurierte Motorunterstützung der geplanten Fahrt wird weiterhin in der Segmentrechnung verwendet. Werte über dem
nominalen Referenzpunkt erhöhen, Werte darunter senken den Motoranteil. Der Nominalpunkt wird in der Ergebnisstruktur und
in der Oberfläche ausgewiesen.

## Physikalische Segmentrechnung

Aufeinanderfolgende Höhenpunkte bilden Segmente:

- `Steigung` bei mehr als `0,5 %`,
- `Gefälle` bei weniger als `-0,5 %`,
- sonst `eben`.

Je Segment werden Roll-, Luft- und Lageenergie sowie Fahrer- und Motoranteil bestimmt:

```text
Rollenergie = Rollwiderstandskoeffizient × Gesamtmasse × g × Strecke
Luftenergie = 0,5 × Luftdichte × CdA × Geschwindigkeit² × Strecke
Lageenergie = Gesamtmasse × g × Höhendifferenz
mechanischer Bedarf = max(0, Rollenergie + Luftenergie + Lageenergie)
physikalischer Akku-Rohverbrauch = mechanischer Motoranteil / Motorwirkungsgrad
```

Steigung, Gefälle, Masse, Motorunterstützung und Leistungsgrenzen bleiben damit segmentweise wirksam. Gefälle erzeugt
keine Rekuperation.

## Kalibrierung

Zuerst wird der physikalische Rohverbrauch einer flachen Ein-Kilometer-Referenzstrecke für das aktuelle Profil berechnet.
Danach wird der persönliche Referenzverbrauch darauf bezogen:

```text
Rohfaktor = persönlicher Referenzverbrauch / physikalischer Referenzverbrauch
Kalibrierungsfaktor = begrenze(Rohfaktor, 0,1, 20)
kalibrierter Segmentverbrauch = physikalischer Segmentverbrauch × Kalibrierungsfaktor
```

Die Grenzen verhindern unkontrollierte Extremkorrekturen. Ein Faktor außerhalb `0,5..2` erzeugt einen sichtbaren
Prüfhinweis. Muss die harte Grenze `0,1..20` angewendet werden, werden Rohfaktor, angewandter Faktor und Begrenzung
explizit ausgewiesen.

Die Ergebnisstruktur trennt:

- `physicalRawBatteryEnergyWh`: physikalischer Akku-Rohverbrauch,
- `batteryEnergyWh`: kalibrierter, für Reserve und Ladeplanung verbindlicher Verbrauch,
- `calibrationAdjustmentWh`: Differenz zwischen beiden Werten,
- `conversionLossWh`: reine physikalische Motorumwandlungsverluste,
- persönliche Referenzreichweite und Referenzverbrauch,
- sichere Reichweite bis zur Reserve,
- Rohfaktor, angewandten Faktor und Kalibrierungswarnung.

## Akku, Reichweite und Status

```text
Restenergie = max(0, nutzbare Gesamtenergie - kalibrierter Verbrauch)
Verbrauch in % = kalibrierter Verbrauch / nutzbare Gesamtenergie
Restreichweite = Restenergie / kalibrierter Verbrauch je Kilometer
```

- `sufficient`: Restkapazität liegt auf oder über der Reserve.
- `below_reserve`: Ziel ist erreichbar, aber die Reserve wird unterschritten.
- `depleted`: kalibrierter Bedarf erreicht oder überschreitet die nutzbare Gesamtenergie.
- `not_applicable`: klassisches Fahrrad ohne Akkuwerte.

Jede Etappe startet in Paket 18 rechnerisch mit voller nutzbarer Gesamtenergie. Die etappenübergreifende Fortschreibung und
Ladehalte gehören zu Paket 19; sie müssen nach dem Rebase ausschließlich `batteryEnergyWh` beziehungsweise die daraus
abgeleiteten kalibrierten Segmente verwenden.

## Prognosequalität und Grenzen

Die Prognosequalität bewertet die Höhenbasis:

- `hoch`: vollständiges, dichtes GPX- oder Provider-Höhenprofil,
- `mittel`: geschätztes oder weniger dichtes, weitgehend vollständiges Profil,
- `niedrig`: fehlende oder deutlich unvollständige Höhendaten.

Kalibrierungswarnungen werden davon getrennt dargestellt. Wetter, Wind, Straßenbelag, Reifendruck, Temperatur,
Stop-and-go, Alterung des Akkus und Rekuperation werden weiterhin nicht modelliert. Die Prognose bleibt eine transparente
Planungshilfe und keine Reichweitengarantie.
