# Deterministischer Energie- und Reichweiten-Rechenkern

Paket 18 führt das versionierte Modell `biketriphub-energy-v1` ein. Der Rechenkern liegt in
`src/lib/ebike-energy.ts` und ist eine reine Funktion: Gleiche Eingaben erzeugen ohne Netzwerkzugriff, Zufallswerte oder Zeitabhängigkeit dasselbe Ergebnis.

## Eingaben

- Fahrer-, Fahrrad- und Gepäckgewicht
- Fahrradtyp
- Akkukapazität, Akkuanzahl und nutzbarer Kapazitätsanteil
- Fitnesslevel und persönliches Fahrprofil
- Motorleistung, Motorunterstützung und Unterstützungsprofil
- Distanz, Bergauf- und Bergabmeter
- auf die Etappe zugeschnittenes GPX- oder Provider-Höhenprofil
- optional explizite Fahrerleistung und expliziter Motorwirkungsgrad
- gewünschte Restreserve

Ohne explizite Fahrerleistung wird eine reproduzierbare Modellannahme aus Fitnesslevel und persönlichem Fahrprofil abgeleitet:

| Fitnesslevel | Basisleistung |
| --- | ---: |
| Gelegentlich aktiv | 90 W |
| Regelmäßig aktiv | 125 W |
| Trainiert | 160 W |
| Sehr trainiert | 195 W |

`Reichweitenorientiert`, `Ausgewogen` und `Sportlich` skalieren diese Basis mit `0,9`, `1,0` beziehungsweise `1,1`.

Der Motorwirkungsgrad wird ohne explizite Eingabe deterministisch aus dem Unterstützungsprofil abgeleitet:

| Profil | Wirkungsgrad |
| --- | ---: |
| Eco | 86 % |
| Tour | 83 % |
| Sport | 79 % |
| Automatisch | 82 % |

Beide Modellannahmen werden in der Etappenansicht angezeigt.

## Segmentrechnung

Das vorhandene Höhenprofil wird auf die jeweilige Etappe zugeschnitten. Aufeinanderfolgende Höhenpunkte bilden Segmente:

- `Steigung` bei mehr als `0,5 %`
- `Gefälle` bei weniger als `-0,5 %`
- sonst `eben`

Je Segment werden berechnet:

```text
Rollenergie = Rollwiderstandskoeffizient × Gesamtmasse × g × Strecke
Luftenergie = 0,5 × Luftdichte × CdA × Geschwindigkeit² × Strecke
Lageenergie = Gesamtmasse × g × Höhendifferenz
mechanischer Bedarf = max(0, Rollenergie + Luftenergie + Lageenergie)
```

Rollwiderstand, aerodynamische Stirnfläche und Modellgeschwindigkeit sind feste, dokumentierte Parameter je Fahrradtyp. Steigungen reduzieren und Gefälle erhöhen die Modellgeschwindigkeit innerhalb fester Grenzen.

Die konfigurierte Motorunterstützung bestimmt den gewünschten Motoranteil. Dieser wird durch die Motorleistung je Segment begrenzt. Übersteigt der verbleibende Fahreranteil die aus Fahrerleistung und Segmentdauer ableitbare Leistung, kann der Motor im Rahmen seiner Leistungsgrenze den Fehlbetrag übernehmen.

```text
elektrischer Akkuenergiebedarf = mechanischer Motoranteil / Motorwirkungsgrad
Verlust = elektrischer Akkuenergiebedarf - mechanischer Motoranteil
```

Gefälle erzeugt keine Rekuperation. Wetter, Wind, Straßenbelag, Reifendruck, Temperatur und Stop-and-go werden nicht modelliert.

## Akku und Reichweite

```text
nutzbare Energie = Kapazität je Akku × Anzahl Akkus × nutzbarer Anteil
Restenergie = max(0, nutzbare Energie - Akkuenergiebedarf)
Verbrauch in % = Akkuenergiebedarf / nutzbare Energie
Restreichweite = Restenergie / Akkuenergiebedarf je Kilometer
```

Jede Etappe beginnt in Paket 18 rechnerisch mit der vollständig nutzbaren konfigurierten Akkukapazität. Es gibt noch keine etappenübergreifende Akkufortschreibung, Ladepunktplanung oder Nachladung unterwegs.

Für klassische Fahrräder werden mechanischer Energiebedarf und persönliche Belastung berechnet. Akkuverbrauch, Restkapazität und Reichweite sind ausdrücklich nicht anwendbar.

## Prognosequalität

- `hoch`: vollständiges, dichtes GPX- oder Provider-Höhenprofil
- `mittel`: geschätztes oder weniger dichtes, aber weitgehend vollständiges Höhenprofil
- `niedrig`: fehlende oder deutlich unvollständige Höhendaten; aggregierte Bergauf-/Bergabwerte werden auf Ersatzsegmente verteilt

Die Qualitätsgründe werden zusammen mit dem Ergebnis ausgegeben. Die Prognose ist eine nachvollziehbare Planungshilfe, keine Garantie für reale Reichweite oder Leistungsfähigkeit.

## Abgrenzung

Nicht Bestandteil von Paket 18:

- automatische Etappenverschiebung
- Ladepunkt- oder Nachladeplanung
- alternative Routen
- automatische Unterstützungssteuerung
- Wetter- oder Winddaten
- Paket-19-Optimierung nach Tagen, Schwierigkeit und Akkugrenze
