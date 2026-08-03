# Kontinuierliches E-Bike-Unterstützungsmodell

- Stand: 2026-08-03
- Paket: 20
- Modellversion: `biketriphub-assistance-v1`
- Branch: `codex/continuous-assistance-model`
- Status: experimentelle Planungshilfe, kein produktiver Energieersatz

## Ziel

Das Unterstützungsmodell empfiehlt für geordnete Streckenabschnitte einen kontinuierlichen Motoranteil, ein verständliches Zieltempo und einen passenden Fahrradmodus. Die Berechnung berücksichtigt:

- kontinuierliche mittlere und maximale Steigung,
- Länge und Dauer des Abschnitts sowie die Dauer eines zusammenhängenden Anstiegs,
- Fahrerfitness und nachhaltige Fahrerleistung,
- Fahrer-, Fahrrad- und Gepäckgewicht,
- Zielreserve und verbleibende Strecke beziehungsweise Höhenmeter,
- Motorleistung und Wirkungsgrad,
- die gewählte Fahrstrategie,
- verfügbare, mit Quelle und Qualität versehene Fahrradmodi.

Die Ausgabe wird in der Etappenansicht ausdrücklich als **Simulation** gekennzeichnet. Sie steuert kein Fahrrad und verändert weder Tour, Etappen, Energie-Core noch Ladeplanung.

## Architekturgrenze

Der reine Core liegt in `src/lib/ebike-assistance.ts`. Er besitzt keine Abhängigkeit von React, Browser-Speicher, Datenbank, Netzwerk, Systemzeit oder Zufall.

```text
RiderBikeProfile + Etappen-Höhenprofil
                 |
                 v
      Assistance-Core v1
        |            |
        |            `--> Moduszuordnung und Begründung
        v
produktiver Energie-Core v2 (nur Funktionsaufruf)
        |
        `--> erwartete Wh je Abschnitt
```

Der Assistance-Core erstellt für die Energieabfrage eine neue, unveränderliche Profilkopie mit dem simulierten Unterstützungsgrad. Das ursprüngliche Profil und `biketriphub-energy-v2` werden nicht verändert.

## Eingaben

Verbindliche Eingaben:

- validiertes `RiderBikeProfile`,
- Etappendistanz,
- geordnetes Höhenprofil,
- Status der Höhendaten (`measured`, `estimated`, `missing`).

Optionale, explizite Eingaben:

- Strategie,
- benutzerdefinierte Strategieparameter,
- belegte Fahrradmodi,
- Startakku in Prozent,
- verbleibende Distanz und positive Höhenmeter,
- Motorwirkungsgrad.

Fehlende Höhendaten werden nicht durch eine erfundene Abschnittsreihenfolge ersetzt. Ohne hinreichendes Profil lautet der Status `incomplete` und es entstehen keine scheinbar präzisen Abschnitte.

## Segmentierung

Das validierte Höhenprofil wird nach Distanz sortiert, auf den Etappenstart bezogen und in stabile Analyseabschnitte zerlegt.

```text
Zielabschnitt = clamp(Etappendistanz / 24, 0,5 km, 3 km)
```

Damit entstehen höchstens ungefähr 24 Abschnitte je Etappe. Kurze Etappen behalten eine feinere Auflösung; lange Etappen bleiben auf Raspberry-Pi-Hardware überschaubar.

Je Abschnitt werden bestimmt:

- Start- und Endkilometer,
- Länge,
- mittlere Steigung aus Abschnittsanfang und -ende,
- maximale lokale Steigung aus den überlappenden Höhenprofilsegmenten,
- Abschnittsdauer beim empfohlenen Zieltempo,
- Gesamtdauer des zusammenhängenden Anstiegs.

Ein zusammenhängender Anstieg umfasst benachbarte Abschnitte ab 0,5 % mittlerer Steigung. Die Unterstützungsformel verwendet seine gesamte Dauer und nicht nur die Dauer des aktuellen Analyseabschnitts.

## Physikalische Leistungsbasis

Für Zielgeschwindigkeit `v`, Gesamtmasse `m` und Steigungswinkel `theta` wird die benötigte Radleistung berechnet:

