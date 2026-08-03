# Changelog

## Paket 23 - 2026-08-04

- separaten, reinen Mehrziel-Core `biketriphub-route-optimizer-v1` und Pareto-Vertrag `biketriphub-route-optimizer-pareto-v1` ergänzt
- ausschließlich vorhandene GPX-, BRouter- und gespeicherte Routengeometrien als unveränderte Kandidaten angebunden
- harte Grenzen für Reserve, Laden, Steigung, Oberfläche und Datenqualität vor der Empfehlung eingeführt
- deterministische Gewichtsnormierung, robuste Ausreißerbehandlung, Pareto-Front, Gleichwertigkeit und stabile Tie-Breaker umgesetzt
- fehlende Werte ohne Schätzung behandelt und gewichtete Zielabdeckung sowie eingeschränkte Empfehlungen transparent ausgewiesen
- responsive Übersicht, Detailvergleich und gemeinsame Kartenumschaltung unter `/planer/optimierung` ergänzt
- TourState rückwärtskompatibel um versionierte Vergleichseinstellungen und Kandidatenreferenzen erweitert
- 145 automatisierte Tests einschließlich Paket-23-Regressionen erfolgreich ausgeführt
- vorhandene Energie-, Lade-, Assistance-, Fahrstrategie-, Strecken- und Geometrie-Logik bewusst unverändert gelassen
- kein Router, keine Live-Daten, KI, automatische Routenübernahme, kein Tag und kein Release eingeführt

## Paket 22 - 2026-08-03

- PR #74 nach ausdrücklicher Freigabe mit Merge-Commit `0724b3e` nach `private` integriert
- reinen, deterministischen Höhenprofil- und Streckenbeschaffenheits-Core `biketriphub-route-condition-v1` ergänzt
- Höhenwerte geglättet ausgewertet, Rohdaten erhalten und Steigungs-, Höhenmeter- sowie Plausibilitätswerte je Segment ergänzt
- BRouter-`WayTags` ohne neuen Live-Dienst in versionierte Oberflächen- und Wegtypsegmente übernommen
- zentrale Oberflächen-, Wegtyp-, Fahrwiderstands-, Qualitäts- und Warnungsmodelle ergänzt
- responsive Tour-, Etappen-, Höhenprofil- und Segmentdetailanzeigen ergänzt
- TourState rückwärtskompatibel um Quellsegmente und reproduzierbaren Analysesnapshot erweitert
- bestehende Energie-, Lade-, Unterstützungs-, Fahrstrategie- und Zeitberechnungen bewusst unverändert gelassen

## Paket 21 - 2026-08-03

- PR #73 nach ausdrücklicher Freigabe mit Merge-Commit `731d8da` nach `private` integriert
- deterministischen tourweiten Fahrstrategie-Core `biketriphub-riding-strategy-v1` ergänzt
- Strategiemodi Ausgewogen, Reichweite, Komfort und Manuell eingeführt
- kommende Steigungen, Reserve, Akkuanzahl sowie automatische und manuelle Ladehalte gemeinsam berücksichtigt
- manuelle Etappenvorgaben mit sichtbarer Quelle, unmittelbarer Neuberechnung und Reset ergänzt
- Warnungen für nicht erreichbare Touren, Reserveunterschreitung, unzureichende Ladung, unsichere Vorgaben und geringe Prognosequalität ergänzt
- TourState rückwärtskompatibel um Modus, Overrides, Eingabe-Fingerprint und Ergebnissnapshot erweitert
- responsive Tour- und Etappenanzeige für Fahrstrategie ergänzt
- keine Änderungen an Energie-, Lade- oder Assistance-Core, keine KI, Telemetrie oder Fahrradsteuerung eingeführt

## Paket 20 - 2026-08-03

