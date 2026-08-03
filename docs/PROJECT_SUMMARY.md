# Projektzusammenfassung

Stand: 2026-08-03

## Produktstand

BikeTripHub / Radtour-Planer ist ein MVP für mehrtägige Radtourplanung auf Basis einer vorhandenen GPX-Route oder einer direkt berechneten Fahrradroute. Der aktuelle Schwerpunkt ist eine prüfbare Tour-, Etappen- und Reiseplanung, nicht eine produktive Buchungsplattform.

## Aktueller MVP-Funktionsumfang

- GPX-Datei laden und als feste geometrische Grundlage verwenden.
- Start, Ziel und Zwischenziele direkt eingeben und über BRouter auf realen OpenStreetMap-Wegen verbinden; Fahrradwege und ausgeschilderte Radwanderwege können gezielt bevorzugt werden.
- Route anhand von Start-km und Ziel-km kürzen; Kürzungen werden idempotent aus der unveränderten Original-GPX-Geometrie abgeleitet.
- Etappen nach gewünschter Etappenlänge erzeugen.
- Etappen nach Anzahl Reisetage erzeugen.
- Etappen nach einem Ziel-Schwierigkeitsgrad erzeugen; steigungslastige Abschnitte werden auf Basis des vorhandenen Höhenprofils kürzer geplant.
- Etappen manuell bearbeiten; Geometrie, Distanz, Höhenmeter und Fahrzeit werden aus der aktuellen Arbeitsroute neu berechnet.
- Etappen nach Schwierigkeit und Belastung bewerten; Distanz, Höhenmeter, Steigungsdichte, Belastungspunkte und Hinweise werden je Etappe angezeigt.
- Farbige Etappen direkt auf der Karte anzeigen und anklicken.
- Karte und Höhenprofil in einer gemeinsamen Visualisierungsfläche umschalten.
- Orte/Städte aus lokaler MVP-Liste auf die GPX-Arbeitsroute projizieren und nach Bestätigung als Start, Ziel oder Etappenpunkt übernehmen.
- Unterkunftskandidaten nach Typ, Routen-/Etappenendentfernung und belegten Fahrradmerkmalen filtern.
- Unterkunft je Etappe vormerken oder als Übernachtung persistent auswählen.
- Unterkunft abseits der Hauptroute als echten BRouter-Hin- und Rückweg separat routen und darstellen.
- Karte über Schaltflächen, Touch, Mausrad und Tastatur ohne routenabhängige Zoomgrenzen bedienen.
- Persönliches Fahrer-, Fahrrad-, E-Bike- und Ladeprofil zentral speichern sowie als JSON exportieren und importieren.
- Energiebedarf und E-Bike-Reichweite je Etappe deterministisch aus persönlicher Referenzreichweite, Profil, Distanz und Höhenprofil prognostizieren.
- E-Bike-Akkustand etappenübergreifend fortschreiben sowie automatische und manuelle Ladehalte mit Ladezeit planen.
- Kontinuierliche Motorunterstützung je Höhenabschnitt als klar gekennzeichnete Simulation mit Zieltempo, Modus, Energie, Akkustand und Begründung empfehlen.
- Adaptive Fahrstrategie tourweit aus Energie-, Lade- und Unterstützungsergebnissen ableiten; Modi, Ladehalte, Reserve und manuelle Etappenvorgaben werden deterministisch berücksichtigt.
- Gesamte Tour speichern und erneut öffnen.

Der vollständige Browser-TourState umfasst Route, gekürzte Arbeitsroute, Etappen, Etappengeometrien, Reisetage-/Etappenlängen-/Schwierigkeits-Einstellung, gesetzte Orte/Etappenpunkte, Unterkunftszuordnungen, Ladepunkte, manuelle Ladehalte, adaptive Fahrstrategie mit Etappen-Overrides und einen validierten Snapshot des zentralen Fahrer- und Fahrradprofils.