```text
F_roll  = Crr * m * g * cos(theta)
F_grade = m * g * sin(theta)
F_air   = 0,5 * rho * CdA * v²

P_wheel = max(0, (F_roll + F_grade + F_air) * v)
```

Annahmen:

- `g = 9,80665 m/s²`,
- `rho = 1,225 kg/m³`,
- Rollwiderstand und Stirnfläche werden wie im Energie-Core anhand des Fahrradtyps gewählt,
- Wind, Temperatur und Untergrundkorrekturen sind in Paket 20 nicht aktiv,
- Gefälle erzeugt keine Rekuperation und keine negative Akkuenergie.

## Nachhaltige Fahrerleistung

Die bestehende, profilbasierte Fahrerleistung aus dem Energie-Core wird mit dem Strategiefaktor multipliziert und auf 40 bis 400 W begrenzt.

Lange und steile Anstiege reduzieren die für den gesamten Anstieg angenommene nachhaltige Fahrerleistung kontinuierlich:

```text
durationRelief = strategyRelief
               * (1 - exp(-climbDurationMinutes / 8))
               * clamp(positiveGrade / 8, 0, 1,5)
```

Es gibt keine sprunghafte Änderung an den sichtbaren Steigungsklassen.

## Strategien

| Strategie | Basistempo | Fahrerfaktor | Basis-Unterstützung | Entlastung langer Anstiege | maximaler Reserve-Tempoabschlag |
| --- | ---: | ---: | ---: | ---: | ---: |
| Energiesparend | 16 km/h | 0,95 | 35 % | 8 % | 25 % |
| Ausgewogen | 18 km/h | 0,85 | 75 % | 16 % | 18 % |
| Komfortabel | 17 km/h | 0,65 | 135 % | 30 % | 12 % |
| Schnell | 22 km/h | 1,05 | 95 % | 12 % | 8 % |

Die UI verwendet in Paket 20 die bereits gespeicherte persönliche Fahrweise:

- `economical` → Energiesparend,
- `balanced` → Ausgewogen,
- `sportive` → Schnell.

Der Core unterstützt zusätzlich `comfort` und eine benutzerdefinierte Strategie. Benutzerdefinierte Werte benötigen vollständige bestätigte Parameter; andernfalls wird `incomplete` ausgegeben. Ein eigener Strategieeditor ist nicht Bestandteil von Paket 20.

## Zielgeschwindigkeit und Reserve

Die Zielgeschwindigkeit wird kontinuierlich aus Basistempo, Steigung und Reservebedarf abgeleitet:

```text
gradeSpeed = baseSpeed
           - 0,72 * positiveGradePercent
           + 0,22 * negativeGradePercent

targetSpeed = clamp(
  gradeSpeed * (1 - reserveReduction * reservePressure),
  6 km/h,
  30 km/h
)
```

`reservePressure` vergleicht aktuellen Akku mit:

- gewünschter Zielreserve,
- flachem Referenzbedarf der verbleibenden Distanz,
- physikalischem Lageenergiebedarf der verbleibenden positiven Höhenmeter.

Ist die Reserve gefährdet, wird zuerst das Zieltempo reduziert. Die Simulation behauptet keine zusätzliche Motor- oder Akkuenergie.

## Kontinuierlicher Motoranteil

Aus Radleistung, Strategie und nachhaltiger Fahrerleistung ergibt sich ein gewünschter Fahreranteil. Die Differenz ist die rechnerisch benötigte mechanische Motorleistung:

```text
P_rider_base = P_wheel / (1 + baseAssistanceRatio)
P_rider      = min(P_rider_sustainable, P_rider_base)
P_motor_need = max(0, P_wheel - P_rider)
ratio        = P_motor_need / max(40 W, P_rider)
```

Der ausgegebene Mittelpunkt wird auf den höchsten verfügbaren Modusbereich und maximal 400 % begrenzt. Ein Unsicherheitsbereich wird aus Höhenprofilqualität und Unterschied zwischen mittlerer und maximaler Steigung gebildet.

