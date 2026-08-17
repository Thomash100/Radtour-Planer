# Deterministische Mehrzielbewertung von Routenalternativen

Stand: 2026-08-04
Paket: 23
Branch: `codex/multi-criteria-route-optimizer`

## Zweck und Abgrenzung

Paket 23 bewertet ausschließlich bereits vorhandene Routenalternativen. Eine Alternative ist eine gespeicherte GPX-, BRouter- oder anderweitig belegte Liniengeometrie. Der Optimizer erzeugt keine Geometrie, verändert keine Geometrie und ruft keinen Router auf.

Die Berechnung ist:

- deterministisch und ohne Systemzeit oder Zufall,
- UI-, Browser-, Datenbank- und netzwerkunabhängig,
- vollständig offline ausführbar, sobald die Kandidaten lokal vorhanden sind,
- additiv zu den bestehenden Energie-, Lade-, Assistance-, Fahrstrategie- und Streckenmodellen.

Nicht enthalten sind Landschaftsattraktivität, Verkehr, Wetter, Wind, Live-Daten, KI, neue Routenberechnung und automatische Übernahme einer Empfehlung.

## Modellversionen

- Bewertungsmodell: `biketriphub-route-optimizer-v1`
- Pareto-Modell: `biketriphub-route-optimizer-pareto-v1`
- Preset-Vertrag: Version `1`
- TourState-Vertrag: Version `1`

Das Ergebnis enthält Modellversionen und einen stabilen Fingerprint über Kandidaten, Parameter und Grenzen. Eine fachlich inkompatible Formeländerung erfordert eine neue Hauptversion.

## Kandidatenvertrag

`RouteCandidate` enthält mindestens:

- stabile ID, Name, Quelle und unveränderte `LineString`-Geometrie,
- Geometrie-Fingerprint,
- Distanz, Fahrzeit sowie positive und negative Höhenmeter,
- maximale Steigung,
- Energiebedarf, Zielakku und kleinste Reserve entlang der Route,
- Ladehalte und gesamte Ladezeit,
- Asphalt-, unbefestigte und unbekannte Anteile,
- Komfortwert,
- Datenqualität, Warnungen und Versionen der verwendeten Fachmodelle.

Fehlende Werte sind `null`, nie ein erfundener Nullwert. Der Adapter `src/lib/route-optimizer-candidate.ts` leitet diese Werte aus einem vorhandenen `StoredTourState` ab. Er nutzt unverändert:

- `biketriphub-energy-v2`,
- `biketriphub-charging-v1`,
- `biketriphub-assistance-v1`,
- `biketriphub-riding-strategy-v1`,
- `biketriphub-route-condition-v1`.

Die letzten drei Modellversionen werden als Herkunft dokumentiert; der Optimizer ändert ihre Formeln nicht.

## Ziele und Richtungen

| Ziel | Richtung | Rohwert |
| --- | --- | --- |
| Fahrzeit | minimieren | Stunden |
| Energiebedarf | minimieren | Wh |
| Komfort | maximieren | 0 bis 100 |
| Asphaltanteil | maximieren | Prozent |
| Steigungsbelastung | minimieren | maximale positive Steigung in Prozent |
| Akkureserve | maximieren | kleinster Akkustand entlang der Route in Prozent |
| Ladezeit | minimieren | Minuten |
| Ladehalte | minimieren | Anzahl |

Vordefinierte Strategien sind Ausgewogen, Schnell, Energiesparend, Komfortorientiert, Asphalt bevorzugt und Hohe Akkureserve. Benutzerdefinierte Gewichte sind möglich.

## Gewichtung

Für nichtnegative Gewichte `w_i` gilt:

```text
W = Summe(w_i)
normiertes Gewicht g_i = w_i / W
```

Eine Summe von null, negative oder nicht endliche Gewichte sind ungültig. Nach deterministischer Rundung wird eine mögliche Rundungsdifferenz am ersten aktiven Ziel korrigiert, sodass die Summe exakt `1` ergibt.

## Normalisierung

Rohwerte werden je Vergleichsmenge auf einen Nutzen von `0` bis `1` abgebildet:

```text
Maximierungsziel: n_i(x) = (x - L) / (U - L)
Minimierungsziel: n_i(x) = (U - x) / (U - L)
```

Werte außerhalb der Grenzen werden vor der Abbildung auf `[L, U]` begrenzt.

Grenzen:

- weniger als vier bekannte Werte: Minimum und Maximum,
- ab vier bekannten Werten: Median plus/minus drei mediane absolute Abweichungen, auf beobachtetes Minimum/Maximum begrenzt,
- identische Werte: Nutzen `1` für alle Kandidaten,
- keine bekannten Werte: Ziel bleibt unbekannt.

Die robuste Begrenzung verhindert, dass ein einzelner extremer Ausreißer alle anderen Unterschiede zusammendrückt. Methode, Grenzen und Anzahl bekannter Werte werden im Ergebnis ausgewiesen.

## Score und fehlende Werte

Der Gesamtscore ist:

```text
Score(k) = Summe(g_i × n_i(k))
```

Ein fehlender Zielwert erhält weder einen günstigen noch einen neutralen Ersatzwert. Sein Beitrag ist `0`; zusätzlich wird die gewichtete Zielabdeckung ausgewiesen:

```text
Abdeckung(k) = Summe(g_i für bekannte Ziele von k)
```

