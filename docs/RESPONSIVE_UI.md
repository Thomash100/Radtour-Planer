# Responsive UI und Darstellungsvertrag

## Ziel

Die bestehende BikeTripHub-Anwendung verwendet eine gemeinsame responsive Komponentenstruktur. Es gibt keine getrennte Mobil-, Tablet- oder Desktop-App und keinen zweiten Tour-, Etappen- oder Routingzustand.

## Navigation

Die fünf Hauptbereiche sind zentral in `src/lib/app-navigation.ts` definiert:

- Start
- Route
- Etappen
- Unterkünfte
- Reiseplan

Bis 1179 px wird dieselbe Navigation als feste Bottom-Navigation dargestellt. Ab 1180 px erscheint sie horizontal im Kopfbereich. Konfiguration, Tourverwaltung, Import/Export, Fahrprofil, Hilfe und Routenvergleich liegen im Sekundärmenü.

## Etappenfarben

`src/lib/stage-visuals.ts` enthält die verbindliche Referenzpalette. Die Farbe wird deterministisch aus der Etappennummer abgeleitet. Für weitere Etappen wird die Palette mit einem stabilen Goldener-Winkel-Verfahren erweitert. Es wird keine Zufallszahl verwendet.

Karte, Kartenlegende, Etappenkarte, Mini-Höhenprofil und Reiseplan rufen dieselbe Farbfunktion auf.

## Mini-Höhenprofile

Die Profile werden als responsive SVG-Flächen aus den realen Punkten von `route.elevationProfile` erzeugt. Vor der Darstellung wird das Profil anhand der tatsächlichen Etappengrenzen mit `sliceElevationProfile` geschnitten. Weniger als zwei gültige Punkte ergeben einen sichtbaren Leerzustand; Höhenwerte werden nie erfunden.

## Darstellungsoptionen

Darstellungsoptionen werden unter `biketriphub.uiPreferences.v1` gespeichert. Der Vertrag umfasst:

- Etappenfarben
- Mini-Höhenprofile
- Etappennummern
- großes Höhenprofil
- POIs
- Standard- oder Radkarte
- kompakte Etappenkarten

Die Optionen sind bewusst appbezogen und gehören nicht zur fachlichen Tour. Deshalb bleibt `StoredTourState` unverändert und ältere Touren sowie JSON-Exporte bleiben kompatibel.

## Breakpoints

- Smartphone: 360 bis 480 px
- Tablet: 768 bis 1179 px
- Desktop: ab 1180 px

Layout, Navigation und Inhaltsreihenfolge ändern sich responsiv; die zugrunde liegenden Komponenten und Datenverträge bleiben identisch.