## Bekannte Einschränkungen

- Keine echte Buchung, Reservierung oder Zahlung.
- Keine Nutzerkonten.
- Externe Unterkunftskandidaten benötigen einen explizit konfigurierten Entwicklungs- oder Produktionsprovider; ohne Endpunkt werden nur lokale Datenbank-POI geladen.
- Lokale Unterkunftstestdaten erscheinen nur bei ausdrücklicher Aktivierung des `LocalTestProvider`.
- Keine produktive POI-Massenabfrage.
- Die direkte Planung nutzt die öffentliche BRouter-Instanz ohne zugesichertes SLA; ein eigener oder vertraglich geeigneter Provider ist vor produktivem Betrieb zu entscheiden.
- Freie Ortssuche ist nicht Bestandteil des Routingpakets; die Direktplanung nutzt weiterhin den lokalen MVP-Ortskatalog.
- Orte verlegen die GPX-Route nicht automatisch; Unterkunftsabstecher werden separat geroutet und verändern die Hauptroute nicht.
- Die Etappenbewertung ist eine MVP-Planungshilfe und keine Sicherheits-, Fitness-, Wetter- oder Gesundheitsbewertung.
- Wetter, Wind, Oberfläche, Reifendruck und Temperatur werden in der Energieprognose noch nicht berücksichtigt.
- Die Energieprognose ist eine deterministische Planungshilfe und keine Garantie für reale Reichweite oder Leistungsfähigkeit.
- Die persönliche Referenzreichweite gilt für die gesamte konfigurierte Akkuanzahl bis 0 %; Änderungen der Akkukonfiguration erfordern eine Prüfung dieses Erfahrungswerts.
- Die isolierte Energieprognose startet je Etappe mit voller nutzbarer Akkukapazität; die getrennte Ladeplanung schreibt den Akkustand etappenübergreifend fort.
- Die Ladeplanung verwendet ausschließlich den korrigierten kalibrierten Energiebedarf; Live-Verfügbarkeit und reale Ladeleistung bleiben unbelegte Planungsannahmen.
- Live-Verfügbarkeit, Öffnungszeiten und Steckdosenkompatibilität von Ladepunkten werden nicht extern geprüft.
- Ladezeiten verwenden eine konstante wirksame Leistung; reale Ladekurven und Wartezeiten bleiben unberücksichtigt.
- Die Unterstützungssimulation verwendet ohne belegtes Fahrradmodusprofil generische Modusbereiche; Telemetrie, Wind, Temperatur und Untergrund sind noch nicht gekoppelt.
- Die adaptive Fahrstrategie skaliert vorhandene Abschnittsenergie linear zur Unterstützung. Sie ist keine Fahrradsteuerung und keine Garantie für reale Reichweite.
- GPX-Export enthält aktuell die bearbeitete Routengeometrie; vollständige Etappen- und Unterkunftsmetadaten bleiben im gespeicherten TourState.
- Rechtliche Seiten sind vorbereitete Platzhalter und müssen vor produktiver Veröffentlichung final geprüft werden.

## Paketstatus

