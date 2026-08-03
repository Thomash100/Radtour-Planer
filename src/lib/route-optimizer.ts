import type { LineStringGeoJson } from "@/lib/geo";
import type { RouteDataQualityLevel, RouteConditionDistribution, SurfaceClassification } from "@/lib/route-elevation-surface";

export const ROUTE_OPTIMIZATION_MODEL_VERSION = "biketriphub-route-optimizer-v1" as const;
export const ROUTE_OPTIMIZATION_PARETO_VERSION = "biketriphub-route-optimizer-pareto-v1" as const;
export const ROUTE_OPTIMIZATION_PRESET_VERSION = 1 as const;
export const ROUTE_OPTIMIZATION_STATE_VERSION = 1 as const;

export const routeOptimizationObjectives = [
  "travelTime",
  "energy",
  "comfort",
  "asphalt",
  "grade",
  "reserve",
  "chargingTime",
  "chargingStops"
] as const;

export type RouteOptimizationObjective = (typeof routeOptimizationObjectives)[number];
export type RouteOptimizationModelVersion = typeof ROUTE_OPTIMIZATION_MODEL_VERSION;
export type RouteOptimizationPresetId =
  | "balanced"
  | "fast"
  | "energy_saving"
  | "comfort"
  | "asphalt"
  | "high_reserve"
  | "custom";

export type RouteCandidateSource = {
  kind: "brouter" | "gpx" | "saved" | "manual";
  label: string;
  detail: string;
  routingProvider?: "brouter" | "mock";
  routingProfile?: string;
  existingCandidateOfflineAvailable: true;
  newCandidateGeneration: "local_router" | "external_router" | "not_available" | "unknown";
};

export type RouteCandidate = {
  id: string;
  name: string;
  source: RouteCandidateSource;
  geometry: LineStringGeoJson;
  geometryFingerprint: string;
  distanceKm: number;
  travelTimeHours: number | null;
  elevationUpM: number | null;
  elevationDownM: number | null;
  maximumGradePercent: number | null;
  energyNeedWh: number | null;
  destinationBatteryPercent: number | null;
  minimumReservePercent: number | null;
  chargingStops: number | null;
  chargingTimeMinutes: number | null;
  surfaceDistribution: RouteConditionDistribution<SurfaceClassification>[];
  asphaltPercent: number | null;
  unpavedPercent: number | null;
  unknownSurfacePercent: number | null;
  comfortScore: number | null;
  dataQualityLevel: RouteDataQualityLevel;
  dataQualityScore: number;
  warnings: string[];
  modelVersions: Record<string, string>;
};

export type RouteOptimizationWeights = Record<RouteOptimizationObjective, number>;
export type NormalizedObjectiveScores = Record<RouteOptimizationObjective, number | null>;

export type RouteOptimizationConstraint = {
  enabled: boolean;
  value: number;
};

export type RouteOptimizationConstraints = {
  minimumDestinationReservePercent: RouteOptimizationConstraint;
  minimumAlongRouteReservePercent: RouteOptimizationConstraint;
  maximumChargingTimeMinutes: RouteOptimizationConstraint;
  maximumChargingStops: RouteOptimizationConstraint;
  maximumUnknownSurfacePercent: RouteOptimizationConstraint;
  maximumUnpavedPercent: RouteOptimizationConstraint;
  maximumGradePercent: RouteOptimizationConstraint;
  minimumDataQualityScore: RouteOptimizationConstraint;
};

export type RouteOptimizationInput = {
  candidates: RouteCandidate[];
  weights: RouteOptimizationWeights;
  constraints: RouteOptimizationConstraints;
  presetId: RouteOptimizationPresetId;
  manualCandidateId?: string | null;
};

export type ConstraintViolationCode =
  | "minimum_destination_reserve"
  | "minimum_along_route_reserve"
  | "maximum_charging_time"
  | "maximum_charging_stops"
  | "maximum_unknown_surface"
  | "maximum_unpaved"
  | "maximum_grade"
  | "minimum_data_quality"
  | "unknown_required_value";

export type ConstraintViolation = {
  code: ConstraintViolationCode;
  constraint: keyof RouteOptimizationConstraints;
  message: string;
  actualValue: number | null;
  limitValue: number;
};

export type WeightedObjectiveContribution = {
  objective: RouteOptimizationObjective;
  rawValue: number | null;
  normalizedScore: number | null;
  normalizedWeight: number;
  contribution: number;
  known: boolean;
};

export type ParetoRelation = {
  candidateId: string;
  relatedCandidateId: string;
  relation: "dominates" | "dominated_by" | "equivalent" | "tradeoff" | "not_comparable";
};

export type RouteCandidateEvaluation = {
  candidateId: string;
  admissible: boolean;
  constraintViolations: ConstraintViolation[];
  normalizedScores: NormalizedObjectiveScores;
  contributions: WeightedObjectiveContribution[];
  totalScore: number;
  objectiveCoverage: number;
  paretoStatus: "front" | "dominated" | "not_comparable" | "excluded";
  dominatesCandidateIds: string[];
  dominatedByCandidateIds: string[];
  advantages: string[];
  disadvantages: string[];
  tradeoffs: string[];
  uncertainties: string[];
  recommendationReasons: string[];
  recommended: boolean;
  recommendationLimited: boolean;
};

