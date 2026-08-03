# Vertrags- und Schemaentwurf BikeTripHub Intelligence

- Stand: 2026-08-03
- Status: fachlicher Entwurf; Implementierung erfolgt paketweise
- Grundlage: [BIKETRIPHUB_INTELLIGENCE.md](BIKETRIPHUB_INTELLIGENCE.md)

## 1. Zweck

Dieses Dokument definiert die stabilen Grenzen zwischen Profil, Route, Energie, Unterstuetzung, Telemetrie, Shadow Mode, Kalibrierung und Optimierung. Die TypeScript-Ausschnitte sind Zielvertraege, noch keine in diesem Konzeptabschnitt auszuliefernden Laufzeittypen.

Jedes spaetere Paket darf den fuer seinen Umfang benoetigten Teil konkretisieren. Inkompatible Aenderungen brauchen eine neue Schema-Hauptversion, Migrationstests und eine Aktualisierung dieses Dokuments.

## 2. Namens- und Versionsregeln

- Export-Schemas verwenden `biketriphub.<domain>.v<major>`.
- Rechenmodelle verwenden `biketriphub-<domain>-v<major>`.
- Jeder Export enthaelt `schema`, `schemaVersion` und `createdAt` beziehungsweise `exportedAt`.
- `modelVersion` beschreibt die Formel; `schemaVersion` beschreibt die Datenform.
- Alte Daten werden beim Lesen migriert. Das Schreiben verwendet nur die aktuelle Version.
- Unbekannte Hauptversionen werden mit einer verstaendlichen Meldung abgelehnt.
- IDs sind stabile Strings und werden nicht aus lokalisierten Anzeigenamen erzeugt.

## 3. Einheiten und Basistypen

Alle Core-Vertraege verwenden explizite Einheiten im Feldnamen.

```ts
type IsoUtcTimestamp = string;
type Wgs84Position = readonly [longitude: number, latitude: number];
type QualityLevel = "high" | "medium" | "low" | "unknown";

type DataSourceRef = {
  kind: "user" | "manufacturer" | "app-export" | "telemetry" | "derived";
  label: string;
  uri?: string;
  capturedAt?: IsoUtcTimestamp;
  checksumSha256?: string;
};

type QualityAssessment = {
  level: QualityLevel;
  reasons: string[];
  measuredFields?: string[];
  estimatedFields?: string[];
  missingFields?: string[];
};

type ModelIdentity = {
  modelVersion: string;
  inputSchema: string;
  inputHashSha256: string;
};
```

Konventionen:

- Distanz: Meter (`M`) oder Kilometer (`Km`), niemals einheitenlos.
- Hoehe: Meter (`M`).
- Dauer: Sekunden (`Seconds`) in Core-Vertraegen.
- Energie: Wattstunden (`Wh`).
- Leistung: Watt (`W`).
- Geschwindigkeit: Meter pro Sekunde (`Mps`).
- Temperatur: Grad Celsius (`C`).
- Steigung und Akkustand: Prozentpunkte (`Percent`).
- Koordinaten: WGS84 in der Reihenfolge Laengengrad, Breitengrad.
- Zeitstempel: ISO 8601 in UTC mit `Z`.

## 4. Normalisiertes Szenario

Alle Intelligence-Cores erhalten dieselbe Routengrundlage.

```ts
type IntelligenceSegmentV1 = {
  id: string;
  stageId: string;
  order: number;
  startDistanceM: number;
  endDistanceM: number;
  distanceM: number;
  durationSeconds: number;
  elevationStartM: number | null;
  elevationEndM: number | null;
  elevationGainM: number;
  elevationLossM: number;
  gradePercent: number | null;
  targetSpeedMps: number | null;
  surface?: string;
  sourceQuality: QualityAssessment;
};

type IntelligenceScenarioV1 = {
  schema: "biketriphub.intelligence-scenario.v1";
  schemaVersion: 1;
  scenarioId: string;
  profileSnapshot: RiderBikeProfile;
  segments: IntelligenceSegmentV1[];
  assumptions: {
    airDensityKgM3: number;
    gravityMps2: number;
    windSpeedMps: number | null;
    temperatureC: number | null;
  };
};
```

Validierung:

- `endDistanceM >= startDistanceM`,
- `distanceM = endDistanceM - startDistanceM` innerhalb 1 m Toleranz,
- `durationSeconds > 0` fuer bewegte Segmente,
- `order` ist je Szenario eindeutig und lueckenlos,
- Segmente ueberlappen nicht,
- fehlende Hoehe ist `null`, nicht `0`,
- Profil wird als validierter Snapshot uebergeben und waehrend der Berechnung nicht gelesen oder geschrieben.

## 5. Fahrradprofil-Import

Paket 21 erweitert das bestehende `RiderBikeProfile`, ersetzt es aber nicht still.

```ts
type ImportedValue<T> = {
  value: T;
  source: DataSourceRef;
  quality: QualityLevel;
  evidence?: string;
  confirmedByUser: boolean;
};

type BikeProfileImportV1 = {
  schema: "biketriphub.bike-profile-import.v1";
  schemaVersion: 1;
  source: DataSourceRef;
  candidate: {
    manufacturer?: ImportedValue<string>;
    model?: ImportedValue<string>;
    bikeWeightKg?: ImportedValue<number>;
    batteryCapacityWh?: ImportedValue<number>;
    batteryCount?: ImportedValue<number>;
    motorPowerW?: ImportedValue<number>;
    chargerPowerW?: ImportedValue<number>;
    assistanceModes?: Array<{
      id: string;
      label: string;
      minimumRatio: number | null;
      maximumRatio: number | null;
      source: DataSourceRef;
      quality: QualityLevel;
    }>;
  };
};
```

Regeln:

- OCR- oder Screenshotwerte starten mit `confirmedByUser: false`.
- Ein Import erzeugt zuerst einen Unterschiedsbericht.
- Nur einzeln bestaetigte Werte werden in ein neues Profil uebernommen.
- Aenderungen an Akkuanzahl oder Kapazitaet markieren `referenceRangeKm` als erneut zu pruefen.
- Die Referenzreichweite gilt fuer die gesamte konfigurierte Akkuanzahl.

## 6. Telemetrieformat

```ts
type TelemetrySampleV1 = {
  sequence: number;
  timestampUtc: IsoUtcTimestamp | null;
  position: Wgs84Position | null;
  distanceM: number | null;
  elevationM: number | null;
  gradePercent: number | null;
  speedMps: number | null;
  riderPowerW: number | null;
  motorPowerW: number | null;
  batteryEnergyWh: number | null;
  batteryCapacityPercent: number | null;
  cadenceRpm: number | null;
  temperatureC: number | null;
  qualityFlags: string[];
};

type TelemetryTrackV1 = {
  schema: "biketriphub.telemetry-track.v1";
  schemaVersion: 1;
  trackId: string;
  source: DataSourceRef;
  profileSnapshot: RiderBikeProfile | null;
  samples: TelemetrySampleV1[];
  quality: QualityAssessment;
  transformations: Array<{
    id: string;
    version: string;
    parameters: Record<string, string | number | boolean>;
  }>;
};
```

Verbindliche Regeln:

- `sequence` bestimmt die stabile Reihenfolge.
- Vorhandene Zeitstempel muessen monoton nicht fallend sein.
- Akkuprozent liegt zwischen 0 und 100; ungueltige Werte werden nicht gekappt, sondern als Validierungsfehler markiert.
- GPS-Spruenge, Zeitluecken und Sensorausfaelle werden ueber Qualitaetsflags ausgewiesen.
- Abgeleitete Werte werden nicht als gemessen gekennzeichnet.
- Rohimport und Normalform haben getrennte Pruefsummen.

## 7. Unterstuetzungsempfehlung

```ts
type AssistanceRecommendationV1 = {
  model: ModelIdentity;
  status: "recommended" | "limited" | "infeasible" | "not-applicable";
  segments: Array<{
    segmentId: string;
    assistanceRatio: number;
    mappedMode: {
      id: string;
      label: string;
      source: DataSourceRef | null;
      quality: QualityLevel;
    } | null;
    riderPowerW: number;
    motorMechanicalPowerW: number;
    batteryEnergyWh: number;
    expectedSpeedMps: number;
    reserveCapacityPercentAfterSegment: number | null;
    limitingReasons: string[];
  }>;
  totalBatteryEnergyWh: number | null;
  finalReserveCapacityPercent: number | null;
  quality: QualityAssessment;
  assumptions: string[];
};
```