- deterministischen Assistance-Core `biketriphub-assistance-v1` als separates Modul ergänzt
- Höhenprofil stabil segmentiert und mittlere sowie maximale Steigung kontinuierlich ausgewertet
- kurze Rampen, mittlere und lange zusammenhängende Anstiege unterschieden
- Fahrerleistung, Gesamtgewicht, Zieltempo, Motorgrenze, Reststrecke und Zielreserve berücksichtigt
- Strategien energiesparend, ausgewogen, komfortabel, schnell und benutzerdefiniert im Core unterstützt
- Motoranteil als Unsicherheitsbereich und generische beziehungsweise belegte Fahrradmodi mit Quelle und Qualität ausgegeben
- erwartete Abschnittsenergie ausschließlich über den unveränderten produktiven Energie-Core berechnet
- experimentelle, responsive Etappenanzeige mit Akku, Energie, Begründungen und Warnungen ergänzt
- keine Telemetrie, Kalibrierung, Fahrradsteuerung oder automatische Touränderung eingeführt

## BikeTripHub Intelligence INT-00 - 2026-08-03

- PR #69 nach bestätigter Wiederholungsprüfung und ausdrücklicher Freigabe mit Merge-Commit `41354ac` nach `private` integriert
- verbindliches Fachkonzept für die Intelligence-Pakete 20 bis 32 erstellt
- produktiven Energie-/Ladekern klar von experimentellen Unterstützungs-, Telemetrie-, Shadow-, Kalibrierungs- und Optimierungs-Cores getrennt
- physikalische Annahmen, kontinuierliches Unterstützungsmodell, Referenzreichweite und Höhenmeterbehandlung dokumentiert
- versionierte TypeScript-/JSON-Verträge für Szenario, Profilimport, Telemetrie, Shadow Mode, Kalibrierung, Feature Flags und Optimierung entworfen
- Datenquellen-, Datenschutz-, Determinismus-, Qualitäts- und Modellfreigaberegeln festgelegt
- Paket 30 als Erweiterung der vorhandenen Ladeplanung aus Paket 19 abgegrenzt
- keine Produktivlogik, kein TourState-Schema und keine Benutzeroberfläche verändert

## Nacharbeit Paket 18/19 - 2026-08-02

- persönliche flache Referenzreichweite als verbindliche Verbrauchskalibrierung in `biketriphub-energy-v2` integriert
- Referenzverbrauch, sichere Reichweite bis zur Reserve, physikalischen Rohverbrauch, kalibrierten Verbrauch und Kalibrierungsfaktor transparent ausgewiesen
- Kalibrierungsfaktor begrenzt und auffällige beziehungsweise begrenzte Faktoren mit sichtbaren Prüfhinweisen versehen
- Referenzreichweite eindeutig auf die aktuell konfigurierte Gesamtakkuanzahl bezogen und Profilhinweis bei geänderten Akkudaten ergänzt
- Regression für 80 km, 64 km mit 20 % Reserve und 100 km bei 80 km Referenzreichweite ergänzt
- Kalibrierungsfaktor auf den flachen Grundverbrauch begrenzt und physikalischen Steigungszuschlag separat addiert
- Gefälleentlastung ohne negative Akkuenergie oder Rekuperation begrenzt
- flachen Grundverbrauch, Steigungszuschlag, Gefälleentlastung, positive Höhenmeter und Wh je 100 Hm transparent ausgewiesen
- monotone 100-km-Regression für 100, 1.000 und 2.000 positive Höhenmeter ergänzt
- PR #69 bis zur Integration des korrigierten Energie-Cores ausdrücklich im Draft belassen

## Paket 19 - 2026-08-01

- separate, deterministische Ladeplanung auf Basis des korrigierten, kalibrierten Paket-18-Energie-Cores ergänzt
- Akkustand, Reserve und erste kritische Stelle über alle Segmente und Etappen fortgeschrieben
- Ladepunkte aus belegten POI-/Unterkunftsdaten sowie manuell erfassbare Ladepunkte unterstützt
- automatische Ladehalte, benötigte Nachladung, Ladeverluste und Ladezeit berechnet
- manuelle Ladehalte mit Ziel-Ladung, Entfernen und Reihenfolgeänderung ergänzt
- Tour- und Etappenansicht um Ankunfts-/Abfahrtsakku, Restreichweite, Ladezeit und Warnungen erweitert
- Ladeplanungszustand versioniert, rückwärtskompatibel und Tour-JSON-fähig gespeichert
- keine Live-Ladesäulen, Online-Dienste, Wetterdaten oder automatische Routen-/Etappenänderung ergänzt

