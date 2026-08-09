# Bedienmodi der Routenplanung

## Ziel

BikeTripHub stellt für den Routenplanungs-Workflow zwei austauschbare Bedienführungen bereit. Variante A blendet die gewählte Eingabe auf der Auswahlseite ein. Variante B führt als fokussierter Assistent durch Auswahl, Eingabe und Routenprüfung. Beide Varianten verwenden dieselbe Fachlogik und denselben TourState.

## Architektur und Core-Abgrenzung

Der reine Workflow-Core liegt in `src/lib/planner-workflow.ts`. Er definiert:

- `RoutePlanningInteractionMode`: `inline` oder `wizard`
- `RoutePlanningMethod`: `direct`, `gpx` oder `demo`
- `RoutePlanningStep`: Auswahl, Direkteingabe, GPX-Import, Demo und Routenprüfung
- `RoutePlanningWorkflowState`: Bedienmodus, aktiver Schritt und gewählte Methode
- deterministische Übergänge für Auswahl, Abschluss, Zurück, Moduswechsel und Reset

Der Core importiert weder React noch Next.js, Browser-, DOM-, CSS-, Karten- oder Persistenzcode. Er enthält keine URLs. Der UI-Adapter im bestehenden `PlannerClient` übersetzt Core-Schritte in die vorhandenen Planeransichten und in Browser-History-Einträge.

## Gemeinsamer Datenfluss

```text
Bedienpräferenz
    ↓
Workflow-Core
    ↓
Inline- oder Assistent-Layout
    ↓
gemeinsame Eingabeformulare und Handler
    ↓
Routing / GPX / Demo
    ↓
gemeinsamer TourState
    ↓
Routenprüfung / Etappenplanung
```

Direkte Routenberechnung, GPX-Import, Demo-Tour, Kürzen, Karten, Höhenprofil, Etappenerzeugung und Browser-Persistenz werden nicht pro Bedienmodus dupliziert.

## Variante A – Eingabe auf derselben Seite

- Die Auswahl der Planungsart bleibt sichtbar.
- Genau eine gemeinsame Eingabefunktion wird darunter eingeblendet.
- Ein Methodenwechsel tauscht nur die sichtbare UI-Orchestrierung aus.
- Bereits eingegebene Direktplanungswerte bleiben im vorhandenen Formularzustand erhalten.
- Der aktive Eingabebereich wird automatisch in den sichtbaren Bereich gescrollt.

## Variante B – Geführter Assistent

- Die Auswahl ist ein eigener fokussierter Schritt.
- Direkteingabe, GPX-Import und Demo verwenden jeweils eine eigene Workflow-Ansicht.
- Eine dezente Fortschrittsanzeige kennzeichnet Auswahl, Eingabe und Prüfung.
- „Zurück zur Routenplanung“ sowie Browser-Zurück führen zur Methodenauswahl.
- Die Formulare und ihre fachlichen Handler sind identisch mit Variante A.

## Persistenz und Default

Die Auswahl wird als App-/Benutzereinstellung im bestehenden Schlüssel `biketriphub.uiPreferences.v1` gespeichert. Das Präferenzschema besitzt Version 2. Der TourState und exportierte Touren enthalten keinen Bedienmodus.

Für alte oder unvollständige Präferenzen gilt `wizard` als Default. Das entspricht dem vor Einführung der Varianten stabilen, schrittweisen Bedienmodell.

## Entfernen einer Variante

Eine spätere Produktentscheidung betrifft ausschließlich:

1. das jeweilige Layout im `PlannerClient`,
2. die Auswahlkarte im Startfenster und in der Konfiguration,
3. den nicht mehr benötigten Moduswert im Präferenzschema.

Routing-Core, GPX-Import, TourState, Karten-, Höhen- und Etappenmodelle benötigen keine Migration. Bestehende Touren bleiben unverändert lesbar.

## Vorgehen nach dem Nutzertest

Die beiden Varianten werden auf Smartphone, Tablet und Desktop mit denselben Aufgaben verglichen. Nach der manuellen Prüfung wird separat entschieden, ob Variante A, Variante B oder beide dauerhaft bestehen bleiben. Bis zu dieser Entscheidung erfolgt kein automatischer Wechsel und keine fachliche Gewichtung durch die Anwendung.
