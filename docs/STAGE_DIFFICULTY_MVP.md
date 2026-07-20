# Etappenbewertung nach Schwierigkeit und Belastung

Dieses Dokument beschreibt die MVP-Bewertung je Etappe. Die Bewertung ist eine Planungshilfe für mehrtägige Radtouren und ersetzt keine Sicherheits-, Wetter-, Gesundheits- oder Fitnessprüfung.

## Bewertete Faktoren

Je Etappe werden aktuell folgende Werte verwendet:

- Distanz in Kilometern
- Höhenmeter bergauf
- Höhenmeter bergab
- Steigungsdichte in Höhenmetern bergauf pro Kilometer
- geschätzte Fahrzeit aus der vorhandenen MVP-Geschwindigkeit

Die Bewertung verändert die Route nicht automatisch und optimiert keine Etappen neu. Auffällige Etappen erhalten Hinweise und Vorschläge zur Entlastung.

## MVP-Formel

Die Rohbelastung folgt bewusst einer einfachen, erklärbaren Formel:

```text
Rohbelastung =
  Distanz-km
  + Hm bergauf / 10
  + Hm bergab / 25
  + Zuschlag bei Steigungsdichte > 15 Hm/km
  + Zuschlag bei sehr langer Etappe
```

Damit die Anzeige als Punktwert von 0 bis 100 lesbar bleibt, wird die Rohbelastung im MVP durch `1,9` geteilt, gerundet und anschließend auf `0..100` begrenzt.

```text
Belastungspunkte = clamp(round(Rohbelastung / 1,9), 0, 100)
```

## Schwellen

- `0..34`: leicht
- `35..64`: mittel
- `65..89`: schwer
- `90..100`: sehr schwer

Die Schwellen sind MVP-Werte und müssen nach echten Tourdaten, Nutzerfeedback und weiteren Routentypen kalibriert werden.

## Zusatzhinweise

Die App markiert Etappen unter anderem bei:

- langen Etappen ab ca. 75 km
- sehr langen Etappen ab ca. 95 km
- vielen Höhenmetern bergauf ab ca. 900 Hm
- hoher Steigungsdichte über 15 Hm/km
- langen Abfahrten ab ca. 900 Hm bergab
- fehlenden oder unvollständigen Höhendaten

Typische Vorschläge sind:

- Etappe verkürzen oder Etappenende vorziehen
- Anstiegslast auf benachbarte Etappen verteilen
- Pausen sowie Brems- und Technikreserve einplanen
- zusätzlichen Reisetag oder kürzere Tagesdistanz prüfen

Die Vorschläge sind bewusst Hinweise. Eine automatische Neuaufteilung erfolgt nur nach gesonderter Bestätigung in bestehenden Etappenfunktionen.

## Referenzfälle

- `60 km`, `300 Hm bergauf`, `250 Hm bergab`: eher mittel
- `45 km`, `1000 Hm bergauf`: schwer
- `80 km`, `150 Hm bergauf`: mittel bis schwer wegen Länge; im MVP als mittel mit Längenhinweis
- `50 km`, `200 Hm bergauf`, `1200 Hm bergab`: Warnung wegen langer Abfahrt

## Grenzen

Nicht berücksichtigt werden im MVP:

- Wetter, Wind, Temperatur oder Tageslicht
- Straßenbelag, Verkehr, Untergrund oder Schiebepassagen
- individuelle Fitness, Alter, Gesundheit oder Gruppendynamik
- E-Bike-Akkureichweite, Ladeplanung oder Unterstützungsstufe
- medizinische oder sicherheitsrelevante Eignung
- automatische Neuoptimierung der Route

Die Bewertung ist damit eine nachvollziehbare Planungsanzeige, keine Garantie für reale Befahrbarkeit oder Sicherheit.