export type RouteRecommendation = {
  candidateId: string | null;
  equivalentCandidateIds: string[];
  technicalTieBreak: boolean;
  limited: boolean;
  reasons: string[];
};

export type RouteOptimizationResult = {
  modelVersion: RouteOptimizationModelVersion;
  paretoModelVersion: typeof ROUTE_OPTIMIZATION_PARETO_VERSION;
  inputFingerprint: string;
  status: "ok" | "invalid" | "all_excluded" | "empty";
  validationErrors: string[];
  normalizedWeights: RouteOptimizationWeights;
  normalization: Record<
    RouteOptimizationObjective,
    {
      direction: "minimize" | "maximize";
      lowerBound: number | null;
      upperBound: number | null;
      method: "min-max" | "median-mad-clipped" | "identical" | "unknown";
      knownValues: number;
    }
  >;
  evaluations: RouteCandidateEvaluation[];
  paretoRelations: ParetoRelation[];
  recommendation: RouteRecommendation;
};

export type RouteOptimizationCandidateReference = {
  id: string;
  name: string;
  source: RouteCandidateSource;
  geometryFingerprint: string;
};

export type RouteOptimizationStoredState = {
  schemaVersion: typeof ROUTE_OPTIMIZATION_STATE_VERSION;
  modelVersion: RouteOptimizationModelVersion;
  paretoModelVersion: typeof ROUTE_OPTIMIZATION_PARETO_VERSION;
  presetVersion: typeof ROUTE_OPTIMIZATION_PRESET_VERSION;
  presetId: RouteOptimizationPresetId;
  weights: RouteOptimizationWeights;
  normalizedWeights: RouteOptimizationWeights;
  constraints: RouteOptimizationConstraints;
  selectedCandidates: RouteOptimizationCandidateReference[];
  manualCandidateId: string | null;
  hiddenCandidateIds: string[];
  displayMode: "overview" | "comparison";
  lastInputFingerprint: string | null;
  recommendedCandidateId: string | null;
};

export const routeOptimizationObjectiveLabels: Record<RouteOptimizationObjective, string> = {
  travelTime: "Fahrzeit",
  energy: "Energiebedarf",
  comfort: "Komfort",
  asphalt: "Asphaltanteil",
  grade: "Steigungsbelastung",
  reserve: "Akkureserve",
  chargingTime: "Ladezeit",
  chargingStops: "Ladehalte"
};

export const routeOptimizationConstraintLabels: Record<keyof RouteOptimizationConstraints, string> = {
  minimumDestinationReservePercent: "Mindestreserve am Ziel",
  minimumAlongRouteReservePercent: "Mindestreserve entlang der Route",
  maximumChargingTimeMinutes: "Maximale gesamte Ladezeit",
  maximumChargingStops: "Maximale Anzahl Ladehalte",
  maximumUnknownSurfacePercent: "Maximal unbekannte Streckendaten",
  maximumUnpavedPercent: "Maximal unbefestigte Wege",
  maximumGradePercent: "Maximale Steigung",
  minimumDataQualityScore: "Mindest-Datenqualität"
};

const balancedWeights: RouteOptimizationWeights = {
  travelTime: 1,
  energy: 1,
  comfort: 1,
  asphalt: 1,
  grade: 1,
  reserve: 1,
  chargingTime: 1,
  chargingStops: 0
};

export const routeOptimizationPresets: Record<Exclude<RouteOptimizationPresetId, "custom">, { label: string; weights: RouteOptimizationWeights }> = {
  balanced: { label: "Ausgewogen", weights: balancedWeights },
  fast: {
    label: "Schnell",
    weights: { travelTime: 5, energy: 1, comfort: 0.5, asphalt: 0.5, grade: 0.5, reserve: 1, chargingTime: 2, chargingStops: 0.5 }
  },
  energy_saving: {
    label: "Energiesparend",
    weights: { travelTime: 1, energy: 5, comfort: 0.5, asphalt: 1, grade: 2, reserve: 3, chargingTime: 1, chargingStops: 0.5 }
  },
  comfort: {
    label: "Komfortorientiert",
    weights: { travelTime: 1, energy: 1, comfort: 5, asphalt: 2, grade: 2, reserve: 1, chargingTime: 0.5, chargingStops: 0.5 }
  },
  asphalt: {
    label: "Asphalt bevorzugt",
    weights: { travelTime: 1, energy: 1, comfort: 2, asphalt: 6, grade: 1, reserve: 1, chargingTime: 0.5, chargingStops: 0.5 }
  },
  high_reserve: {
    label: "Hohe Akkureserve",
    weights: { travelTime: 0.5, energy: 3, comfort: 0.5, asphalt: 0.5, grade: 2, reserve: 6, chargingTime: 2, chargingStops: 1 }
  }
};

export const DEFAULT_ROUTE_OPTIMIZATION_CONSTRAINTS: RouteOptimizationConstraints = {
  minimumDestinationReservePercent: { enabled: false, value: 20 },
  minimumAlongRouteReservePercent: { enabled: false, value: 15 },
  maximumChargingTimeMinutes: { enabled: false, value: 120 },
  maximumChargingStops: { enabled: false, value: 3 },
  maximumUnknownSurfacePercent: { enabled: false, value: 40 },
  maximumUnpavedPercent: { enabled: false, value: 30 },
  maximumGradePercent: { enabled: false, value: 14 },
  minimumDataQualityScore: { enabled: false, value: 50 }
};