## Paket 18 - 2026-07-30

- deterministischen, versionierten Energie- und Reichweiten-Rechenkern ergänzt
- echtes Etappen-Höhenprofil segmentweise nach Ebene, Steigung und Gefälle ausgewertet
- Roll-, Luft-, Lageenergie sowie Fahrer-, Motor- und Verlustanteil getrennt berechnet
- Akkuverbrauch, Restenergie, Restkapazität, Reichweitenprognose und Reservewarnung ergänzt
- klassische Fahrräder ohne erfundene Akkuwerte unterstützt
- Prognosequalität für vollständige, geschätzte und unvollständige Höhendaten ausgewiesen
- verständliche Energieprognose in der Etappenansicht ergänzt
- keine automatische Etappenänderung, Ladeplanung oder Wetter-/Windmodellierung ergänzt

## Paket 17 - 2026-07-30

- zentrales E-Bike-Profil um nutzbare Akkukapazität, Motorunterstützung und persönliches Fahrprofil erweitert
- Ladegerätleistung und Ladeverluste als validierte Ladeparameter ergänzt
- bestehende Paket-16-Profile durch definierte Standardwerte rückwärtskompatibel gehalten
- Speicherung, TourState sowie Profil- und Tour-JSON um die neuen Parameter erweitert
- keine Verbrauchs-, Reichweiten-, Ladezeit- oder Etappenberechnung ergänzt
- neuen Projektstandard dokumentiert: Ein neuer Auftrag bestätigt den Prüflauf des unmittelbar vorherigen Pakets

## Paket 16 - 2026-07-29

- zentrale Fahrer-, Fahrrad- und E-Bike-Profiltypen mit gemeinsamer Validierung ergänzt
- neue Einstellungsseite `/einstellungen/fahrprofil` mit Navigation ergänzt
- Fahrername, Körpergewicht, Fitness, Erfahrung, Tagesbelastung und Fahrzeitgrenzen speicherbar gemacht
- Fahrradtyp, Fahrradgewicht und Gepäckgewicht speicherbar gemacht
- E-Bike-Grunddaten ohne Energie- oder Reichweitenberechnung ergänzt
- Profil lokal gespeichert und als validierten Snapshot in den TourState integriert
- getrennten JSON-Export und -Import für das Profil ergänzt; Tour-JSON übernimmt den Profilsnapshot
- verbindlichen Freigabeprozess für alle Pakete ab Paket 16 im Repository dokumentiert

## Paket 15 - 2026-07-29

- Routenplanung unter `/planer/route` und Etappenplanung unter `/planer/etappen` als eigene Bedienbereiche getrennt
- gemeinsame Navigation zwischen beiden Planungsbereichen ergänzt
- vorhandenen Browser-TourState als unveränderte gemeinsame Routengrundlage beibehalten
- Routenansicht auf Direkteingabe, GPX-Import, Grundroute, Karte, Radwegeanteil und Höhenprofil fokussiert
- Etappenansicht auf Erzeugung, Vorschau und Bearbeitung der Etappen fokussiert
- alte `/planer`-Links kompatibel auf den passenden neuen Bereich weitergeleitet
- vorhandene `ACCOMMODATION_*`-Konfiguration für die Raspberry-Pi-Abnahme an den App-Container weitergereicht
- keine Energie-, E-Bike- oder Akkurechenlogik ergänzt

## Paket 14 - 2026-07-28

- routenabhängige Kartenbegrenzung entfernt
- Zoom-Schaltflächen auf den vollständigen MapLibre-Bereich von 0 bis 22 erweitert
- native OSM-/CyclOSM-Kachelstufen begrenzt und darüber sauberes Überzoomen aktiviert
- automatisches Zentrieren der Route von den manuellen Zoomgrenzen getrennt
- Touch-, Mausrad-, Tastatur- und Save/Load-Verhalten unverändert gelassen

## Paket 13 - 2026-07-26