`assistanceRatio` bleibt von der Herstellerbezeichnung getrennt. Ein fehlendes oder schlecht belegtes Mapping senkt die Mapping-Qualitaet, nicht die numerische Berechenbarkeit.

## 8. Shadow-Vergleich

```ts
type ComparableEnergyResult = {
  model: ModelIdentity;
  totalBatteryEnergyWh: number | null;
  reserveCapacityPercent: number | null;
  firstCriticalDistanceM: number | null;
  quality: QualityAssessment;
};

type ShadowComparisonV1 = {
  schema: "biketriphub.shadow-comparison.v1";
  schemaVersion: 1;
  scenarioId: string;
  production: ComparableEnergyResult;
  experiment: ComparableEnergyResult;
  delta: {
    batteryEnergyWh: number | null;
    batteryEnergyPercent: number | null;
    reserveCapacityPercentagePoints: number | null;
    firstCriticalDistanceM: number | null;
  };
  createdFromDeterministicRun: true;
};
```

`createdAt` ist bewusst kein Core-Feld. Die Orchestrierung kann einen Zeitstempel als Metadatum ergaenzen, dieser gehoert aber nicht zum deterministischen Ergebnisvergleich.

## 9. Kalibrierungskandidat

```ts
type CalibrationCandidateV1 = {
  schema: "biketriphub.calibration-candidate.v1";
  schemaVersion: 1;
  model: ModelIdentity;
  profileFingerprint: string;
  includedTrackIds: string[];
  excludedTracks: Array<{ trackId: string; reasons: string[] }>;
  sample: {
    rideCount: number;
    distanceM: number;
    elevationGainM: number;
  };
  candidate: {
    referenceConsumptionWhPerKm: number | null;
    sustainableRiderPowerW: number | null;
    assistanceScaleFactor: number | null;
    climbScaleFactor: number | null;
  };
  validation: {
    holdoutRideCount: number;
    meanAbsoluteErrorWh: number | null;
    medianAbsolutePercentageError: number | null;
    reserveClassificationErrors: number;
  };
  quality: QualityAssessment;
  boundedFields: string[];
  requiresUserConfirmation: true;
};
```

Der Kandidat enthaelt keine Schreiboperation. Die bestaetigte Uebernahme ist ein separater Anwendungsfall mit Vorher-/Nachher-Darstellung und neuem Profil-Export.

## 10. Feature-Flag-Vertrag

```ts
type IntelligenceFeatureFlagKey =
  | "intelligence.assistance.continuous"
  | "intelligence.telemetry.analysis"
  | "intelligence.shadow.energy"
  | "intelligence.calibration.personal"
  | "intelligence.factor.temperature"
  | "intelligence.factor.surface"
  | "intelligence.factor.wind"
  | "intelligence.rider.adaptive-power"
  | "intelligence.regeneration"
  | "intelligence.optimization.stages";

type FeatureFlagStateV1 = {
  schema: "biketriphub.intelligence-feature-flags.v1";
  schemaVersion: 1;
  flags: Partial<Record<IntelligenceFeatureFlagKey, boolean>>;
};
```

Auswertung:

```text
effective = knownFlag
         AND configuredValue
         AND dependenciesEnabled
         AND scopeAllowsActivation
```

Unbekannt, fehlend oder ungueltig bedeutet `false`. Die Auswertung selbst ist rein und deterministisch. Deployment-Konfiguration, Benutzervorschau und Kill-Switch werden in einer festen, dokumentierten Prioritaet zusammengefuehrt.

## 11. Optimierungsvertrag

```ts
type OptimizationObjectiveWeightsV1 = {
  batteryReserve: number;
  personalLoad: number;
  travelTime: number;
  chargingTime: number;
  stageBalance: number;
};

type OptimizationConstraintsV1 = {
  minimumReservePercent: number;
  maximumDailyRideSeconds: number;
  maximumPersonalLoad: number;
  maximumChargingStops: number | null;
  allowedAssistanceRatio: { minimum: number; maximum: number };
};

type TourOptimizationResultV1 = {
  model: ModelIdentity;
  status: "feasible" | "infeasible" | "partial";
  candidates: Array<{
    id: string;
    score: number;
    objectiveParts: Record<keyof OptimizationObjectiveWeightsV1, number>;
    violatedConstraints: string[];
    stageBreaksM: number[];
    chargingStopIds: string[];
    assistanceRecommendationId: string | null;
  }>;
  selectedCandidateId: string | null;
  selectionRequiresConfirmation: true;
  warnings: string[];
};
```