const objectiveDirections: Record<RouteOptimizationObjective, "minimize" | "maximize"> = {
  travelTime: "minimize",
  energy: "minimize",
  comfort: "maximize",
  asphalt: "maximize",
  grade: "minimize",
  reserve: "maximize",
  chargingTime: "minimize",
  chargingStops: "minimize"
};

const objectiveRawValue: Record<RouteOptimizationObjective, (candidate: RouteCandidate) => number | null> = {
  travelTime: (candidate) => candidate.travelTimeHours,
  energy: (candidate) => candidate.energyNeedWh,
  comfort: (candidate) => candidate.comfortScore,
  asphalt: (candidate) => candidate.asphaltPercent,
  grade: (candidate) => candidate.maximumGradePercent,
  reserve: (candidate) => candidate.minimumReservePercent,
  chargingTime: (candidate) => candidate.chargingTimeMinutes,
  chargingStops: (candidate) => candidate.chargingStops
};

export function routeCandidateObjectiveValue(candidate: RouteCandidate, objective: RouteOptimizationObjective) {
  return objectiveRawValue[objective](candidate);
}

export const routeOptimizationObjectiveDirections = { ...objectiveDirections };

const stableSortTieBreakers = [
  "admissible",
  "recommended",
  "pareto",
  "score",
  "dataQuality",
  "minimumReserve",
  "travelTime",
  "candidateId"
] as const;

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function finiteOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function fingerprint(value: unknown) {
  let hash = 2166136261;
  for (const character of stableSerialize(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
}

function normalizationBounds(values: number[]) {
  const sorted = values.slice().sort((left, right) => left - right);
  if (sorted.length === 0) return { lower: null, upper: null, method: "unknown" as const };
  const minimum = sorted[0];
  const maximum = sorted.at(-1)!;
  if (Math.abs(maximum - minimum) <= 1e-9) return { lower: minimum, upper: maximum, method: "identical" as const };
  if (sorted.length < 4) return { lower: minimum, upper: maximum, method: "min-max" as const };
  const center = median(sorted);
  const deviations = sorted.map((value) => Math.abs(value - center)).sort((left, right) => left - right);
  const mad = median(deviations);
  if (mad <= 1e-9) return { lower: minimum, upper: maximum, method: "min-max" as const };
  const lower = Math.max(minimum, center - 3 * mad);
  const upper = Math.min(maximum, center + 3 * mad);
  return Math.abs(upper - lower) <= 1e-9
    ? { lower: minimum, upper: maximum, method: "min-max" as const }
    : { lower, upper, method: "median-mad-clipped" as const };
}

function emptyNormalizedScores(): NormalizedObjectiveScores {
  return Object.fromEntries(routeOptimizationObjectives.map((objective) => [objective, null])) as NormalizedObjectiveScores;
}

function zeroWeights(): RouteOptimizationWeights {
  return Object.fromEntries(routeOptimizationObjectives.map((objective) => [objective, 0])) as RouteOptimizationWeights;
}

export function normalizeRouteOptimizationWeights(weights: RouteOptimizationWeights) {
  const errors: string[] = [];
  const sanitized = zeroWeights();
  routeOptimizationObjectives.forEach((objective) => {
    const value = finiteOrNull(weights?.[objective]);
    if (value === null) {
      errors.push(`${routeOptimizationObjectiveLabels[objective]} besitzt kein gültiges Gewicht.`);
      return;
    }
    if (value < 0) {
      errors.push(`${routeOptimizationObjectiveLabels[objective]} darf kein negatives Gewicht besitzen.`);
      return;
    }
    sanitized[objective] = value;
  });
  const sum = routeOptimizationObjectives.reduce((total, objective) => total + sanitized[objective], 0);
  if (sum <= 0) errors.push("Die Summe aller Zielgewichte muss größer als null sein.");
  if (errors.length > 0) return { valid: false as const, errors, weights: sanitized, normalizedWeights: zeroWeights() };
  const normalizedWeights = Object.fromEntries(
    routeOptimizationObjectives.map((objective) => [objective, round(sanitized[objective] / sum, 9)])
  ) as RouteOptimizationWeights;
  const normalizedSum = routeOptimizationObjectives.reduce((total, objective) => total + normalizedWeights[objective], 0);
  const correctionTarget = routeOptimizationObjectives.find((objective) => normalizedWeights[objective] > 0)!;
  normalizedWeights[correctionTarget] = round(normalizedWeights[correctionTarget] + (1 - normalizedSum), 9);
  return { valid: true as const, errors: [], weights: sanitized, normalizedWeights };
}

function constraintViolation(
  candidate: RouteCandidate,
  constraint: keyof RouteOptimizationConstraints,
  code: Exclude<ConstraintViolationCode, "unknown_required_value">,
  actualValue: number | null,
  configuration: RouteOptimizationConstraint,
  predicate: (actual: number, limit: number) => boolean
): ConstraintViolation | null {
  if (!configuration.enabled) return null;
  if (actualValue === null) {
    return {
      code: "unknown_required_value",
      constraint,
      message: `${candidate.name}: ${routeOptimizationConstraintLabels[constraint]} kann wegen fehlender Daten nicht geprüft werden.`,
      actualValue: null,
      limitValue: configuration.value
    };
  }
  if (!predicate(actualValue, configuration.value)) return null;
  return {
    code,
    constraint,
    message: `${candidate.name}: ${routeOptimizationConstraintLabels[constraint]} verletzt (${round(actualValue, 2)} statt Grenzwert ${round(configuration.value, 2)}).`,
    actualValue: round(actualValue, 4),
    limitValue: configuration.value
  };
}

export function evaluateRouteOptimizationConstraints(candidate: RouteCandidate, constraints: RouteOptimizationConstraints) {
  return [
    constraintViolation(candidate, "minimumDestinationReservePercent", "minimum_destination_reserve", candidate.destinationBatteryPercent, constraints.minimumDestinationReservePercent, (actual, limit) => actual < limit),
    constraintViolation(candidate, "minimumAlongRouteReservePercent", "minimum_along_route_reserve", candidate.minimumReservePercent, constraints.minimumAlongRouteReservePercent, (actual, limit) => actual < limit),
    constraintViolation(candidate, "maximumChargingTimeMinutes", "maximum_charging_time", candidate.chargingTimeMinutes, constraints.maximumChargingTimeMinutes, (actual, limit) => actual > limit),
    constraintViolation(candidate, "maximumChargingStops", "maximum_charging_stops", candidate.chargingStops, constraints.maximumChargingStops, (actual, limit) => actual > limit),
    constraintViolation(candidate, "maximumUnknownSurfacePercent", "maximum_unknown_surface", candidate.unknownSurfacePercent, constraints.maximumUnknownSurfacePercent, (actual, limit) => actual > limit),
    constraintViolation(candidate, "maximumUnpavedPercent", "maximum_unpaved", candidate.unpavedPercent, constraints.maximumUnpavedPercent, (actual, limit) => actual > limit),
    constraintViolation(candidate, "maximumGradePercent", "maximum_grade", candidate.maximumGradePercent, constraints.maximumGradePercent, (actual, limit) => actual > limit),
    constraintViolation(candidate, "minimumDataQualityScore", "minimum_data_quality", candidate.dataQualityScore, constraints.minimumDataQualityScore, (actual, limit) => actual < limit)
  ].filter((violation): violation is ConstraintViolation => violation !== null);
}

function validateRouteOptimizationConstraints(constraints: RouteOptimizationConstraints) {
  const errors: string[] = [];
  const percentConstraints = new Set<keyof RouteOptimizationConstraints>([
    "minimumDestinationReservePercent",
    "minimumAlongRouteReservePercent",
    "maximumUnknownSurfacePercent",
    "maximumUnpavedPercent",
    "minimumDataQualityScore"
  ]);
  (Object.keys(DEFAULT_ROUTE_OPTIMIZATION_CONSTRAINTS) as Array<keyof RouteOptimizationConstraints>).forEach((key) => {
    const configuration = constraints?.[key];
    if (!configuration || typeof configuration.enabled !== "boolean" || !Number.isFinite(configuration.value)) {
      errors.push(`${routeOptimizationConstraintLabels[key]} besitzt keine gültige Konfiguration.`);
      return;
    }
    if (configuration.value < 0) errors.push(`${routeOptimizationConstraintLabels[key]} darf nicht negativ sein.`);
    if (percentConstraints.has(key) && configuration.value > 100) {
      errors.push(`${routeOptimizationConstraintLabels[key]} darf 100 Prozent nicht überschreiten.`);
    }
    if (key === "maximumChargingStops" && !Number.isInteger(configuration.value)) {
      errors.push(`${routeOptimizationConstraintLabels[key]} muss eine ganze Zahl sein.`);
    }
  });
  return errors;
}

function validateCandidate(candidate: RouteCandidate) {
  const errors: string[] = [];
  if (!candidate.id.trim()) errors.push("Ein Routenkandidat besitzt keine ID.");
  if (!candidate.name.trim()) errors.push(`${candidate.id || "Kandidat"} besitzt keinen Namen.`);
  if (candidate.geometry.type !== "LineString" || candidate.geometry.coordinates.length < 2) {
    errors.push(`${candidate.name || candidate.id}: Es fehlt eine reale Liniengeometrie.`);
  }
  if (!Number.isFinite(candidate.distanceKm) || candidate.distanceKm <= 0) {
    errors.push(`${candidate.name || candidate.id}: Die Gesamtdistanz ist ungültig.`);
  }
  if (!Number.isFinite(candidate.dataQualityScore) || candidate.dataQualityScore < 0 || candidate.dataQualityScore > 100) {
    errors.push(`${candidate.name || candidate.id}: Die Datenqualität liegt nicht zwischen 0 und 100.`);
  }
  return errors;
}

function buildNormalization(candidates: RouteCandidate[]) {
  const normalization = {} as RouteOptimizationResult["normalization"];
  const scores = new Map<string, NormalizedObjectiveScores>();
  candidates.forEach((candidate) => scores.set(candidate.id, emptyNormalizedScores()));
  routeOptimizationObjectives.forEach((objective) => {
    const values = candidates.map((candidate) => objectiveRawValue[objective](candidate)).filter((value): value is number => value !== null && Number.isFinite(value));
    const bounds = normalizationBounds(values);
    normalization[objective] = {
      direction: objectiveDirections[objective],
      lowerBound: bounds.lower === null ? null : round(bounds.lower, 6),
      upperBound: bounds.upper === null ? null : round(bounds.upper, 6),
      method: bounds.method,
      knownValues: values.length
    };
    candidates.forEach((candidate) => {
      const raw = objectiveRawValue[objective](candidate);
      if (raw === null || bounds.lower === null || bounds.upper === null) return;
      const score = Math.abs(bounds.upper - bounds.lower) <= 1e-9
        ? 1
        : objectiveDirections[objective] === "maximize"
          ? (clamp(raw, bounds.lower, bounds.upper) - bounds.lower) / (bounds.upper - bounds.lower)
          : (bounds.upper - clamp(raw, bounds.lower, bounds.upper)) / (bounds.upper - bounds.lower);
      scores.get(candidate.id)![objective] = round(clamp(score, 0, 1), 6);
    });
  });
  return { normalization, scores };
}

function relationBetween(
  left: RouteCandidateEvaluation,
  right: RouteCandidateEvaluation,
  activeObjectives: RouteOptimizationObjective[]
): ParetoRelation["relation"] {
  if (!left.admissible || !right.admissible) return "not_comparable";
  if (activeObjectives.some((objective) => left.normalizedScores[objective] === null || right.normalizedScores[objective] === null)) {
    return "not_comparable";
  }
  let leftBetter = false;
  let rightBetter = false;
  activeObjectives.forEach((objective) => {
    const leftValue = left.normalizedScores[objective]!;
    const rightValue = right.normalizedScores[objective]!;
    if (leftValue > rightValue + 1e-9) leftBetter = true;
    if (rightValue > leftValue + 1e-9) rightBetter = true;
  });
  if (!leftBetter && !rightBetter) return "equivalent";
  if (leftBetter && !rightBetter) return "dominates";
  if (rightBetter && !leftBetter) return "dominated_by";
  return "tradeoff";
}

function metricExplanation(objective: RouteOptimizationObjective, score: number, raw: number | null) {
  if (raw === null) return null;
  const label = routeOptimizationObjectiveLabels[objective];
  if (score >= 0.75) return `${label} ist im Vergleich vorteilhaft (${round(raw, 2)}).`;
  if (score <= 0.25) return `${label} ist im Vergleich nachteilig (${round(raw, 2)}).`;
  return null;
}

function sortEvaluations(evaluations: RouteCandidateEvaluation[], candidates: Map<string, RouteCandidate>) {
  const paretoRank: Record<RouteCandidateEvaluation["paretoStatus"], number> = { front: 0, not_comparable: 1, dominated: 2, excluded: 3 };
  return evaluations.slice().sort((left, right) => {
    if (left.admissible !== right.admissible) return left.admissible ? -1 : 1;
    if (left.recommended !== right.recommended) return left.recommended ? -1 : 1;
    if (paretoRank[left.paretoStatus] !== paretoRank[right.paretoStatus]) return paretoRank[left.paretoStatus] - paretoRank[right.paretoStatus];
    if (Math.abs(left.totalScore - right.totalScore) > 1e-9) return right.totalScore - left.totalScore;
    const leftCandidate = candidates.get(left.candidateId)!;
    const rightCandidate = candidates.get(right.candidateId)!;
    if (leftCandidate.dataQualityScore !== rightCandidate.dataQualityScore) return rightCandidate.dataQualityScore - leftCandidate.dataQualityScore;
    const leftReserve = leftCandidate.minimumReservePercent ?? Number.NEGATIVE_INFINITY;
    const rightReserve = rightCandidate.minimumReservePercent ?? Number.NEGATIVE_INFINITY;
    if (leftReserve !== rightReserve) return rightReserve - leftReserve;
    const leftTime = leftCandidate.travelTimeHours ?? Number.POSITIVE_INFINITY;
    const rightTime = rightCandidate.travelTimeHours ?? Number.POSITIVE_INFINITY;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return compareText(left.candidateId, right.candidateId);
  });
}

export function optimizeRouteCandidates(input: RouteOptimizationInput): RouteOptimizationResult {
  const sortedCandidates = input.candidates.slice().sort((left, right) => compareText(left.id, right.id));
  const weightResult = normalizeRouteOptimizationWeights(input.weights);
  const validationErrors = [
    ...weightResult.errors,
    ...validateRouteOptimizationConstraints(input.constraints),
    ...sortedCandidates.flatMap(validateCandidate)
  ];
  const ids = new Set<string>();
  sortedCandidates.forEach((candidate) => {
    if (ids.has(candidate.id)) validationErrors.push(`Die Kandidaten-ID ${candidate.id} ist nicht eindeutig.`);
    ids.add(candidate.id);
  });
  const inputFingerprint = fingerprint({
    modelVersion: ROUTE_OPTIMIZATION_MODEL_VERSION,
    paretoVersion: ROUTE_OPTIMIZATION_PARETO_VERSION,
    candidates: sortedCandidates.map((candidate) => ({ ...candidate, geometry: candidate.geometry.coordinates })),
    weights: weightResult.weights,
    constraints: input.constraints,
    presetId: input.presetId,
    manualCandidateId: input.manualCandidateId ?? null
  });
  const emptyNormalization = Object.fromEntries(routeOptimizationObjectives.map((objective) => [objective, {
    direction: objectiveDirections[objective], lowerBound: null, upperBound: null, method: "unknown", knownValues: 0
  }])) as RouteOptimizationResult["normalization"];
  const emptyRecommendation: RouteRecommendation = { candidateId: null, equivalentCandidateIds: [], technicalTieBreak: false, limited: false, reasons: [] };
  if (sortedCandidates.length === 0) {
    return { modelVersion: ROUTE_OPTIMIZATION_MODEL_VERSION, paretoModelVersion: ROUTE_OPTIMIZATION_PARETO_VERSION, inputFingerprint, status: "empty", validationErrors: [], normalizedWeights: weightResult.normalizedWeights, normalization: emptyNormalization, evaluations: [], paretoRelations: [], recommendation: emptyRecommendation };
  }
  if (validationErrors.length > 0) {
    return { modelVersion: ROUTE_OPTIMIZATION_MODEL_VERSION, paretoModelVersion: ROUTE_OPTIMIZATION_PARETO_VERSION, inputFingerprint, status: "invalid", validationErrors: Array.from(new Set(validationErrors)), normalizedWeights: weightResult.normalizedWeights, normalization: emptyNormalization, evaluations: [], paretoRelations: [], recommendation: emptyRecommendation };
  }

  const { normalization, scores } = buildNormalization(sortedCandidates);
  const candidateMap = new Map(sortedCandidates.map((candidate) => [candidate.id, candidate]));
  let evaluations: RouteCandidateEvaluation[] = sortedCandidates.map((candidate) => {
    const normalizedScores = scores.get(candidate.id)!;
    const violations = evaluateRouteOptimizationConstraints(candidate, input.constraints);
    const contributions = routeOptimizationObjectives.map((objective): WeightedObjectiveContribution => {
      const rawValue = objectiveRawValue[objective](candidate);
      const normalizedScore = normalizedScores[objective];
      const normalizedWeight = weightResult.normalizedWeights[objective];
      return {
        objective,
        rawValue,
        normalizedScore,
        normalizedWeight,
        contribution: normalizedScore === null ? 0 : round(normalizedScore * normalizedWeight, 6),
        known: normalizedScore !== null
      };
    });
    const objectiveCoverage = round(contributions.filter((entry) => entry.known).reduce((sum, entry) => sum + entry.normalizedWeight, 0), 6);
    const totalScore = round(contributions.reduce((sum, entry) => sum + entry.contribution, 0), 6);
    const explanations = contributions
      .filter((entry) => entry.normalizedWeight > 0 && entry.normalizedScore !== null)
      .map((entry) => metricExplanation(entry.objective, entry.normalizedScore!, entry.rawValue))
      .filter((value): value is string => Boolean(value));
    const advantages = explanations.filter((message) => message.includes("vorteilhaft")).slice(0, 3);
    const disadvantages = explanations.filter((message) => message.includes("nachteilig")).slice(0, 3);
    const uncertainties = [
      ...(objectiveCoverage < 0.999 ? [`Nur ${round(objectiveCoverage * 100, 1)} % der gewichteten Ziele besitzen vergleichbare Werte.`] : []),
      ...(candidate.dataQualityLevel === "low" || candidate.dataQualityLevel === "unknown"
        ? [`Die Streckendatenqualität ist ${candidate.dataQualityLevel === "low" ? "gering" : "unbekannt"} (${round(candidate.dataQualityScore, 1)}/100).`]
        : []),
      ...(candidate.unknownSurfacePercent !== null && candidate.unknownSurfacePercent > 0
        ? [`${round(candidate.unknownSurfacePercent, 1)} % der Oberflächen sind unbekannt.`]
        : []),
      ...candidate.warnings.slice(0, 3)
    ];
    return {
      candidateId: candidate.id,
      admissible: violations.length === 0,
      constraintViolations: violations,
      normalizedScores,
      contributions,
      totalScore,
      objectiveCoverage,
      paretoStatus: violations.length > 0 ? "excluded" : "not_comparable",
      dominatesCandidateIds: [],
      dominatedByCandidateIds: [],
      advantages,
      disadvantages,
      tradeoffs: [],
      uncertainties: Array.from(new Set(uncertainties)),
      recommendationReasons: [],
      recommended: false,
      recommendationLimited: false
    };
  });

  const activeObjectives = routeOptimizationObjectives.filter((objective) => weightResult.normalizedWeights[objective] > 0);
  const relations: ParetoRelation[] = [];
  for (let leftIndex = 0; leftIndex < evaluations.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < evaluations.length; rightIndex += 1) {
      const left = evaluations[leftIndex];
      const right = evaluations[rightIndex];
      const relation = relationBetween(left, right, activeObjectives);
      const inverse: ParetoRelation["relation"] = relation === "dominates" ? "dominated_by" : relation === "dominated_by" ? "dominates" : relation;
      relations.push({ candidateId: left.candidateId, relatedCandidateId: right.candidateId, relation });
      relations.push({ candidateId: right.candidateId, relatedCandidateId: left.candidateId, relation: inverse });
    }
  }
  evaluations = evaluations.map((evaluation) => {
    if (!evaluation.admissible) return evaluation;
    const candidateRelations = relations.filter((relation) => relation.candidateId === evaluation.candidateId);
    const hasMissingActiveObjective = activeObjectives.some((objective) => evaluation.normalizedScores[objective] === null);
    const dominatedByCandidateIds = candidateRelations.filter((relation) => relation.relation === "dominated_by").map((relation) => relation.relatedCandidateId).sort(compareText);
    const dominatesCandidateIds = candidateRelations.filter((relation) => relation.relation === "dominates").map((relation) => relation.relatedCandidateId).sort(compareText);
    const tradeoffIds = candidateRelations.filter((relation) => relation.relation === "tradeoff").map((relation) => relation.relatedCandidateId).sort(compareText);
    return {
      ...evaluation,
      paretoStatus: hasMissingActiveObjective ? "not_comparable" : dominatedByCandidateIds.length > 0 ? "dominated" : "front",
      dominatedByCandidateIds,
      dominatesCandidateIds,
      tradeoffs: tradeoffIds.length > 0 ? [`Zielkonflikt mit ${tradeoffIds.map((id) => candidateMap.get(id)?.name ?? id).join(", ")}.`] : []
    };
  });

  const preliminarilySorted = sortEvaluations(evaluations, candidateMap);
  const manualCandidate = input.manualCandidateId
    ? preliminarilySorted.find((evaluation) => evaluation.candidateId === input.manualCandidateId && evaluation.admissible)
    : null;
  const recommendationPool = preliminarilySorted.filter((evaluation) => evaluation.admissible && evaluation.paretoStatus === "front");
  const primary = manualCandidate ?? recommendationPool[0] ?? preliminarilySorted.find((evaluation) => evaluation.admissible) ?? null;
  let recommendation = emptyRecommendation;
  if (primary) {
    const equivalentCandidateIds = relations
      .filter((relation) => relation.candidateId === primary.candidateId && relation.relation === "equivalent")
      .map((relation) => relation.relatedCandidateId)
      .filter((id) => evaluations.find((evaluation) => evaluation.candidateId === id)?.admissible)
      .sort(compareText);
    const candidate = candidateMap.get(primary.candidateId)!;
    const limited = primary.objectiveCoverage < 0.999 || candidate.dataQualityLevel === "low" || candidate.dataQualityLevel === "unknown";
    recommendation = {
      candidateId: primary.candidateId,
      equivalentCandidateIds,
      technicalTieBreak: equivalentCandidateIds.length > 0,
      limited,
      reasons: [
        ...(manualCandidate ? ["Der Kandidat wurde manuell als Vergleichsfavorit gewählt; die fachlichen Scores bleiben unverändert."] : ["Höchster stabil sortierter Score innerhalb der verfügbaren Pareto-Front."]),
        ...(equivalentCandidateIds.length > 0 ? ["Fachlich gleichwertige Alternativen sind vorhanden; die ID-Reihenfolge dient nur als technischer Tie-Breaker."] : []),
        ...(limited ? ["Die Empfehlung ist wegen unvollständiger oder geringer Datenqualität eingeschränkt."] : []),
        ...primary.advantages.slice(0, 2)
      ]
    };
    evaluations = evaluations.map((evaluation) => evaluation.candidateId === primary.candidateId ? {
      ...evaluation,
      recommended: true,
      recommendationLimited: limited,
      recommendationReasons: recommendation.reasons
    } : {
      ...evaluation,
      recommendationReasons: evaluation.admissible
        ? evaluation.paretoStatus === "dominated"
          ? ["Mindestens eine andere Alternative ist in allen vollständig vergleichbaren Zielen gleich gut oder besser."]
          : ["Nicht primär empfohlen; Gewichtung, Datenqualität oder technischer Tie-Breaker führen zu einer anderen Reihenfolge."]
        : evaluation.constraintViolations.map((violation) => violation.message)
    });
  }
  evaluations = sortEvaluations(evaluations, candidateMap);
  const allExcluded = evaluations.every((evaluation) => !evaluation.admissible);
  return {
    modelVersion: ROUTE_OPTIMIZATION_MODEL_VERSION,
    paretoModelVersion: ROUTE_OPTIMIZATION_PARETO_VERSION,
    inputFingerprint,
    status: allExcluded ? "all_excluded" : "ok",
    validationErrors: [],
    normalizedWeights: weightResult.normalizedWeights,
    normalization,
    evaluations,
    paretoRelations: relations.sort((left, right) => compareText(left.candidateId, right.candidateId) || compareText(left.relatedCandidateId, right.relatedCandidateId)),
    recommendation: allExcluded ? { ...emptyRecommendation, reasons: ["Alle Kandidaten verletzen mindestens eine aktive harte Grenze."] } : recommendation
  };
}

function normalizeConstraint(value: unknown, fallback: RouteOptimizationConstraint) {
  if (!value || typeof value !== "object") return { ...fallback };
  const record = value as Record<string, unknown>;
  const numericValue = finiteOrNull(record.value);
  return { enabled: record.enabled === true, value: numericValue === null ? fallback.value : numericValue };
}

function normalizeConstraints(value: unknown): RouteOptimizationConstraints {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(
    (Object.keys(DEFAULT_ROUTE_OPTIMIZATION_CONSTRAINTS) as Array<keyof RouteOptimizationConstraints>).map((key) => [
      key,
      normalizeConstraint(record[key], DEFAULT_ROUTE_OPTIMIZATION_CONSTRAINTS[key])
    ])
  ) as RouteOptimizationConstraints;
}

function normalizeWeightsForState(value: unknown, fallback: RouteOptimizationWeights) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(routeOptimizationObjectives.map((objective) => [
    objective,
    finiteOrNull(record[objective]) ?? fallback[objective]
  ])) as RouteOptimizationWeights;
}

