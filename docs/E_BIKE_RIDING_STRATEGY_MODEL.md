# Adaptive E-Bike-Fahrstrategie

- Modellversion: `biketriphub-riding-strategy-v1`
- Zustandsversion: `1`
- Paket: 21
- Branch: `codex/adaptive-riding-strategy`
- Status: deterministische Offline-Planung, keine Fahrradsteuerung

## Fachliches Ziel

Die Fahrstrategie verbindet die vorhandenen, weiterhin eigenständigen Modelle für Energie, Ladeplanung und kontinuierliche Unterstützung. Sie verteilt die empfohlene Motorunterstützung über die gesamte Tour, damit kommende Steigungen, die gewünschte Reserve und bereits geplante Ladehalte gemeinsam berücksichtigt werden.

Die Strategie verändert weder Route noch Etappen, Energie-Core, Lade-Core oder Unterstützungs-Core. Sie ist eine nachvollziehbare Planungshilfe und keine Garantie für Reichweite, Fahrbarkeit oder gesundheitliche Belastbarkeit.

## Architektur

```text
TourState und Fahrer-/Fahrradprofil
        |
        +--> Energie-Core biketriphub-energy-v2
        +--> Lade-Core biketriphub-charging-v1
        +--> Assistance-Core biketriphub-assistance-v1
                         |
                         v
        Riding-Strategy-Core biketriphub-riding-strategy-v1
                         |
                         v
                Tour- und Etappenanzeige
```

Der Core in `src/lib/ebike-riding-strategy.ts` ist rein und kennt weder React, Browser-Speicher, Datenbank, Netzwerk, Systemzeit noch Zufall.

## Eingaben

Je normalisiertem Streckenabschnitt:

- stabile Abschnitts- und Etappen-ID,
- Etappentag,
- Start- und Endkilometer,
- Distanz,
- durchschnittliche und maximale Steigung,
- Dauer eines zusammenhängenden Anstiegs,
- kontinuierliche Basisunterstützung,
- zulässiger Unterstützungsbereich,
- erwartete Akkuenergie aus dem vorhandenen Modell,
- Prognosequalität.

Tourweit:

- Fahrrad- und E-Bike-Profil,
- gesamte nutzbare Akkukapazität einschließlich Akkuanzahl,
- konfigurierte Reserve,
- Strategiemodus,
- geordnete Ladehalte mit Nachladeenergie und Ladezeit,
- optionale manuelle Vorgabe je Etappe,
- Startakkustand.

Ungültige oder fehlende Energiesegmente führen zu `incomplete`. Unbekannte Werte werden nicht geschätzt.

## Ausgaben

Je Abschnitt:

- empfohlener Unterstützungsgrad in Prozent und als Verhältnis,
- erwarteter Akkuverbrauch in Wh,
- Akkuenergie und Akkustand vor und nach dem Abschnitt,
- verfügbarer Abstand zur strategischen Reserve,
- Quelle `automatic`, `manual` oder `baseline`,
- Sicherheitsstatus `safe`, `caution`, `critical` oder `incomplete`,
- Begründungen und Warnungen.

Je Etappe werden die Abschnitte zu gewichteter Unterstützung, Energie, Start-/Endakku, Reserveabstand, Ladehalten, Quelle und Sicherheitsstatus zusammengefasst. Das Tourergebnis enthält Modellversion, Eingabe-Fingerprint, Ladeenergie, Ladezeit und sämtliche Warnungen.

## Strategiemodi

### Ausgewogen

- verwendet die kontinuierliche Basisempfehlung als Ziel,
- schützt die konfigurierte Reserve,
- verteilt knappe Zusatzenergie bevorzugt auf anspruchsvolle Abschnitte.

### Reichweite

- reduziert die Basisunterstützung deterministisch,
- erhöht die Planungsreserve um zehn Prozentpunkte, höchstens auf 60 Prozent,
- nutzt den unteren belegten Unterstützungsbereich stärker aus.

### Komfort

- erhöht die gewünschte Unterstützung innerhalb der Abschnittsgrenzen,
- darf geplante Ladeenergie stärker nutzen,
- reduziert die strategische Reserve gegenüber der Profilreserve um fünf Prozentpunkte, jedoch nicht unter fünf Prozent.

### Manuell

- übernimmt vorhandene kontinuierliche Werte und Etappen-Overrides,
- verändert diese nicht automatisch,
- weist Reserve- oder Erreichbarkeitskonflikte aus, statt Werte still zu korrigieren.

## Energieabbildung

Die Strategie berechnet kein neues physikalisches Energiemodell. Sie skaliert ausschließlich den vom Assistance-Core gelieferten Abschnittsbedarf relativ zur dortigen Basisunterstützung:

```text
E_strategy = E_base * u_strategy / max(0,05, u_base)
```

Bei Unterstützung null ist die elektrische Strategieenergie null. Der Fahrerbedarf wird dadurch nicht als null behauptet; er bleibt Bestandteil der vorhandenen Energie- und Belastungsmodelle.

Diese lineare Abbildung ist bewusst transparent und bleibt eine Planungsnäherung. Eine spätere Telemetrie- oder Kalibrierungslogik darf sie nur in einem eigenen Paket und mit neuer Modellversion ersetzen.

## Tourweite Optimierung

Die Tour wird an geplanten Ladehalten in Energieabschnitte geteilt. Für jeden Abschnitt gelten folgende Schritte:

1. Manuelle Vorgaben als unveränderliche Werte markieren.
2. Für automatisch steuerbare Segmente minimale und gewünschte Unterstützung bestimmen.
3. Nutzbares Energiebudget bis zum nächsten Ladehalt beziehungsweise Tourziel unter Abzug der strategischen Reserve bestimmen.
4. Prüfen, ob bereits die Mindeststrategie das Ziel erreicht.
5. Verfügbare Zusatzenergie nach fester Priorität verteilen.
6. Akku segmentweise fortschreiben.
7. Nachladeenergie am geordneten Ladehalt addieren und auf die Gesamtkapazität begrenzen.