Harte Grenzen werden nie durch einen guten gewichteten Score ueberstimmt. `selectedCandidateId` bedeutet nur eine rechnerische Empfehlung; der TourState wird erst durch eine bestaetigte Benutzeraktion geaendert.

## 12. Kompatibilitaet mit bestehenden Vertraegen

| Bestehender Vertrag | Intelligence-Nutzung | Regel |
| --- | --- | --- |
| `RiderBikeProfile` v1 | `profileSnapshot` | nur ueber validierenden Adapter; keine Mutation |
| `StageEnergyProjection` / `biketriphub-energy-v2` | Produktivreferenz und Segmentenergie | Ergebnis unveraendert uebernehmen |
| `ChargingPlan` / `biketriphub-charging-v1` | produktive Ladebasis | Paket 30 erweitert durch Varianten, ersetzt v1 nicht still |
| `StoredTourState` | Szenarioquelle und spaetere bestaetigte Ergebnisse | Schema-Migration erforderlich, sobald neue Daten persistiert werden |
| `ElevationPoint[]` | Segmenthoehen | Normalisierungsverfahren versionieren |

Adapter muessen Fehler explizit liefern. Ein fehlgeschlagener Adapter darf weder leere Telemetrie noch Nullverbrauch als scheinbar gueltiges Ergebnis erzeugen.

## 13. Kanonische Serialisierung und Hashing

Fuer reproduzierbare Vergleiche wird vor dem Hashen:

1. gegen das konkrete Schema validiert,
2. jedes Objekt nach Schluesseln lexikografisch sortiert,
3. die fachlich definierte Rundung angewendet,
4. `undefined` entfernt, `null` jedoch erhalten,
5. Array-Reihenfolge fachlich normalisiert,
6. UTF-8-JSON ohne zusaetzliche Leerzeichen erzeugt,
7. SHA-256 ueber die resultierenden Bytes gebildet.

Zeitstempel, UI-Zustand, Anzeigenamen und andere nicht fachliche Metadaten gehoeren nicht in den Eingabe-Hash. Modell-, Schema- und Transformationsversionen gehoeren hinein.

## 14. Migrationsregeln

- Migrationen sind reine Funktionen `old -> new`.
- Originalexporte werden nicht ueberschrieben.
- Jede Hauptversion besitzt Golden-Dateien fuer kleinste, vollstaendige und fehlerhafte Beispiele.
- Mehrfaches Migrieren desselben Eingangs erzeugt dasselbe Ergebnis.
- Ein bereits aktuelles Dokument bleibt semantisch unveraendert.
- Informationsverlust oder neu erforderliche Bestaetigung wird sichtbar gemeldet.
- Nach Profilmigration werden Energie-, Shadow- und Optimierungsergebnisse neu berechnet, nicht blind weiterverwendet.

## 15. Fehlervertrag

Core-Module liefern typisierte Fehler oder werfen ausschliesslich dokumentierte Validierungsfehler. Mindestens zu unterscheiden sind:

- `invalid_schema`,
- `unsupported_version`,
- `invalid_unit_or_range`,
- `incomplete_route`,
- `insufficient_profile_data`,
- `insufficient_telemetry_quality`,
- `infeasible_constraints`,
- `model_limit_reached`.

Eine UI-Meldung darf Details vereinfachen, muss aber Code, betroffenes Modul und eine konkrete Korrekturmoeglichkeit erhalten.

## 16. Vertragspruefung je Paket

Vor Abschluss eines Pakets sind mindestens zu dokumentieren:

- verwendete Schema- und Modellversion,
- neu eingefuehrte oder geaenderte Felder,
- Einheiten und Grenzwerte,
- Abwaertskompatibilitaet und Migration,
- Determinismusnachweis,
- Golden-/Invariantentests,
- Verhalten bei fehlenden Daten,
- Feature-Flag- und Rueckfallverhalten,
- manuelle Raspberry-Pi-Pruefung,
- offene Risiken und manueller Stopppunkt.