function normalizeCandidateReference(value: unknown): RouteOptimizationCandidateReference | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const source = record.source as RouteCandidateSource | undefined;
  if (typeof record.id !== "string" || typeof record.name !== "string" || typeof record.geometryFingerprint !== "string" || !source || typeof source !== "object") return null;
  if (!["brouter", "gpx", "saved", "manual"].includes(String(source.kind))) return null;
  return {
    id: record.id,
    name: record.name,
    geometryFingerprint: record.geometryFingerprint,
    source: {
      kind: source.kind,
      label: typeof source.label === "string" ? source.label : "Gespeicherte Route",
      detail: typeof source.detail === "string" ? source.detail : "Vorhandene, unveränderte Geometrie",
      ...(source.routingProvider === "brouter" || source.routingProvider === "mock" ? { routingProvider: source.routingProvider } : {}),
      ...(typeof source.routingProfile === "string" ? { routingProfile: source.routingProfile } : {}),
      existingCandidateOfflineAvailable: true,
      newCandidateGeneration: ["local_router", "external_router", "not_available", "unknown"].includes(String(source.newCandidateGeneration))
        ? source.newCandidateGeneration
        : "unknown"
    }
  };
}

export const DEFAULT_ROUTE_OPTIMIZATION_STATE: RouteOptimizationStoredState = {
  schemaVersion: ROUTE_OPTIMIZATION_STATE_VERSION,
  modelVersion: ROUTE_OPTIMIZATION_MODEL_VERSION,
  paretoModelVersion: ROUTE_OPTIMIZATION_PARETO_VERSION,
  presetVersion: ROUTE_OPTIMIZATION_PRESET_VERSION,
  presetId: "balanced",
  weights: { ...balancedWeights },
  normalizedWeights: normalizeRouteOptimizationWeights(balancedWeights).normalizedWeights,
  constraints: normalizeConstraints(DEFAULT_ROUTE_OPTIMIZATION_CONSTRAINTS),
  selectedCandidates: [],
  manualCandidateId: null,
  hiddenCandidateIds: [],
  displayMode: "overview",
  lastInputFingerprint: null,
  recommendedCandidateId: null
};