Eine Empfehlung mit Abdeckung kleiner `100 %` ist eingeschränkt. Damit kann ein Kandidat mit fehlenden Daten nicht unbemerkt von einer scheinbar guten Schätzung profitieren.

## Harte Grenzen

Vor Score und Empfehlung werden optional folgende Grenzen geprüft:

- Mindestreserve am Ziel,
- Mindestreserve entlang der Route,
- maximale gesamte Ladezeit,
- maximale Anzahl Ladehalte,
- maximaler Anteil unbekannter Streckendaten,
- maximaler Anteil unbefestigter Wege,
- maximale Steigung,
- Mindest-Datenqualität.

Eine verletzte Grenze schließt den Kandidaten aus. Fehlt ein für eine aktive Grenze erforderlicher Wert, wird der Kandidat ebenfalls ausgeschlossen und die fehlende Prüfbarkeit ausdrücklich genannt. Sind alle Kandidaten ausgeschlossen, gibt es keine Empfehlung.

## Pareto-Front

Die Pareto-Prüfung verwendet alle Ziele mit positivem Gewicht. Kandidat A dominiert Kandidat B, wenn A in keinem aktiven Ziel schlechter und in mindestens einem aktiven Ziel besser ist.

- Nicht ausgeschlossene, nicht dominierte Kandidaten bilden die Pareto-Front.
- Gegenseitige Vorteile werden als Zielkonflikt gekennzeichnet.
- Identische Zielwerte sind fachlich gleichwertig.
- Fehlt bei einem Paar ein aktiver Wert, ist das Paar nicht vollständig vergleichbar.
- Ausgeschlossene Kandidaten nehmen nicht an der Pareto-Front teil.

## Stabile Rangfolge und Gleichstände

Die zentrale stabile Reihenfolge verwendet nacheinander:

1. zulässig vor ausgeschlossen,
2. empfohlener Kandidat,
3. Pareto-Status,
4. höherer Score,
5. höhere Datenqualität,
6. höhere Mindestreserve,
7. kürzere Fahrzeit,
8. lexikografische Kandidaten-ID.

Die Kandidaten-ID ist nur ein technischer Tie-Breaker. Fachlich identische Kandidaten werden als gleichwertig ausgewiesen; maximal einer trägt das Empfehlungskennzeichen. Eine manuelle Wahl ändert keine Scores und wird ausdrücklich als Vergleichsfavorit bezeichnet.

## Datenqualität und Erklärungen

Jede Bewertung enthält:

- Vorteile und Nachteile aus den normierten Zielen,
- Zielkonflikte,
- verletzte Grenzen,
- unbekannte oder unvollständige Werte,
- Oberflächenabdeckung und Datenqualität,
- Gründe und Einschränkungen einer Empfehlung.

Unbekannte Oberfläche bleibt unbekannt. Landschaft, Verkehr, Wetter oder andere nicht belegte Merkmale werden weder bewertet noch behauptet.

## Persistenz

Der `TourState` speichert versioniert:

- Strategie und Rohgewichte,
- normierte Gewichte,
- harte Grenzen,
- Kandidatenreferenzen mit Quellen- und Geometrie-Fingerprint,
- manuelle Auswahl,
- auf der Karte ausgeblendete Kandidaten,
- Darstellungsmodus,
- letzten Eingabe-Fingerprint und empfohlene Kandidaten-ID.

Alte TourStates erhalten beim Laden die ausgewogene Standardkonfiguration. Der gespeicherte Zustand enthält keine duplizierten Geometrien; diese bleiben Bestandteil der jeweiligen gespeicherten Tour.

## Offline- und Quellenverhalten

- Vorhandene GPX-Geometrien sind offline vergleichbar; unbelegte Oberfläche bleibt unbekannt.
- Bereits gespeicherte BRouter-Geometrien sind offline vergleichbar.
- Paket 23 erzeugt keine neuen BRouter-Alternativen.
- Ein neuer Kandidat kann später nur durch den vorhandenen konfigurierten Routingpfad entstehen. Ein externer BRouter benötigt Netzwerk; eine lokale BRouter-Instanz kann offline arbeiten.
- Öffentliche Overpass- oder Nominatim-Instanzen sind keine Produktionsabhängigkeit des Optimizers.

## Beispiel

Alternative A ist schneller, benötigt aber mehr Energie. Alternative B ist langsamer, besitzt mehr Reserve und Asphalt. Beide können auf der Pareto-Front liegen. Mit dem Preset Schnell wird A empfohlen; mit Hohe Akkureserve kann B empfohlen werden. Die Geometrien und alle absoluten Fachwerte bleiben in beiden Läufen gleich, nur normierte Gewichte und Beiträge ändern sich.

## Bekannte Grenzen

- Bewertet werden nur lokal vorhandene Alternativen; es gibt keine Routensuche.
- Ein Vergleich mit nur einem Kandidaten ist technisch möglich, aber fachlich keine Alternativenentscheidung.
- Scorewerte sind relativ zur aktuellen Kandidatenmenge und nicht zwischen unterschiedlichen Vergleichsmengen absolut vergleichbar.
- Qualitätsschwache Eingaben können eine eingeschränkte Empfehlung liefern.
- Landschaft, Verkehr, Wetter, Wind, Live-Verfügbarkeit und KI-Optimierung sind nicht Bestandteil des Modells.