- Paket 1: GPX-Grundbedienung abgeschlossen.
- Paket 2: Planung nach Reisetagen und Städte/Orte entlang der Route abgeschlossen.
- Paket 3: Unterkünfte je Etappe abgeschlossen.
- Paket 4: MVP-Releasefähigkeit und Veröffentlichungsvorbereitung abgeschlossen.
- Paket 5-7: Tourverwaltung, Planungsdatenqualität und Produktions-/Releasevorbereitung abgeschlossen.
- Paket 10: Etappenbewertung nach Schwierigkeit und Belastung abgeschlossen.
- Paket 11: Reale Fahrradwege in der Direktplanung abgeschlossen und über PR #59 in `private` gemergt.
- Paket 12: Schwierigkeitsbasierte Etappenplanung abgeschlossen und über PR #60 in `private` gemergt.
- Konsolidierung Paket 11/12: abgeschlossen und über PR #62 in `private` gemergt.
- Paket 13: Unterkunftsplanung nach automatischer, fachlicher und Raspberry-Pi-Abnahme über PR #63 in `private` gemergt.
- Paket 14: Kartenzoom nach automatischer, fachlicher und Raspberry-Pi-Abnahme über PR #64 in `private` gemergt.
- Paket 15: Trennung der Bedienstruktur für Routen- und Etappenplanung nach automatischer, fachlicher und Raspberry-Pi-Abnahme über PR #65 in `private` gemergt.
- Paket 16: Persönliches Fahrer- und Fahrradprofil nach automatischer, fachlicher und Raspberry-Pi-Abnahme über PR #66 in `private` gemergt.
- Paket 17: E-Bike- und Ladeprofil nach bestätigtem Prüflauf über PR #67 in `private` gemergt.
- Paket 18: Deterministischer Energie- und Reichweiten-Rechenkern über PR #68 in `private` gemergt; der Raspberry-Pi-Praxistest hat danach die fehlende Nutzung der Referenzreichweite aufgedeckt.
- Nacharbeit Paket 18/19: Referenzkalibrierung und separater Höhenmeterzuschlag wurden über PR #70 mit Merge-Commit `4fb67e8` in `private` integriert.
- Paket 19: Intelligente Ladeplanung wurde nach bestätigter Wiederholungsprüfung und ausdrücklicher Freigabe über PR #69 mit Merge-Commit `41354ac` in `private` integriert.
- BikeTripHub Intelligence INT-00: Architektur- und Fachkonzept für die Pakete 20 bis 32 wurde über PR #71 mit Merge-Commit `5d8d15f` in `private` integriert; es verändert keine Produktivlogik.
- Paket 20: Kontinuierliches Unterstützungsmodell `biketriphub-assistance-v1` wurde nach Freigabe über PR #73 mit Merge-Commit `731d8da` in `private` integriert.
- Paket 21: Adaptive E-Bike-Fahrstrategie `biketriphub-riding-strategy-v1` wird auf `codex/adaptive-riding-strategy` als separater tourweiter Planungs-Core umgesetzt.
- Reiseauftrag: PR #61 wird erst nach Abschluss der Profil- und Rechenpakete fortgeführt.

Aktuelle Integrationsbasis für Paket 21:

