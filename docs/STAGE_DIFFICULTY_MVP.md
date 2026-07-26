# Etappenbewertung nach Schwierigkeit und Belastung

Dieses Dokument beschreibt die MVP-Bewertung je Etappe. Die Bewertung ist eine Planungshilfe für mehrtägige Radtouren und ersetzt keine Sicherheits-, Wetter-, Gesundheits- oder Fitnessprüfung.

## Bewertete Faktoren

Je Etappe werden aktuell folgende Werte verwendet:

- Distanz in Kilometern
- Höhenmeter bergauf
- Höhenmeter bergab
- Steigungsdichte in Höhenmetern bergauf pro Kilometer
- geschätzte Fahrzeit aus der vorhandenen MVP-Geschwindigkeit

Die Bewertung verändert die Route nicht. Auffällige Etappen erhalten Hinweise und Vorschläge zur Entlastung. Im Schritt `Etappen erzeugen` kann der Nutzer zusätzlich ausdrücklich eine neue, zusammenhängende Aufteilung nach Ziel-Schwierigkeit anfordern.

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

## Etappen nach Ziel-Schwierigkeit planen

Neben Etappenlänge und Reisetagen stehen vier Zielniveaus zur Verfügung:

- `leicht`: Zielwert etwa `28`, maximal `34` Punkte
- `mittel`: Zielwert etwa `50`, maximal `64` Punkte
- `schwer`: Zielwert etwa `76`, maximal `89` Punkte
- `sehr schwer`: Zielwert etwa `94`, maximal `100` Punkte

Die Planung untersucht fortlaufende Abschnitte der aktuellen Arbeitsroute. Sie sucht Etappengrenzen, deren Belastung möglichst nahe am Zielwert liegt und den Maximalwert nicht überschreitet. Abschnitte mit vielen Höhenmetern werden dadurch in der Regel kürzer als flache Abschnitte. Alle Vorschläge bleiben lückenlose Teile derselben GPX- oder BRouter-Geometrie; es findet kein neues Routing statt.

Die Ergebnisvorschau zeigt je Tag Distanz, Höhenmeter und Belastungspunkte. Sind vorhandene Etappen gespeichert oder manuell bearbeitet, werden sie erst nach einer ausdrücklichen Bestätigung ersetzt. Diese Bestätigung erscheint direkt im Schritt `Etappen erzeugen` und wird automatisch fokussiert. Kann ein sehr belastender Abschnitt selbst bei einer kurzen Etappe das Zielniveau nicht einhalten, bleibt die Route vollständig und die App zeigt eine Warnung.

Wenn ein echtes Höhenprofil vorhanden ist, werden dessen interpolierte Werte für Route, Kürzung und Etappenschnitt verwendet. Fehlt es, bleibt die Planung funktionsfähig, kennzeichnet die verwendeten Höhendaten aber ausdrücklich als geschätzt.

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

Die Vorschläge sind bewusst Hinweise. Eine Neuaufteilung erfolgt nur nach Auswahl des Zielniveaus und ausdrücklicher Aktion; vorhandene Etappen werden nur nach gesonderter Bestätigung ersetzt.

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
- automatische Neuoptimierung oder Verlagerung der Route

Die Bewertung ist damit eine nachvollziehbare Planungsanzeige, keine Garantie für reale Befahrbarkeit oder Sicherheit.
