# Persönliches Fahrer- und Fahrradprofil

Paket 16 führt eine zentrale, browserlokale Konfiguration für Fahrer, Fahrrad und E-Bike-Grunddaten ein. Paket 17 ergänzt die Parameter, die ein späterer E-Bike-Rechenkern benötigt, ohne bereits Berechnungen auszuführen.

## Zweck

Das Profil ist die gemeinsame fachliche Grundlage für spätere Module:

- Etappenplanung
- Schwierigkeitsbewertung
- Akku- und Reichweitenplanung
- Reiseplanung

Seit Paket 18 verwendet der deterministische Energie-Rechenkern diese zentrale Konfiguration. Die daraus abgeleiteten Modellannahmen für Fahrerleistung und Motorwirkungsgrad werden in der Etappenansicht transparent angezeigt.

Paket 16 und 17 speichern und übertragen ausschließlich Profildaten. Sie berechnen weder Energieverbrauch noch Reichweite, Ladezeit oder automatische Etappen.

## Datenmodell

Das zentrale Modell liegt in `src/lib/rider-bike-profile.ts`. Es definiert und validiert:

- optionalen Fahrernamen
- Körpergewicht
- Fitness- und Erfahrungsniveau
- gewünschte Tagesbelastung
- bevorzugte und maximale Tagesfahrzeit
- Fahrradtyp, Fahrradgewicht und Gepäckgewicht
- Akkukapazität, Akkuanzahl und Motorleistung
- Referenzreichweite auf flacher Strecke
- Unterstützungsprofil und gewünschte Akkureserve
- nutzbaren Anteil der Akkukapazität
- Motorunterstützung in Prozent
- Ladegerätleistung und Ladeverluste
- persönliches Fahrprofil: reichweitenorientiert, ausgewogen oder sportlich

Die maximale Tagesfahrzeit darf nicht kleiner als die bevorzugte Tagesfahrzeit sein. Zahlenwerte werden innerhalb dokumentierter, technisch plausibler Eingabegrenzen validiert. Diese Grenzen sind keine gesundheitliche oder sicherheitsbezogene Empfehlung.

## Speicherung und TourState

Das aktuell verwendete Profil wird unter dem versionierten Browser-Schlüssel
`biketriphub.riderBikeProfile.v1` gespeichert.

Zusätzlich enthält der aktuelle `StoredTourState` einen validierten Profilsnapshot. Dadurch bleiben Fahrer- und Fahrradangaben erhalten bei:

- Speichern und erneutem Öffnen einer Tour
- Tour-JSON-Export und -Import
- Profil-JSON-Export und -Import

Die in Paket 17 ergänzten Felder besitzen validierte Standardwerte. Dadurch werden bereits gespeicherte Paket-16-Profile beim Laden rückwärtskompatibel vervollständigt. Die Typen, Standardwerte und Validierung werden nicht in den späteren Modulen dupliziert. Verbraucher greifen auf das zentrale Profilmodell zu.

## Datenschutz und Grenzen

- Speicherung erfolgt lokal im Browser.
- Paket 16 und 17 übertragen das Profil nicht an den Server.
- Es gibt weiterhin keine Nutzerkonten.
- E-Bike-Werte werden seit Paket 18 für eine deterministische Planungsprognose ausgewertet, aber nicht für Motorregelung oder eine garantierte reale Reichweite.
- Das Profil ist keine medizinische, sportwissenschaftliche oder sicherheitsbezogene Eignungsbewertung.