- `private`: `731d8da370851febe4d40f86d838b8e55ce8a0b3` (Merge von PR #73; Basis für Paket 21)
- deterministischer, referenzkalibrierter Energie- und Reichweiten-Rechenkern mit separatem Höhenmeterzuschlag
- bestehender TourState enthält Fahrer-, Fahrrad-, E-Bike- und Ladeprofil
- Energie-Core bleibt als separates Modul unverändert; die Ladeplanung übernimmt ausschließlich dessen finalen kalibrierten Segmentbedarf
- keine Live-Ladesäulen, Online-Dienste oder automatische Routen-/Etappenänderung

## BikeTripHub Intelligence: Fachkonzept INT-00

Der nächste Entwicklungsstrang erweitert den stabilen Tourenplaner schrittweise um unabhängige Intelligence-Module. Der Konzeptabschnitt legt vor der Implementierung fest:

- mathematische und physikalische Annahmen,
- eine gemeinsame versionierte Szenario- und Vertragsgrenze,
- unabhängige Energie-, Unterstützungs-, Telemetrie-, Shadow-, Kalibrierungs- und Optimierungs-Cores,
- Telemetrie-, Import-, Feature-Flag- und Kalibrierungsverfahren,
- Qualitäts-, Determinismus- und Freigaberegeln,
- Abhängigkeiten und Akzeptanzrahmen der Pakete 20 bis 32.

Der produktive Energie-Core `biketriphub-energy-v2` und Lade-Core `biketriphub-charging-v1` bleiben unverändert. Experimentelle Ergebnisse sind zunächst rein informativ und dürfen TourState oder Profile nicht automatisch ändern.

Grundlagen:

- [Fachkonzept BikeTripHub Intelligence](BIKETRIPHUB_INTELLIGENCE.md)
- [Vertrags- und Schemaentwurf](BIKETRIPHUB_INTELLIGENCE_CONTRACTS.md)
- [Architekturentscheidungen ADR-010 bis ADR-012](ARCHITECTURE_DECISIONS.md)

## Paket 20: Kontinuierliches Unterstützungsmodell

Paket 20 ergänzt eine eigenständige Simulation je Etappe:

- kontinuierliche Berechnung ohne Sprünge an den sichtbaren Steigungsklassen,
- kurze Rampen sowie mittlere und lange zusammenhängende Anstiege,
- Fahrerleistung, Gesamtgewicht, Zieltempo, Motorgrenze und Reservebedarf,
- Strategien energiesparend, ausgewogen, komfortabel, schnell und benutzerdefiniert im Core,
- Motoranteil als Bereich und Moduszuordnung mit Quelle und Qualität,
- erwartete Abschnittsenergie ausschließlich aus dem unveränderten Energie-Core,
- Akkustand innerhalb der isolierten Etappe,
- sichtbare Begründungen, Qualitätsangabe und Warnungen,
- responsive, aufklappbare Anzeige ohne automatische Tour- oder Fahrradänderung.

In der UI wird die vorhandene persönliche Fahrweise auf energiesparend, ausgewogen oder schnell abgebildet. Herstellerprofile, Telemetrie und adaptive Kalibrierung bleiben späteren, separat freizugebenden Paketen vorbehalten.

Modell: [docs/E_BIKE_ASSISTANCE_MODEL.md](E_BIKE_ASSISTANCE_MODEL.md).

## Paket 21: Adaptive E-Bike-Fahrstrategie

Paket 21 verbindet die vorhandenen Energie-, Lade- und Unterstützungsergebnisse, ohne diese Fachkerne zu verändern:

- reiner tourweiter Core `biketriphub-riding-strategy-v1`,
- Modi Ausgewogen, Reichweite, Komfort und Manuell,
- gemeinsames Energiebudget bis zum nächsten Ladehalt beziehungsweise Tourziel,
- Priorisierung kommender langer oder steiler Anstiege,
- Berücksichtigung automatischer und manueller Ladehalte,
- korrekte gemeinsame Kapazität für einen oder zwei Akkus,
- manuelle Etappen-Overrides mit sichtbarer Quelle und Reset,
- Warnungen für fehlende Daten, Reservekonflikte, unzureichendes Laden und unsichere Vorgaben,
- versionierter, rückwärtskompatibler TourState mit Eingabe-Fingerprint und Ergebnissnapshot,
- responsive Tour- und Etappenanzeige.

Nicht enthalten sind Telemetrie, Wetter, Wind, Live-Ladestationen, KI, Navigation oder automatische Fahrradsteuerung.

Modell: [docs/E_BIKE_RIDING_STRATEGY_MODEL.md](E_BIKE_RIDING_STRATEGY_MODEL.md).

## Paket 19: Intelligente Ladeplanung

Paket 19 führt den Akkustand über die gesamte Tour fort und ergänzt automatische sowie manuelle Ladehalte.

Enthalten:

- reine, versionierte Ladeplanungsfunktion ohne Netzwerk-, Zeit- oder Zufallsabhängigkeit
- Energiebedarf je Segment und Etappe aus dem korrigierten kalibrierten Paket-18-Core
- erste kritische Stelle bei Reserveunterschreitung
- Ladepunkte aus vorhandenen belegten POI-/Unterkunftsdaten und eigener Erfassung
- automatische Priorisierung erreichbarer Ladepunkte
- benötigte Nachladeenergie, Ladeverluste, Ladezeit sowie Ankunfts- und Abfahrtsakku
- mehrere manuelle Ladehalte mit Ziel-Ladung, Entfernen und Reihenfolge
- Tourzeit aus Fahr- und Ladezeit sowie Warnungen bei unzureichender Planung
- versionierter, rückwärtskompatibler TourState einschließlich Tour-Export/-Import
- Ladehalte in Etappenansicht und Tourübersicht

Nicht enthalten:

- Live-Abfrage, Reservierung oder produktive Online-Dienste
- Wetter-, Wind- oder Verkehrsdaten
- automatische Routen- oder Etappenänderung
- KI-Optimierung

Modell, Priorisierung, Formeln und Grenzen: [docs/E_BIKE_CHARGING_MODEL.md](E_BIKE_CHARGING_MODEL.md).

## Paket 18: Deterministischer Energie- und Reichweiten-Rechenkern

Paket 18 wertet Profil, Etappendistanz und das echte Höhenprofil erstmals reproduzierbar aus.

Enthalten:

- reine, versionierte Rechenfunktion ohne Netzwerk-, Zeit- oder Zufallsabhängigkeit
- segmentweise Unterscheidung von Ebene, Steigung und Gefälle
- Rollwiderstand, Luftwiderstand, Lageenergie und Antriebsverluste
- Fahrer- und Motoranteil unter Beachtung der Motorleistungsgrenze
- Energiebedarf, Akkuverbrauch, Restenergie und Restkapazität
- persönliche Belastung und Reichweitenprognose
- Reservewarnung und nachvollziehbare Prognosequalität
- Ergebnisanzeige je Etappe

Nach dem Raspberry-Pi-Praxistest ergänzt Modellversion `biketriphub-energy-v2`:

- persönlichen Referenzverbrauch aus nutzbarer Gesamtenergie und flacher Referenzreichweite
- Kalibrierung ausschließlich des flachen Grundverbrauchs bei weiterhin getrenntem physikalischem Rohverbrauch
- unskalierter physikalischer Steigungszuschlag und auf null begrenzte Gefälleentlastung
- monotone Höhenmeter-Regression für 100 km mit 100, 1.000 und 2.000 positiven Höhenmetern
- sichere Reichweite bis zur separat bewerteten Reserve
- transparente Faktoren, harte Grenzen und sichtbare Hinweise bei auffälliger Kalibrierung
- eindeutige Semantik der Referenzreichweite für die gesamte konfigurierte Akkuanzahl
- Regressionen für 80 km, 64 km bei 20 % Reserve und 100 km bei 80 km Referenzreichweite

Nicht enthalten:

- automatische Etappenverschiebung oder Akkuoptimierung
- Ladepunkte, Nachladen oder etappenübergreifende Akkufortschreibung
- alternative Routen oder automatische Motorsteuerung
- Wetter- und Winddaten

Formeln, Modellparameter und Grenzen: [docs/E_BIKE_ENERGY_MODEL.md](E_BIKE_ENERGY_MODEL.md).

## Paket 17: E-Bike- und Ladeprofil

Paket 17 vervollständigt die Datenbasis für den späteren Rechenkern.

Enthalten:

- nutzbarer Anteil der Akkukapazität
- Motorunterstützung in Prozent
- Ladegerätleistung und Ladeverluste
- persönliches Fahrprofil
- rückwärtskompatible Standardwerte für gespeicherte Paket-16-Profile
- Speicherung, Reload, TourState sowie Profil- und Tour-JSON

Nicht enthalten:

- Energiebedarf aus Distanz oder Höhenprofil
- Fahrer-/Motoranteil, Akkuverbrauch oder Reichweitenprognose
- Ladezeitberechnung oder Ladepunkte
- Warnungen oder automatische Etappenoptimierung

Diese deterministische Rechenlogik folgt getrennt in Paket 18.

## Paket 16: Persönliches Fahrer- und Fahrradprofil

Paket 16 kapselt Fahrer-, Fahrrad- und E-Bike-Grunddaten in einem zentralen, versionierten Profilmodell.

Enthalten:

- Einstellungsseite `/einstellungen/fahrprofil`
- Fahrername, Körpergewicht, Fitness- und Erfahrungsniveau
- gewünschte Tagesbelastung sowie bevorzugte und maximale Tagesfahrzeit
- Fahrradtyp, Fahrradgewicht und Gepäckgewicht
- E-Bike-Grunddaten einschließlich Akkus, Motor, Referenzreichweite, Unterstützungsprofil und Reserve
- browserlokale Speicherung, Reload sowie Profil-JSON-Export und -Import
- validierter Profilsnapshot im TourState und damit im Tour-JSON

Nicht enthalten:

- Akkuverbrauch oder Reichweitenberechnung
- Ladepunkte oder Energieoptimierung
- automatische Anpassung von Etappen oder Schwierigkeitsbewertung
- Motorregelung

## Paket 15: getrennte Bedienstruktur

Paket 15 trennt den bisherigen Gesamtplaner in zwei klar erkennbare Bedienbereiche, ohne die fachlichen Berechnungen oder den TourState aufzuteilen.

Enthalten:

- `/planer/route` für Eingabeart, direkte Route, GPX-Import, Routenübersicht und Routenkürzung
- `/planer/etappen` für Etappenerzeugung, Vorschau und Etappenbearbeitung
- gemeinsame Navigation mit Übergabe der vorhandenen Routengrundlage über denselben lokalen TourState
- verständlicher Leerzustand der Etappenplanung, solange keine Route vorhanden ist
- kompatible Weiterleitung alter `/planer`-Links
- Weitergabe der vorhandenen `ACCOMMODATION_*`-Konfiguration an den Raspberry-Pi-App-Container, damit der explizite `local-test`-Provider reproduzierbar für die Abnahme aktiviert werden kann

Nicht enthalten:

- neue Routing- oder Etappenberechnung
- Änderungen an Energie-, E-Bike- oder Akkulogik
- Reiseauftrag, Navigation oder Offline-Funktionen

## Paket 4: Release-Readiness

Paket 4 konsolidiert Darstellung, Dokumentation, Demo-Fähigkeit, rechtliche Grundstruktur, SEO-Basis und Deployment-Bewertung. Es enthält keine neue Fachfunktion und keine Änderung am Public-/Private-Konzept.

Umgesetzt bzw. vorbereitet:

- Startseite beschreibt den aktuellen MVP-Stand und bevorzugt GPX als Einstieg.
- Demo-Tour wird nur nach ausdrücklicher Aktion geladen und zeigt den MVP mit Reisetagen, Orten, Etappen und Unterkunftskandidaten.
- Direkte Planung ist als MVP-Modus gekennzeichnet; seit Paket 11 verwendet sie reale BRouter-/OpenStreetMap-Wege.
- Footer zeigt Version, Build-Datum und MVP-Status.
- Impressum, Datenschutz, Nutzungsbedingungen und MVP-Hinweis sind als prüfpflichtige Platzhalter vorbereitet.
- Basis-Metadaten, OpenGraph, Robots und Sitemap sind vorbereitet; Indexierung bleibt wegen MVP-/Teststatus gesperrt.
- Partner-/Preisflächen sind als MVP-Ausblick gekennzeichnet und behaupten keine produktive Zahlung oder Buchung.

## Deployment-Strategie

Der aktuelle MVP ist keine rein statische Website. Die vollständige App benötigt weiter den privaten Next.js-/Docker-Stack mit API-Routen, Prisma/PostgreSQL, Redis und Worker.

Aktueller Ansatz:

- `public`: öffentlicher Webroot-/Asset-/Proxy-Bereich mit reduziertem Umfang.
- `private`: serverseitige Next.js-App inklusive API, Prisma, Worker- und Deployment-Skripten.

Eine Plesk- oder rein statische Webseitenvariante wäre ein separater Produktzuschnitt mit reduziertem Funktionsumfang und wird in Paket 4 nicht umgesetzt.

## Qualitätsstandard

Vor Paket-4-Stopppunkt:

```bash
git diff --check
npm test
npm run typecheck
npm run lint
npm run build
npm run artifact:private
npm run artifact:check-private
```

Zusätzlich, weil Startseite, Legal-Seiten und öffentliche Basisartefakte betroffen sind:

```bash
npm run artifact:public
npm run artifact:check-public
```

## Manueller Paket-Review nach lokalem Abschluss

- `/api/health`
- `/planer`
- Startseite
- Demo-/Beispielroute
- GPX laden
- Route kürzen
- Etappen nach Tagen erzeugen
- Orte/Städte übernehmen
- Unterkunft zuordnen
- gesamte Tour speichern
- Route erneut öffnen
- Rechtliche Seiten öffnen
- Footer/Version prüfen
- mobile Ansicht prüfen
- prüfen, dass keine produktive externe API, Buchung oder Zahlung suggeriert wird

## Paket 5-7: nächster zusammenhängender Entwicklungsblock

Paket 5-7 bündelt die nächsten größeren Themen ohne kleine Zwischenabnahmen:

- Tourverwaltung, Export/Import und Freigabe-Stand.
- Echte Planungsdatenstruktur für Orte, POI und Unterkünfte vorbereiten.
- Produktionsbetrieb und Veröffentlichung dokumentieren.

Paket 5 ergänzt:

- lokale Tourverwaltung unter `/touren`
- Tour umbenennen, duplizieren und löschen
- JSON-Export und JSON-Import
- Freigabe-Status für lokale Touren
- Etappen-GPX-Export mit Gesamtstrecke und Etappen-Tracks
- klare Trennung von Demo-Touren und echten Planungen

Paket 6 ergänzt:

- Datenqualitätsmarkierung für Unterkunftskandidaten
- Suchradius je Etappe
- klarere Unterscheidung zwischen Partnerdaten, POI-Daten und lokalen MVP-Testdaten
- Abstecherhinweis bleibt ohne automatische Routenänderung

Paket 7 ergänzt:

- `/api/version`
- erweiterte Health-/Version-Daten ohne Secrets
- Indexing-Steuerung über `NEXT_PUBLIC_ALLOW_INDEXING`
- Release-/Backup-/Betriebsdokumentation
- keine Plesk-Umstellung und keine produktive Veröffentlichung

## Paket 10: Etappenbewertung nach Schwierigkeit

Paket 10 ergänzt eine erklärbare MVP-Bewertung je Etappe. Die App berechnet Belastungspunkte von `0..100` aus Distanz, Höhenmetern bergauf, Höhenmetern bergab, Steigungsdichte und Längenzuschlägen. Die Etappen-Timeline zeigt daraus eine Stufe `leicht`, `mittel`, `schwer` oder `sehr schwer`, kompakte Kennzahlen und konkrete Hinweise.

Dokumentation der Formel, Schwellen und Grenzen: [docs/STAGE_DIFFICULTY_MVP.md](STAGE_DIFFICULTY_MVP.md).

Nicht enthalten:

- Wetter-, Wind- oder Oberflächenbewertung
- individuelle Fitnessprofile
- E-Bike-Akkureichweite
- medizinische oder sicherheitsrelevante Eignungsprüfung
- automatische Neuoptimierung der Etappen ohne Nutzerbestätigung

## Paket 11: Reale Fahrradwege

Paket 11 ersetzt die künstliche Direktverbindung zwischen Start, Ziel und Zwischenpunkten durch einen konfigurierbaren BRouter-Provider. Lange Touren werden abschnittsweise an expliziten Kontrollpunkten oder an Punkten einer zuvor gerouteten BRouter-Korridorlinie berechnet und ohne stillen Luftlinien-Fallback zusammengefügt.

Enthalten:

- BRouter-GeoJSON als tatsächliche Arbeitsgeometrie
- OSM-basierte Fahrradwege für direkte Routen
- technisch getrennte Requests für `ausgewogen`, `wenig Steigung`, `Fahrradwege bevorzugen`, `Radwanderwege bevorzugen` und `sportlich`
- sichere Fahrradinfrastruktur über `safety`, Radwanderwege über `trekking` mit `stick_to_cycleroutes=1`, höhenärmere Planung über verstärkte Höhenkosten
- Kilometer-/Prozentanzeige für erfasste Fahrradinfrastruktur und internationale, nationale, regionale oder lokale OSM-Radroutennetze
- Distanz, Fahrzeit und Höhenprofil aus dem Provider
- Profilabbildung auf `safety`, `trekking` und `fastbike`
- verständliche Provider- und Timeoutfehler
- expliziter Offline-Testmodus über `ROUTING_PROVIDER=mock`
- Docker-/RPi-Konfiguration und Datenschutz-/Betriebshinweise

Details und Grenzen: [docs/REAL_ROAD_ROUTING.md](REAL_ROAD_ROUTING.md).

## Paket 12: Etappenplanung nach Schwierigkeit

Paket 12 verwendet die erklärbare Belastungsbewertung aus Paket 10 erstmals als Planungsziel. Der Nutzer wählt `leicht`, `mittel`, `schwer` oder `sehr schwer`; die App erzeugt daraufhin lückenlose Etappen entlang der unveränderten Arbeitsroute. Steigungsreiche Abschnitte werden kürzer angesetzt, flache Abschnitte können länger werden.

Enthalten:

- Vorschau mit Distanz, Höhenmetern, Einstufung und Belastungspunkten je Etappe
- echte Höhenprofilwerte beim Kürzen, automatischen Erzeugen und manuellen Nachbearbeiten
- explizite Bestätigung, bevor bestehende oder manuell geänderte Etappen ersetzt werden
- die Ersetzungsbestätigung erscheint direkt im Arbeitsschritt `Etappen erzeugen` und wird nach Auswahl der Schwierigkeitsplanung automatisch fokussiert
- persistiertes Zielniveau im lokalen TourState
- Warnung, wenn Höhendaten geschätzt werden oder ein Abschnitt das Zielniveau nicht einhalten kann
- keine Änderung der GPX-/BRouter-Geometrie und kein automatisches Neu-Routing

Formel, Zielwerte und Grenzen: [docs/STAGE_DIFFICULTY_MVP.md](STAGE_DIFFICULTY_MVP.md).

## Konsolidierung nach Paket 11 und 12

Der Nach-Merge-Abschnitt führt keine neue Produktfunktion ein. Er schließt vier Reviewpunkte:

- vorhandene Tour bei BRouter-Fehler vollständig erhalten
- sichtbare Routingprofile technisch und fachlich trennen
- lange Routen nur mit Segmentpunkten einer gerouteten Korridorlinie teilen
- maximal 20 Zwischenziele konsistent in UI und API erzwingen

Ein während der manuellen Prüfung erkannter Integrationsfehler wurde im selben Abschnitt korrigiert: Da neu berechnete Routen bereits Distanz-Etappen enthalten, verlangte die Schwierigkeitsplanung eine Bestätigung, zeigte diese aber außerhalb des sichtbaren Arbeitsschritts. Die Bestätigung befindet sich nun direkt bei der Etappenerzeugung und wird automatisch fokussiert.

Die bestehenden GPX-, Save/Load-, Höhenprofil-, Belastungs- und Schwierigkeitsflows bleiben unverändert. Der Abschnitt endet am dokumentierten manuellen Raspberry-Pi-/Browser-Stopppunkt.