Übersteigt die benötigte Motorleistung die im Profil gespeicherte Grenze, bleibt der fachlich benötigte Anteil sichtbar. Zusätzlich erscheint eine Warnung, dass Zieltempo oder Fahrerleistung unter realen Grenzen nicht abgesichert sind.

## Moduszuordnung

Bis ein separat beauftragtes Fahrradprofil-Importpaket ein herstellerbezogenes Profil liefert, gelten sichtbar als `generic` und Qualität `medium` gekennzeichnete Bereiche:

| Modus | Motor-/Fahrer-Verhältnis |
| --- | ---: |
| Aus | 0–10 % |
| Eco | 10–80 % |
| Tour | 80–150 % |
| Sport | 150–250 % |
| Turbo | 250–400 % |

Der Core akzeptiert stattdessen belegte Hersteller- oder Benutzermodi mit Quelle und Qualität. `Auto` wird ohne Herstellerdaten nicht als fester Prozentwert erfunden.

## Sichtbare Steigungsklassen

Die Klassen dienen ausschließlich der Erklärung. Keine dieser Grenzen wird in der kontinuierlichen Unterstützungsformel verwendet:

- deutliches Gefälle,
- leichtes Gefälle,
- nahezu eben,
- 0,5–2 %,
- 2–4 %,
- 4–6 %,
- 6–8 %,
- 8–10 %,
- 10–12 %,
- 12–15 %,
- über 15 % / Grenzbereich.

Im Grenzbereich ab 15 % weist die App zusätzlich auf reale Motorgrenzen, Untergrund und Fahrbarkeit hin.

## Energie und Akkustand

Die erwartete Abschnittsenergie wird ausschließlich durch `calculateStageEnergyProjection()` aus `biketriphub-energy-v2` bestimmt. Eingesetzt werden:

- Abschnittsdistanz und reale Höhendifferenz,
- unverändertes Fahrer-/Fahrradprofil als Kopie,
- simulierter kontinuierlicher Unterstützungsgrad,
- nachhaltige Fahrerleistung und Motorwirkungsgrad.

Die Batterie wird innerhalb der Etappe abschnittsweise fortgeschrieben. Paket 20 startet die isolierte Etappensimulation mit dem explizit übergebenen Startakku, in der UI mit 100 %. Ladehalte werden noch nicht einbezogen; die produktive Ladeplanung bleibt separat verbindlich.

## Qualität und Warnungen

Qualität `hoch` erfordert:

- gemessenes Höhenprofil,
- mindestens 98 % Abdeckung,
- höchstens 3 km Abstand zwischen Höhenpunkten.

Geschätzte oder dünnere Profile erreichen höchstens `mittel`. Unvollständige oder unbelegte Profile sind `niedrig` beziehungsweise `incomplete`.

Warnungen entstehen mindestens bei:

- Motorleistungsgrenze,
- Überschreitung nachhaltiger Fahrerleistung,
- Zielreserve unterschritten,
- Akku vor Abschnittsende erschöpft,
- Steigung ab 15 %,
- niedriger Höhenprofilqualität.

## Determinismus

Der Core verwendet keine Zeit-, Zufalls-, Netzwerk- oder Speicherabhängigkeit. Sortierung, Segmentgrenzen, Summenreihenfolge und Rundung sind fest. Identische Eingaben erzeugen identische Objekte.

Persistiert wird kein berechneter Parallelzustand. Nach Save/Load entstehen aus Route und Profil dieselben Werte erneut.

## Bekannte Grenzen

- keine Telemetrie oder persönliche Kalibrierung,
- keine herstellerspezifischen Modi ohne belegte Profildaten,
- keine Wind-, Temperatur-, Untergrund- oder Akkualterungskorrektur,
- keine Ladehalte innerhalb der Unterstützungssimulation,
- keine automatische Tour- oder Etappenänderung,
- keine automatische Motorsteuerung,
- Zieltempo ist eine Planungshilfe und keine Fahrbarkeitsgarantie.

Diese Grenzen werden in den Folgepaketen 21 bis 28 getrennt bearbeitet.