- Unterkunft als persistente Etappenentität ergänzt
- Filter für Typ, Routen-/Etappenendentfernung und belegte Fahrradmerkmale ergänzt
- Provider für lokale Entwicklung, Entwicklung und Produktion abstrahiert
- fest verdrahteten öffentlichen Overpass- und produktiven Testdatenfallback entfernt
- Kartenmarker nach Unterkunftstyp und Planungsstatus differenziert
- BRouter-Abstecher als echten Hin- und Rückweg separat geroutet
- Unterkunft und Abstecher in Etappe, TourState und Reiseplan integriert

## v0.3.0 - 2026-06-03

- Redis lazy initialisiert
- ESLint-Konfiguration ergaenzt
- RouteMap ueberarbeitet
- Start-/Ziel-/Zwischenzielmarker ergaenzt
- farbige Etappenlinien ergaenzt
- robustes Resize-Verhalten der Karte ergaenzt
- Kartenfehler-Hinweis ergaenzt
- GPX-Import fuer trkpt, rtept und wpt erweitert
- GPX-Name und Hoehenprofil uebernommen
- editierbare Etappen ergaenzt
- POI-Filter erweitert
- Waypoints an Karte uebergeben
- tsconfig.tsbuildinfo in .gitignore aufgenommen
- package-lock.json fuer reproduzierbare npm-Installationen ergaenzt
- Dockerfiles auf npm ci umgestellt
- GPX-Testfluss mit direktem Reiseplan-Link im Planer verbessert
- markierte Test-POI entlang beliebiger importierter Routen ergaenzt, wenn lokale POI fehlen
- Reiseplan-Webansicht mit Karte, Etappen-Checks und POI je Etappe ausgebaut
- Produktions-Deployment fuer Webserver mit Caddy, Docker Compose und Deploy-Script ergaenzt
- GPX-Kartenfit robuster gegen Ausreisser und vertauschte Koordinaten gemacht
- Etappen-Timeline fuer schmale Planer-Spalten lesbarer gemacht
- Alte Route-/POI-Zustaende beim Neuplanen oder GPX-Import zurueckgesetzt
- Start-/Zielmarker bei abweichenden Waypoints aus der Routengeometrie abgeleitet
- Kartenhoehe im Planer fixiert, damit Route und Marker im sichtbaren Ausschnitt bleiben
- Karten-Zentrierung auf einmaliges Auto-Fit pro Route umgestellt
- Button zum manuellen Route-Zentrieren ergaenzt
- Karten-Diagnostik fuer Koordinaten, Bounds und verworfene Punkte ergaenzt
- Kartenhoehe auf die sichtbare Displayhoehe begrenzt
- Karten-Pan und Zoom auf den Routenbereich begrenzt
- Mehrseitiger Planungsworkflow fuer Eingabeart, direkte Route, GPX, Uebersicht, Bearbeitung und Etappen vorbereitet
- Startseite startet ohne Demo-Orte und bietet getrennte Aktionen fuer direkte Eingabe, GPX, Demo und gespeicherte Tour
- Lokaler TourState fuer Routenuebersicht und Vollbildkarte ergaenzt
- Eigene Vollbildkartenroute `/planer/karte` mit Ruecksprung zur Bearbeitung und Etappenplanung ergaenzt
- Individuelle Etappenpunkte mit Ortsname, km-Position und Kartenklick entlang der GPX-Route ergaenzt
- GPX-basierter Routenzuschnitt per Start-/End-km ergaenzt
- Manuelle Etappenbearbeitung ueber Start-km, Ziel-km und Laenge mit Neuberechnung der Etappengeometrie ergaenzt
- Tests fuer GPX-Import, Routentrimmen, Etappenvorschlaege und manuelle Etappengeometrie ergaenzt
- Public/private-Deployment-Konzept dokumentiert
- Artefakt-Skripte fuer public/private-Branch-Vorbereitung ergaenzt
- Sicherheitschecks fuer public/private-Artefakte ergaenzt
- Echte Deployment-Branches `public` und `private` vorbereitet und dokumentiert
- RPi-/Produktionsstart um Wait-for-Postgres und Wait-for-Redis ergaenzt
- Worker-Healthcheck und RPi-Install-/Update-Logs verbessert
