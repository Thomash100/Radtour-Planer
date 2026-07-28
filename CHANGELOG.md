# Changelog

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
