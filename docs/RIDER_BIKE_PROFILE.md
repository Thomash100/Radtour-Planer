# Persönliches Fahrer- und Fahrradprofil

Paket 16 führt eine zentrale, browserlokale Konfiguration für Fahrer, Fahrrad und E-Bike-Grunddaten ein.

## Zweck

Das Profil ist die gemeinsame fachliche Grundlage für spätere Module:

- Etappenplanung
- Schwierigkeitsbewertung
- Akku- und Reichweitenplanung
- Reiseplanung

Paket 16 speichert und überträgt ausschließlich Grunddaten. Es berechnet weder Energieverbrauch noch Reichweite oder automatische Etappen.

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

Die maximale Tagesfahrzeit darf nicht kleiner als die bevorzugte Tagesfahrzeit sein. Zahlenwerte werden innerhalb dokumentierter, technisch plausibler Eingabegrenzen validiert. Diese Grenzen sind keine gesundheitliche oder sicherheitsbezogene Empfehlung.

## Speicherung und TourState

Das aktuell verwendete Profil wird unter dem versionierten Browser-Schlüssel
`biketriphub.riderBikeProfile.v1` gespeichert.

Zusätzlich enthält der aktuelle `StoredTourState` einen validierten Profilsnapshot. Dadurch bleiben Fahrer- und Fahrradangaben erhalten bei:

- Speichern und erneutem Öffnen einer Tour
- Tour-JSON-Export und -Import
- Profil-JSON-Export und -Import

Die Typen, Standardwerte und Validierung werden nicht in den späteren Modulen dupliziert. Verbraucher greifen auf das zentrale Profilmodell zu.

## Datenschutz und Grenzen

- Speicherung erfolgt lokal im Browser.
- Paket 16 überträgt das Profil nicht an den Server.
- Es gibt weiterhin keine Nutzerkonten.
- E-Bike-Werte werden nicht für Verbrauch, Motorregelung oder Reichweite ausgewertet.
- Das Profil ist keine medizinische, sportwissenschaftliche oder sicherheitsbezogene Eignungsbewertung.