Priorität für knappe Zusatzenergie:

```text
1 + positive Durchschnittssteigung / 6
  + positive Maximalsteigung / 18
  + min(1,5; zusammenhängende Anstiegsdauer / 20)
```

Höher gewichtete kommende Steigungen erhalten verfügbare Zusatzunterstützung vor flachen Abschnitten. Bei gleicher Priorität entscheidet die Routenreihenfolge und danach die stabile Abschnitts-ID.

## Reserve und Ladehalte

Die nutzbare Gesamtenergie lautet:

```text
E_usable = Akku-Wh * Akkuanzahl * nutzbarer Anteil
```

`referenceRangeKm` bleibt semantisch auf die konfigurierte Gesamtakkuanzahl bezogen. Die Strategie verdoppelt eine persönliche Referenzreichweite bei zwei Akkus nicht zusätzlich.

Automatische und manuelle Ladehalte werden ausschließlich aus dem vorhandenen Ladeplan übernommen. Die Strategie sucht keine Ladestation und verändert weder Ziel-Ladung noch Reihenfolge. Nachladeenergie wird am zugeordneten Routenpunkt addiert und auf `E_usable` begrenzt.

## Konflikt- und Warnlogik

| Code | Bedeutung |
| --- | --- |
| `invalid_input` | Energiesegmente oder nutzbare Kapazität fehlen beziehungsweise sind ungültig. |
| `minimum_strategy_infeasible` | Das nächste Ziel ist selbst mit minimaler automatischer Unterstützung nicht erreichbar. |
| `reserve_below` | Die strategische Reserve wird unterschritten. |
| `insufficient_charge` | Der vorherige Ladehalt liefert nicht genug Energie für die Folgeabschnitte. |
| `manual_override_unsafe` | Eine manuelle Vorgabe verhindert eine sichere Strategie. |
| `reduced_reserve` | Die Tour bleibt nur mit geringerer als der gewählten strategischen Reserve erreichbar. |
| `low_quality` | Mindestens ein Abschnitt basiert auf niedriger Prognosequalität. |

Kritische Warnungen führen zu `infeasible`, sonstige Hinweise zu `warning`. Warnungen ändern keine Route, Ladehalte oder Benutzervorgaben.

## Manuelle Overrides

Eine manuelle Vorgabe gilt für alle Abschnitte der gewählten Etappe und liegt zwischen 0 und 400 Prozent. Sie wird als `manual` ausgewiesen. Das Zurücksetzen entfernt nur den Etappen-Override und stellt die automatische beziehungsweise bestehende Basisempfehlung wieder her.

Manuelle Werte werden nie still auf einen Modusbereich gekappt. Dadurch verursachte Motor-, Reserve- oder Reichweitenkonflikte werden sichtbar gemeldet.

## Save/Load

Der TourState speichert unter `ridingStrategy`:

- `schemaVersion`,
- Strategiemodus,
- sortierte manuelle Etappen-Overrides,
- letzten deterministischen Ergebnissnapshot,
- Modellversion und Eingabe-Fingerprint,
- automatische Etappenempfehlungen,
- Warncodes.

Fehlt das Feld in einem älteren TourState, wird folgender Standard ergänzt:

```json
{
  "schemaVersion": 1,
  "mode": "balanced",
  "stageOverrides": []
}
```

Nach dem Laden wird die Strategie aus den aktuellen Fachwerten neu berechnet. Der gespeicherte Snapshot dient der Nachvollziehbarkeit und dem Vergleich, nicht als ungeprüfte Berechnungsquelle.

## Determinismus

- keine Zeit-, Zufalls-, Netzwerk- oder Locale-Eingaben,
- Sortierung nach Routenposition und stabiler ID,
- stabile Warnungsdeduplizierung,
- Rundung erst an Ergebnisgrenzen,
- kanonischer FNV-1a-Fingerprint der fachlich relevanten normalisierten Eingaben,
- identische JSON-Eingaben liefern identische Ergebnisse und Fingerprints.

## Beispiele

### Knappe Tour ohne Laden

Die Basisempfehlung überschreitet das Budget bis zur Reserve. Der Core startet bei der Mindestunterstützung und verteilt den verbleibenden Spielraum zuerst auf lange beziehungsweise steile Anstiege. Flache Abschnitte werden reduziert.

### Tour mit Ladehalt

Die Energie bis zum Ladehalt wird separat budgetiert. Nach Erreichen wird ausschließlich die geplante Nachladeenergie addiert. Reicht sie für die folgende Mindeststrategie nicht, erscheint `insufficient_charge`.

### Unsicherer manueller Wert

Ein Override von 300 Prozent bleibt erhalten. Führt er zur Akkuerschöpfung oder Reserveunterschreitung, erscheint `manual_override_unsafe`; der Core ersetzt den Wert nicht.

## Bekannte Grenzen

- lineare Energieskalierung zwischen bestehenden Unterstützungspunkten,
- Ladehalte innerhalb eines Analyseabschnitts werden nach diesem Abschnitt angewendet,
- keine Wetter-, Wind-, Temperatur-, Verkehrs- oder Untergrunddaten,
- keine Live-Verfügbarkeit und keine Suche realer Ladestationen,
- keine Telemetrie, persönliche Kalibrierung oder lernende Logik,
- keine automatische Geschwindigkeits-, Motor- oder Etappensteuerung,
- keine Navigation während der Fahrt.

Diese Grenzen werden erst durch eigene, separat freizugebende Pakete verändert.