export function normalizeRouteOptimizationStoredState(value: unknown): RouteOptimizationStoredState {
  if (!value || typeof value !== "object") return structuredClone(DEFAULT_ROUTE_OPTIMIZATION_STATE);
  const record = value as Record<string, unknown>;
  const presetId = ["balanced", "fast", "energy_saving", "comfort", "asphalt", "high_reserve", "custom"].includes(String(record.presetId))
    ? record.presetId as RouteOptimizationPresetId
    : "balanced";
  const presetWeights = presetId === "custom" ? balancedWeights : routeOptimizationPresets[presetId].weights;
  const weights = normalizeWeightsForState(record.weights, presetWeights);
  const normalized = normalizeRouteOptimizationWeights(weights);
  const selectedCandidates = Array.isArray(record.selectedCandidates)
    ? record.selectedCandidates.map(normalizeCandidateReference).filter((reference): reference is RouteOptimizationCandidateReference => reference !== null).sort((left, right) => compareText(left.id, right.id))
    : [];
  return {
    schemaVersion: ROUTE_OPTIMIZATION_STATE_VERSION,
    modelVersion: ROUTE_OPTIMIZATION_MODEL_VERSION,
    paretoModelVersion: ROUTE_OPTIMIZATION_PARETO_VERSION,
    presetVersion: ROUTE_OPTIMIZATION_PRESET_VERSION,
    presetId,
    weights,
    normalizedWeights: normalized.valid ? normalized.normalizedWeights : normalizeRouteOptimizationWeights(presetWeights).normalizedWeights,
    constraints: normalizeConstraints(record.constraints),
    selectedCandidates,
    manualCandidateId: typeof record.manualCandidateId === "string" ? record.manualCandidateId : null,
    hiddenCandidateIds: Array.isArray(record.hiddenCandidateIds) ? Array.from(new Set(record.hiddenCandidateIds.filter((id): id is string => typeof id === "string"))).sort(compareText) : [],
    displayMode: record.displayMode === "comparison" ? "comparison" : "overview",
    lastInputFingerprint: typeof record.lastInputFingerprint === "string" ? record.lastInputFingerprint : null,
    recommendedCandidateId: typeof record.recommendedCandidateId === "string" ? record.recommendedCandidateId : null
  };
}

export function routeOptimizationStateSnapshot(
  current: RouteOptimizationStoredState,
  candidates: RouteCandidate[],
  result: RouteOptimizationResult
): RouteOptimizationStoredState {
  const normalized = normalizeRouteOptimizationStoredState(current);
  return {
    ...normalized,
    normalizedWeights: result.normalizedWeights,
    selectedCandidates: candidates
      .map((candidate) => ({ id: candidate.id, name: candidate.name, source: candidate.source, geometryFingerprint: candidate.geometryFingerprint }))
      .sort((left, right) => compareText(left.id, right.id)),
    lastInputFingerprint: result.inputFingerprint,
    recommendedCandidateId: result.recommendation.candidateId
  };
}

export function serializeRouteOptimizationStoredState(state: RouteOptimizationStoredState) {
  return stableSerialize(normalizeRouteOptimizationStoredState(state));
}

export const routeOptimizationStableSortTieBreakers = [...stableSortTieBreakers];
