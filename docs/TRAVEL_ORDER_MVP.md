# Reiseauftrag und Reiseorganisation

Stand: 2026-07-23

## Ziel

Paket 13 ergänzt eine organisatorische Ebene oberhalb einer gespeicherten Tour. Ein Reiseauftrag dokumentiert Reisedaten, Teilnehmer, Etappen, Unterkunftsanfragen und Gepäcktransport. Er ist ausdrücklich keine Buchung, Reservierung, Zahlung oder Live-Verfügbarkeitsprüfung.

## Einstieg

Ein Reiseauftrag wird aus einer gespeicherten Tour erzeugt:

1. Tour vollständig im Planer speichern.
2. `/touren` oder `/auftraege` öffnen.
3. `Reiseauftrag erstellen` wählen.
4. Grunddaten, Etappen, Unterkünfte und Gepäcktransport prüfen.
5. `Alle Auftragsänderungen speichern` wählen.

Die Tour bleibt die geometrische Grundlage. Änderungen am Reiseauftrag verändern weder Route noch Etappengeometrie.

## Übernommener Tourstand

Der Auftrag übernimmt als Snapshot:

- Tour-ID und Tourname
- Etappentag, Start, Ziel und Datum
- Distanz und Höhenmeter
- ausgewählte Unterkunft je Etappe
- weitere Unterkunftskandidaten aus dem gespeicherten Planungsstand
- Quelle und Datenqualität der Unterkunft

Spätere Änderungen an der Tour überschreiben einen bestehenden Reiseauftrag nicht automatisch.

## Auftragsdaten

### Grunddaten

- Auftragstitel und Reiseart
- Auftragsstatus
- Start- und Enddatum
- Teilnehmer, Fahrräder, E-Bikes und Gepäck
- Auftraggeber, Kontakt und optionaler Notfallkontakt
- besondere Hinweise

Das Startdatum verteilt die Reisedaten automatisch in Etappenreihenfolge.

### Unterkünfte

Je Etappe:

- ausgewählte Unterkunft und Alternativen
- Status `offen`, `angefragt`, `bestätigt`, `abgelehnt` oder `Alternative nötig`
- Anfrage- und Rückmeldedatum
- dokumentierte Kosten, Vorgangsnummer und Stornofrist
- Fahrradunterstellung und Gepäckannahme
- Notizen

Diese Felder dokumentieren externe Kommunikation. BikeTripHub versendet nichts automatisch.

### Gepäcktransport

Auf Auftragsebene:

- benötigt oder nicht benötigt
- Anbieter und Kontakt
- Gesamt- oder Teilstrecke
- Zeitfenster
- Gepäckstücke und Maximalgewicht
- Bearbeitungsstatus

Je Etappe:

- Abhol- und Zielunterkunft
- Abhol- und Anlieferstatus
- Sonderhinweise

Eine geänderte Unterkunft aktualisiert die Zielbezeichnung der aktuellen und die Abholbezeichnung der folgenden Etappe.

## Speicherung und Export

Aufträge werden getrennt von Touren im Browser gespeichert:

- Storage-Key: `biketriphub.travelOrderLibrary.v1`
- Export-Schema: `biketriphub.travel-order-export.v1`

Unterstützt:

- speichern und erneut öffnen
- umbenennen
- duplizieren
- löschen
- JSON exportieren und importieren
- Auftragsübersicht kopieren
- Unterkunftsanfrage je Etappe kopieren
- Gepäcktransport-Anfrage kopieren

JSON-Dateien enthalten den vollständigen Auftragsstand einschließlich möglicher Kontaktinformationen. Sie müssen bewusst und geschützt abgelegt werden.

## Grenzen

- keine Buchung oder Reservierung
- keine Zahlung
- keine Live-Verfügbarkeit
- keine automatische E-Mail
- keine Server-Persistenz oder Nutzerkonten
- keine Prisma-Migration
- keine automatische Synchronisierung nach späterer Touränderung
- keine produktive Partnerabrechnung

## Manueller Paket-Review

- gespeicherte Tour unter `/touren` auswählen
- Reiseauftrag erzeugen
- Startdatum setzen und Etappendaten prüfen
- Teilnehmer, Fahrräder, E-Bikes und Gepäck erfassen
- Kontaktangaben und Datenschutzhinweis prüfen
- Unterkunft je Etappe auswählen und Status ändern
- Gepäcktransport global und je Etappe erfassen
- Auftrag speichern und erneut öffnen
- Auftrag umbenennen, duplizieren und löschen
- JSON exportieren und wieder importieren
- Auftrags-, Unterkunfts- und Gepäcktext kopieren
- mobile Ansicht bei 360, 390, 430 und 768 px prüfen
- sicherstellen, dass keine Buchung, Zahlung oder Live-Verfügbarkeit suggeriert wird
