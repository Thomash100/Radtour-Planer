# Changelog

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
