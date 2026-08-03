import {
  pointAtDistance,
  routeDistanceKm,
  sliceLineString,
  type ElevationPoint,
  type LineStringGeoJson,
  type Position
} from "@/lib/geo";

export const ROUTE_CONDITION_MODEL_VERSION = "biketriphub-route-condition-v1";
export const ROUTE_CONDITION_STATE_VERSION = 1;

export const elevationSmoothingParameters = {
  method: "centered-median-3",
  radiusPoints: 1,
  maximumNeighbourDistanceKm: 1,
  smoothingChangeThresholdM: 8,
  implausibleGradePercent: 35,
  minimumImplausibleJumpM: 25,
  minimumReliableSegmentKm: 0.05
} as const;

export const slopeClassThresholds = {
  strongDescentMaximumPercent: -8,
  lightDescentMaximumPercent: -1,
  nearlyFlatMaximumPercent: 1,
  lightClimbMaximumPercent: 4,
  mediumClimbMaximumPercent: 7,
  strongClimbMaximumPercent: 12
} as const;

export type ElevationSlopeClass =
  | "strong_descent"
  | "light_descent"
  | "nearly_flat"
  | "light_climb"
  | "medium_climb"
  | "strong_climb"
  | "very_strong_climb";

export const elevationSlopeClassLabels: Record<ElevationSlopeClass, string> = {
  strong_descent: "Gefälle stark",
  light_descent: "Gefälle leicht",
  nearly_flat: "Nahezu eben",
  light_climb: "Leichte Steigung",
  medium_climb: "Mittlere Steigung",
  strong_climb: "Starke Steigung",
  very_strong_climb: "Sehr starke Steigung"
};

export type SurfaceClassification =
  | "asphalt"
  | "concrete"
  | "paving_stones"
  | "compacted"
  | "fine_gravel"
  | "coarse_gravel"
  | "unpaved"
  | "forest"
  | "earth"
  | "unknown";

export const surfaceClassificationLabels: Record<SurfaceClassification, string> = {
  asphalt: "Asphalt",
  concrete: "Beton",
  paving_stones: "Pflaster",
  compacted: "Befestigter Weg",
  fine_gravel: "Feiner Schotter",
  coarse_gravel: "Grober Schotter",
  unpaved: "Unbefestigter Weg",
  forest: "Waldweg",
  earth: "Erdweg",
  unknown: "Unbekannt"
};

export type RouteWayClassification =
  | "road"
  | "cycleway"
  | "shared_cycle_footway"
  | "service"
  | "track"
  | "forest"
  | "path"
  | "unknown";

export const routeWayClassificationLabels: Record<RouteWayClassification, string> = {
  road: "Straße",
  cycleway: "Radweg",
  shared_cycle_footway: "Gemeinsamer Geh- und Radweg",
  service: "Wirtschaftsweg",
  track: "Feldweg",
  forest: "Waldweg",
  path: "Pfad",
  unknown: "Unbekannt"
};

export type RouteDataQualityLevel = "high" | "medium" | "low" | "unknown";

export const routeDataQualityLabels: Record<RouteDataQualityLevel, string> = {
  high: "hoch",
  medium: "mittel",
  low: "gering",
  unknown: "unbekannt"
};

export type RouteConditionWarningSeverity = "info" | "warning" | "critical";
export type RouteConditionWarningCode =
  | "elevation_missing"
  | "elevation_incomplete"
  | "implausible_elevation_jump"
  | "noisy_elevation_profile"
  | "segment_too_short"
  | "surface_unknown"
  | "way_type_unknown"
  | "possibly_unsuitable"
  | "pushing_or_steps"
  | "low_quality"
  | "interpolated_data";

export type RouteConditionWarning = {
  code: RouteConditionWarningCode;
  severity: RouteConditionWarningSeverity;
  message: string;
  segmentId?: string;
  routeKm?: number;
};

export type RouteConditionDataSource = "gpx" | "brouter" | "provider" | "estimated" | "manual" | "stored" | "unknown";

export type RouteConditionSourceSegment = {
  id: string;
  startKm: number;
  endKm: number;
  surface?: string | null;
  wayType?: string | null;
  tags?: Record<string, string>;
  dataSource: RouteConditionDataSource;
};

export type RouteDataQuality = {
  level: RouteDataQualityLevel;
  score: number;
  reasonCodes: string[];
  reasons: string[];
  metrics: {
    elevationCoveragePercent: number;
    elevationPointDensityPerKm: number;
    knownSurfacePercent: number;
    knownWayTypePercent: number;
    interpolationRequired: boolean;
    smoothingApplied: boolean;
  };
};

export type RouteResistanceFactors = {
  surfaceFactor: number;
  comfortFactor: number;
  speedFactor: number;
  energyDemandFactor: number;
  safetyStatus: "safe" | "caution" | "critical" | "unknown";
  rationale: string;
};

export type ElevationSegmentAnalysis = {
  id: string;
  startKm: number;
  endKm: number;
  lengthKm: number;
  startCoordinate: Position;
  endCoordinate: Position;
  startElevationM: number | null;
  endElevationM: number | null;
  elevationDifferenceM: number | null;
  positiveElevationM: number;
  negativeElevationM: number;
  averageGradePercent: number | null;
  maximumComputableGradePercent: number | null;
  slopeClass: ElevationSlopeClass | null;
  surface: SurfaceClassification;
  wayType: RouteWayClassification;
  resistance: RouteResistanceFactors;
  dataSource: RouteConditionDataSource;
  quality: RouteDataQuality;
  warnings: RouteConditionWarning[];
  rawTags: Record<string, string>;
};

export type RouteConditionDistribution<T extends string> = {
  classification: T;
  distanceKm: number;
  percent: number;
};

export type RouteConditionAnalysis = {
  modelVersion: typeof ROUTE_CONDITION_MODEL_VERSION;
  inputFingerprint: string;
  totalDistanceKm: number;
  rawElevationPoints: ElevationPoint[];
  smoothedElevationPoints: ElevationPoint[];
  elevationSource: RouteConditionDataSource;
  elevationUpM: number;
  elevationDownM: number;
  maximumGradePercent: number | null;
  segments: ElevationSegmentAnalysis[];
  surfaceDistribution: RouteConditionDistribution<SurfaceClassification>[];
  wayTypeDistribution: RouteConditionDistribution<RouteWayClassification>[];
  pavedPercent: number;
  unpavedPercent: number;
  unknownSurfacePercent: number;
  quality: RouteDataQuality;
  warnings: RouteConditionWarning[];
  smoothing: typeof elevationSmoothingParameters;
  existingCalculationsChanged: false;
};

export type AnalyzeRouteConditionInput = {
  geometry: LineStringGeoJson;
  elevationPoints?: ElevationPoint[];
  elevationSource?: RouteConditionDataSource;
  sourceSegments?: RouteConditionSourceSegment[];
};

export type RouteConditionStoredState = {
  schemaVersion: typeof ROUTE_CONDITION_STATE_VERSION;
  modelVersion: typeof ROUTE_CONDITION_MODEL_VERSION;
  sourceSegments: RouteConditionSourceSegment[];
  lastCalculation?: RouteConditionAnalysis;
};

export const surfaceResistanceFactors: Record<SurfaceClassification, RouteResistanceFactors> = {
  asphalt: factors(1, 1, 1, 1, "safe", "Glatte, befestigte Oberfläche mit niedrigem Rollwiderstand."),
  concrete: factors(1.02, 0.95, 0.98, 1.01, "safe", "Feste Oberfläche mit geringfügig höherem Komfortverlust."),
  paving_stones: factors(1.12, 0.72, 0.84, 1.1, "caution", "Pflaster erhöht Vibrationen und Rollwiderstand."),
  compacted: factors(1.08, 0.82, 0.9, 1.06, "safe", "Befestigter Weg mit moderatem Zusatzwiderstand."),
  fine_gravel: factors(1.13, 0.7, 0.82, 1.11, "caution", "Feiner Schotter reduziert Tempo und Komfort."),
  coarse_gravel: factors(1.28, 0.48, 0.66, 1.23, "caution", "Grober Schotter erfordert deutlich mehr Energie und Fahrkontrolle."),
  unpaved: factors(1.3, 0.45, 0.64, 1.25, "caution", "Unbefestigte Wege können ungleichmäßig und langsamer sein."),
  forest: factors(1.34, 0.42, 0.6, 1.28, "caution", "Waldwege können Wurzeln, weiche Stellen und wechselnden Untergrund enthalten."),
  earth: factors(1.38, 0.38, 0.56, 1.32, "caution", "Erdwege haben einen hohen, witterungsabhängigen Rollwiderstand."),
  unknown: factors(1, 1, 1, 1, "unknown", "Zur Oberfläche liegen keine belegbaren Daten vor; es wird kein Faktor behauptet.")
};

function factors(
  surfaceFactor: number,
  comfortFactor: number,
  speedFactor: number,
  energyDemandFactor: number,
  safetyStatus: RouteResistanceFactors["safetyStatus"],
  rationale: string
): RouteResistanceFactors {
  return { surfaceFactor, comfortFactor, speedFactor, energyDemandFactor, safetyStatus, rationale };
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function bounded(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeElevationPoints(points: ElevationPoint[], totalDistanceKm: number) {
  const sorted = points
    .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.elevationM))
    .map((point) => ({
      distanceKm: round(bounded(Number(point.distanceKm), 0, totalDistanceKm), 4),
      elevationM: round(Number(point.elevationM), 2)
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm || left.elevationM - right.elevationM);

  return sorted.filter((point, index) => index === 0 || point.distanceKm > sorted[index - 1].distanceKm);
}

export function smoothElevationProfile(points: ElevationPoint[]) {
  if (points.length < 3) return points.map((point) => ({ ...point }));

  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return { ...point };
    const previous = points[index - 1];
    const next = points[index + 1];
    if (
      point.distanceKm - previous.distanceKm > elevationSmoothingParameters.maximumNeighbourDistanceKm ||
      next.distanceKm - point.distanceKm > elevationSmoothingParameters.maximumNeighbourDistanceKm
    ) {
      return { ...point };
    }
    const elevations = [previous.elevationM, point.elevationM, next.elevationM].sort((left, right) => left - right);
    return { ...point, elevationM: round(elevations[1], 2) };
  });
}

function elevationAt(points: ElevationPoint[], distanceKm: number) {
  if (points.length < 2 || distanceKm < points[0].distanceKm || distanceKm > points[points.length - 1].distanceKm) return null;
  if (distanceKm === points[0].distanceKm) return points[0].elevationM;
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    if (current.distanceKm < distanceKm) continue;
    const previous = points[index - 1];
    const distance = current.distanceKm - previous.distanceKm;
    const ratio = distance > 0 ? (distanceKm - previous.distanceKm) / distance : 0;
    return round(previous.elevationM + (current.elevationM - previous.elevationM) * ratio, 2);
  }
  return points.at(-1)?.elevationM ?? null;
}

export function classifySlope(gradePercent: number): ElevationSlopeClass {
  if (gradePercent <= slopeClassThresholds.strongDescentMaximumPercent) return "strong_descent";
  if (gradePercent <= slopeClassThresholds.lightDescentMaximumPercent) return "light_descent";
  if (gradePercent < slopeClassThresholds.nearlyFlatMaximumPercent) return "nearly_flat";
  if (gradePercent < slopeClassThresholds.lightClimbMaximumPercent) return "light_climb";
  if (gradePercent < slopeClassThresholds.mediumClimbMaximumPercent) return "medium_climb";
  if (gradePercent < slopeClassThresholds.strongClimbMaximumPercent) return "strong_climb";
  return "very_strong_climb";
}

function normalizedTagValue(value?: string | null) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function classifySurface(value?: string | null, tags: Record<string, string> = {}): SurfaceClassification {
  const surface = normalizedTagValue(value || tags.surface);
  if (["asphalt", "chipseal"].includes(surface)) return "asphalt";
  if (["concrete", "concrete:plates", "concrete:lanes"].includes(surface)) return "concrete";
  if (["paving_stones", "sett", "cobblestone", "unhewn_cobblestone"].includes(surface)) return "paving_stones";
  if (["compacted", "paved"].includes(surface)) return "compacted";
  if (["fine_gravel", "pebblestone"].includes(surface)) return "fine_gravel";
  if (["gravel", "rock", "stone"].includes(surface)) return "coarse_gravel";
  if (["unpaved"].includes(surface)) return "unpaved";
  if (["wood", "woodchips"].includes(surface)) return "forest";
  if (["ground", "earth", "dirt", "mud", "sand", "grass"].includes(surface)) return "earth";
  return "unknown";
}

export function classifyWayType(value?: string | null, tags: Record<string, string> = {}): RouteWayClassification {
  const highway = normalizedTagValue(value || tags.highway);
  const bicycle = normalizedTagValue(tags.bicycle);
  const foot = normalizedTagValue(tags.foot);
  if (highway === "cycleway") return "cycleway";
  if (["footway", "pedestrian"].includes(highway) && ["yes", "designated", "permissive"].includes(bicycle)) {
    return "shared_cycle_footway";
  }
  if (highway === "path" && ["yes", "designated", "permissive"].includes(bicycle) && ["yes", "designated"].includes(foot)) {
    return "shared_cycle_footway";
  }
  if (highway === "service") return "service";
  if (highway === "track") return tags.landuse === "forest" || tags.wood === "yes" ? "forest" : "track";
  if (["path", "footway", "bridleway", "steps"].includes(highway)) return "path";
  if (["motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "road"].includes(highway)) {
    return "road";
  }
  return "unknown";
}

function sourceSegmentAt(sourceSegments: RouteConditionSourceSegment[], startKm: number, endKm: number) {
  const candidates = sourceSegments
    .map((segment) => ({ segment, overlap: Math.max(0, Math.min(endKm, segment.endKm) - Math.max(startKm, segment.startKm)) }))
    .filter((candidate) => candidate.overlap > 0)
    .sort((left, right) => right.overlap - left.overlap || left.segment.id.localeCompare(right.segment.id));
  return candidates[0]?.segment;
}

function sourceQualityScore(source: RouteConditionDataSource) {
  if (source === "gpx" || source === "brouter" || source === "provider") return 90;
  if (source === "manual") return 75;
  if (source === "stored") return 65;
  if (source === "estimated") return 40;
  return 15;
}

function qualityLevel(score: number): RouteDataQualityLevel {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  if (score >= 30) return "low";
  return "unknown";
}

function buildQuality(args: {
  score: number;
  elevationCoveragePercent: number;
  pointDensity: number;
  knownSurfacePercent: number;
  knownWayTypePercent: number;
  interpolationRequired: boolean;
  smoothingApplied: boolean;
  reasonCodes: string[];
  reasons: string[];
}): RouteDataQuality {
  const score = round(bounded(args.score, 0, 100), 1);
  return {
    level: qualityLevel(score),
    score,
    reasonCodes: Array.from(new Set(args.reasonCodes)).sort(),
    reasons: Array.from(new Set(args.reasons)),
    metrics: {
      elevationCoveragePercent: round(args.elevationCoveragePercent, 1),
      elevationPointDensityPerKm: round(args.pointDensity, 2),
      knownSurfacePercent: round(args.knownSurfacePercent, 1),
      knownWayTypePercent: round(args.knownWayTypePercent, 1),
      interpolationRequired: args.interpolationRequired,
      smoothingApplied: args.smoothingApplied
    }
  };
}

function segmentWarnings(
  id: string,
  startKm: number,
  lengthKm: number,
  gradePercent: number | null,
  elevationDifferenceM: number | null,
  surface: SurfaceClassification,
  wayType: RouteWayClassification,
  tags: Record<string, string>
) {
  const warnings: RouteConditionWarning[] = [];
  if (lengthKm < elevationSmoothingParameters.minimumReliableSegmentKm) {
    warnings.push(warning("segment_too_short", "info", "Der Abschnitt ist für eine belastbare Steigungsberechnung sehr kurz.", id, startKm));
  }
  if (
    gradePercent !== null &&
    elevationDifferenceM !== null &&
    Math.abs(gradePercent) > elevationSmoothingParameters.implausibleGradePercent &&
    Math.abs(elevationDifferenceM) >= elevationSmoothingParameters.minimumImplausibleJumpM
  ) {
    warnings.push(warning("implausible_elevation_jump", "critical", "Der Höhenunterschied ist für die Abschnittslänge unplausibel groß.", id, startKm));
  }
  if (surface === "unknown") warnings.push(warning("surface_unknown", "info", "Die Oberfläche dieses Abschnitts ist unbekannt.", id, startKm));
  if (wayType === "unknown") warnings.push(warning("way_type_unknown", "info", "Der Wegtyp dieses Abschnitts ist unbekannt.", id, startKm));
  if (tags.highway === "steps" || normalizedTagValue(tags.bicycle) === "dismount") {
    warnings.push(warning("pushing_or_steps", "critical", "Treppen oder eine Schiebestrecke wurden in den belegten Routendaten erkannt.", id, startKm));
  }
  if (["coarse_gravel", "unpaved", "forest", "earth"].includes(surface) || tags.access === "no") {
    warnings.push(warning("possibly_unsuitable", "warning", "Der Abschnitt kann für das gewählte Fahrrad oder bei Nässe ungeeignet sein.", id, startKm));
  }
  return warnings;
}

function warning(
  code: RouteConditionWarningCode,
  severity: RouteConditionWarningSeverity,
  message: string,
  segmentId?: string,
  routeKm?: number
): RouteConditionWarning {
  return { code, severity, message, ...(segmentId ? { segmentId } : {}), ...(routeKm !== undefined ? { routeKm: round(routeKm, 3) } : {}) };
}

function stableWarnings(warnings: RouteConditionWarning[]) {
  const severityOrder: Record<RouteConditionWarningSeverity, number> = { critical: 0, warning: 1, info: 2 };
  const firstByCode = new Map<RouteConditionWarningCode, RouteConditionWarning>();
  warnings.forEach((item) => {
    if (!firstByCode.has(item.code)) firstByCode.set(item.code, item);
  });
  return Array.from(firstByCode.values()).sort(
    (left, right) =>
      (left.routeKm ?? -1) - (right.routeKm ?? -1) ||
      severityOrder[left.severity] - severityOrder[right.severity] ||
      left.code.localeCompare(right.code)
  );
}

function distribution<T extends string>(segments: ElevationSegmentAnalysis[], pick: (segment: ElevationSegmentAnalysis) => T) {
  const totalDistanceKm = segments.reduce((sum, segment) => sum + segment.lengthKm, 0);
  const values = new Map<T, number>();
  segments.forEach((segment) => values.set(pick(segment), (values.get(pick(segment)) ?? 0) + segment.lengthKm));
  return Array.from(values.entries())
    .map(([classification, distanceKm]) => ({
      classification,
      distanceKm: round(distanceKm, 3),
      percent: round((distanceKm / Math.max(totalDistanceKm, 0.0001)) * 100, 1)
    }))
    .sort((left, right) => right.distanceKm - left.distanceKm || left.classification.localeCompare(right.classification));
}

function stableFingerprint(value: unknown) {
  const serialize = (candidate: unknown): string => {
    if (Array.isArray(candidate)) return `[${candidate.map(serialize).join(",")}]`;
    if (candidate && typeof candidate === "object") {
      return `{${Object.entries(candidate as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => `${JSON.stringify(key)}:${serialize(nested)}`)
        .join(",")}}`;
    }
    return JSON.stringify(candidate) ?? "null";
  };
  let hash = 0x811c9dc5;
  for (const character of serialize(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function profileNoiseCount(raw: ElevationPoint[], smoothed: ElevationPoint[]) {
  return raw.filter(
    (point, index) =>
      Math.abs(point.elevationM - (smoothed[index]?.elevationM ?? point.elevationM)) >=
      elevationSmoothingParameters.smoothingChangeThresholdM
  ).length;
}

function maximumGradeBetween(points: ElevationPoint[], startKm: number, endKm: number) {
  const relevant = [
    ...(elevationAt(points, startKm) !== null ? [{ distanceKm: startKm, elevationM: elevationAt(points, startKm)! }] : []),
    ...points.filter((point) => point.distanceKm > startKm && point.distanceKm < endKm),
    ...(elevationAt(points, endKm) !== null ? [{ distanceKm: endKm, elevationM: elevationAt(points, endKm)! }] : [])
  ];
  if (relevant.length < 2) return null;
  return relevant.slice(1).reduce((maximum, point, index) => {
    const previous = relevant[index];
    const distanceKm = point.distanceKm - previous.distanceKm;
    if (distanceKm <= 0) return maximum;
    const grade = ((point.elevationM - previous.elevationM) / (distanceKm * 1000)) * 100;
    return Math.max(maximum, Math.abs(grade));
  }, 0);
}

export function analyzeRouteCondition(input: AnalyzeRouteConditionInput): RouteConditionAnalysis {
  const totalDistanceKm = routeDistanceKm(input.geometry.coordinates);
  const rawElevationPoints = normalizeElevationPoints(input.elevationPoints ?? [], totalDistanceKm);
  const smoothedElevationPoints = smoothElevationProfile(rawElevationPoints);
  const sourceSegments = normalizeRouteConditionSourceSegments(input.sourceSegments, totalDistanceKm);
  const elevationSource = input.elevationSource ?? "unknown";
  const elevationStartKm = rawElevationPoints[0]?.distanceKm ?? 0;
  const elevationEndKm = rawElevationPoints.at(-1)?.distanceKm ?? 0;
  const elevationCoverageKm = rawElevationPoints.length >= 2 ? Math.max(0, elevationEndKm - elevationStartKm) : 0;
  const elevationCoveragePercent = totalDistanceKm > 0 ? bounded((elevationCoverageKm / totalDistanceKm) * 100, 0, 100) : 0;
  const interpolationRequired = rawElevationPoints.length >= 2 && elevationCoveragePercent < 99;
  const noiseCount = profileNoiseCount(rawElevationPoints, smoothedElevationPoints);
  const smoothingApplied = noiseCount > 0;
  const breakpoints = Array.from(
    new Set([
      0,
      totalDistanceKm,
      ...smoothedElevationPoints.map((point) => point.distanceKm),
      ...sourceSegments.flatMap((segment) => [segment.startKm, segment.endKm])
    ].map((value) => round(bounded(value, 0, totalDistanceKm), 4)))
  ).sort((left, right) => left - right);

  const segments = breakpoints.slice(0, -1).flatMap((startKm, index): ElevationSegmentAnalysis[] => {
    const endKm = breakpoints[index + 1];
    const lengthKm = endKm - startKm;
    if (lengthKm <= 0) return [];
    const source = sourceSegmentAt(sourceSegments, startKm, endKm);
    const tags = { ...(source?.tags ?? {}) };
    const surface = classifySurface(source?.surface, tags);
    const wayType = classifyWayType(source?.wayType, tags);
    const startElevationM = elevationAt(smoothedElevationPoints, startKm);
    const endElevationM = elevationAt(smoothedElevationPoints, endKm);
    const elevationDifferenceM = startElevationM !== null && endElevationM !== null ? round(endElevationM - startElevationM, 1) : null;
    const averageGradePercent = elevationDifferenceM !== null ? round((elevationDifferenceM / (lengthKm * 1000)) * 100, 2) : null;
    const maximumComputableGradePercent = maximumGradeBetween(smoothedElevationPoints, startKm, endKm);
    const id = `condition-${String(index + 1).padStart(4, "0")}`;
    const warnings = segmentWarnings(id, startKm, lengthKm, averageGradePercent, elevationDifferenceM, surface, wayType, tags);
    const elevationKnown = startElevationM !== null && endElevationM !== null;
    const surfaceKnown = surface !== "unknown";
    const wayKnown = wayType !== "unknown";
    const score = sourceQualityScore(source?.dataSource ?? elevationSource) * 0.25 + (elevationKnown ? 45 : 0) + (surfaceKnown ? 20 : 0) + (wayKnown ? 10 : 0);
    const quality = buildQuality({
      score: warnings.some((item) => item.code === "implausible_elevation_jump") ? score - 30 : score,
      elevationCoveragePercent: elevationKnown ? 100 : 0,
      pointDensity: rawElevationPoints.length / Math.max(totalDistanceKm, 0.001),
      knownSurfacePercent: surfaceKnown ? 100 : 0,
      knownWayTypePercent: wayKnown ? 100 : 0,
      interpolationRequired,
      smoothingApplied,
      reasonCodes: [
        elevationKnown ? "elevation_available" : "elevation_missing",
        surfaceKnown ? "surface_available" : "surface_missing",
        wayKnown ? "way_type_available" : "way_type_missing"
      ],
      reasons: [
        elevationKnown ? "Für den Abschnitt sind auswertbare Höhenwerte vorhanden." : "Für den Abschnitt fehlen auswertbare Höhenwerte.",
        surfaceKnown ? "Die Oberfläche ist aus der Datenquelle ableitbar." : "Die Oberfläche ist nicht belegt.",
        wayKnown ? "Der Wegtyp ist aus der Datenquelle ableitbar." : "Der Wegtyp ist nicht belegt."
      ]
    });
    return [{
      id,
      startKm: round(startKm, 3),
      endKm: round(endKm, 3),
      lengthKm: round(lengthKm, 3),
      startCoordinate: pointAtDistance(input.geometry.coordinates, startKm),
      endCoordinate: pointAtDistance(input.geometry.coordinates, endKm),
      startElevationM,
      endElevationM,
      elevationDifferenceM,
      positiveElevationM: round(Math.max(0, elevationDifferenceM ?? 0), 1),
      negativeElevationM: round(Math.max(0, -(elevationDifferenceM ?? 0)), 1),
      averageGradePercent,
      maximumComputableGradePercent: maximumComputableGradePercent === null ? null : round(maximumComputableGradePercent, 2),
      slopeClass: averageGradePercent === null ? null : classifySlope(averageGradePercent),
      surface,
      wayType,
      resistance: {
        ...surfaceResistanceFactors[surface],
        ...(tags.highway === "steps" || normalizedTagValue(tags.bicycle) === "dismount"
          ? { safetyStatus: "critical" as const, rationale: "Treppen oder eine Schiebestrecke sind in den Quelldaten belegt." }
          : {})
      },
      dataSource: source?.dataSource ?? elevationSource,
      quality,
      warnings,
      rawTags: tags
    }];
  });

  const surfaceDistribution = distribution(segments, (segment) => segment.surface);
  const wayTypeDistribution = distribution(segments, (segment) => segment.wayType);
  const percentForSurfaces = (values: SurfaceClassification[]) => round(
    surfaceDistribution.filter((item) => values.includes(item.classification)).reduce((sum, item) => sum + item.percent, 0),
    1
  );
  const knownSurfacePercent = round(100 - (surfaceDistribution.find((item) => item.classification === "unknown")?.percent ?? 100), 1);
  const knownWayTypePercent = round(100 - (wayTypeDistribution.find((item) => item.classification === "unknown")?.percent ?? 100), 1);
  const pointDensity = rawElevationPoints.length / Math.max(totalDistanceKm, 0.001);
  const plausibilityPenalty = segments.filter((segment) => segment.warnings.some((item) => item.code === "implausible_elevation_jump")).length * 12;
  const elevationScore = rawElevationPoints.length < 2
    ? 0
    : sourceQualityScore(elevationSource) * 0.45 + elevationCoveragePercent * 0.4 + Math.min(15, pointDensity * 5) - plausibilityPenalty;
  const routeQualityScore = elevationScore * 0.65 + knownSurfacePercent * 0.22 + knownWayTypePercent * 0.13;
  const reasons = [
    rawElevationPoints.length >= 2
      ? `${round(elevationCoveragePercent, 1)} % der Route sind durch Höhenpunkte abgedeckt.`
      : "Es sind keine belastbaren Höhenpunkte vorhanden.",
    `${knownSurfacePercent} % der Oberfläche und ${knownWayTypePercent} % der Wegtypen sind klassifiziert.`,
    smoothingApplied
      ? `${noiseCount} auffällige Höhenwerte wurden für die Auswertung deterministisch geglättet; Rohwerte bleiben erhalten.`
      : "Die deterministische Glättung hat keine auffälligen Einzelwerte verändert."
  ];
  const reasonCodes = [
    rawElevationPoints.length >= 2 ? "elevation_available" : "elevation_missing",
    elevationCoveragePercent >= 99 ? "elevation_complete" : "elevation_incomplete",
    knownSurfacePercent >= 99 ? "surface_complete" : knownSurfacePercent > 0 ? "surface_partial" : "surface_missing",
    smoothingApplied ? "smoothing_applied" : "smoothing_not_required"
  ];
  const quality = buildQuality({
    score: routeQualityScore,
    elevationCoveragePercent,
    pointDensity,
    knownSurfacePercent,
    knownWayTypePercent,
    interpolationRequired,
    smoothingApplied,
    reasonCodes,
    reasons
  });
  const routeWarnings: RouteConditionWarning[] = segments.flatMap((segment) => segment.warnings);
  if (rawElevationPoints.length < 2) {
    routeWarnings.push(warning("elevation_missing", "critical", "Höhendaten fehlen; Steigung und Höhenmeter werden nicht scheinpräzise ausgewiesen."));
  } else if (elevationCoveragePercent < 99) {
    routeWarnings.push(warning("elevation_incomplete", "warning", "Das Höhenprofil deckt die Route nicht vollständig ab."));
    routeWarnings.push(warning("interpolated_data", "info", "Zwischen vorhandenen Höhenpunkten wird linear interpoliert; außerhalb der Abdeckung nicht."));
  }
  if (noiseCount > 0) routeWarnings.push(warning("noisy_elevation_profile", "warning", "Auffällige Einzelwerte wurden nur in der geglätteten Auswertung reduziert."));
  if (quality.level === "low" || quality.level === "unknown") {
    routeWarnings.push(warning("low_quality", "warning", "Die Datenqualität reicht nur für eine vorsichtige Planungsbewertung."));
  }

  const elevationUpM = round(segments.reduce((sum, segment) => sum + segment.positiveElevationM, 0), 1);
  const elevationDownM = round(segments.reduce((sum, segment) => sum + segment.negativeElevationM, 0), 1);
  const maximumGradePercent = segments.reduce<number | null>(
    (maximum, segment) => segment.maximumComputableGradePercent === null ? maximum : Math.max(maximum ?? 0, segment.maximumComputableGradePercent),
    null
  );
  const warnings = stableWarnings(routeWarnings);

  return {
    modelVersion: ROUTE_CONDITION_MODEL_VERSION,
    inputFingerprint: stableFingerprint({
      modelVersion: ROUTE_CONDITION_MODEL_VERSION,
      totalDistanceKm: round(totalDistanceKm, 4),
      elevationSource,
      elevationPoints: rawElevationPoints,
      sourceSegments
    }),
    totalDistanceKm: round(totalDistanceKm, 3),
    rawElevationPoints,
    smoothedElevationPoints,
    elevationSource,
    elevationUpM,
    elevationDownM,
    maximumGradePercent: maximumGradePercent === null ? null : round(maximumGradePercent, 2),
    segments,
    surfaceDistribution,
    wayTypeDistribution,
    pavedPercent: percentForSurfaces(["asphalt", "concrete", "paving_stones", "compacted"]),
    unpavedPercent: percentForSurfaces(["fine_gravel", "coarse_gravel", "unpaved", "forest", "earth"]),
    unknownSurfacePercent: percentForSurfaces(["unknown"]),
    quality,
    warnings,
    smoothing: elevationSmoothingParameters,
    existingCalculationsChanged: false
  };
}

export function parseBRouterConditionSegments(messages: unknown, routeDistanceKmValue: number): RouteConditionSourceSegment[] {
  if (!Array.isArray(messages) || messages.length < 2 || !Array.isArray(messages[0])) return [];
  const header = messages[0].map(String);
  const distanceIndex = header.indexOf("Distance");
  const wayTagsIndex = header.indexOf("WayTags");
  if (distanceIndex < 0 || wayTagsIndex < 0) return [];
  const rows = messages.slice(1).flatMap((row, index) => {
    if (!Array.isArray(row)) return [];
    const distanceM = Number(row[distanceIndex]);
    if (!Number.isFinite(distanceM) || distanceM <= 0) return [];
    const tags = Object.fromEntries(
      String(row[wayTagsIndex] ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((entry) => {
          const separator = entry.indexOf("=");
          return separator > 0 ? [entry.slice(0, separator), entry.slice(separator + 1)] : [entry, "yes"];
        })
    );
    return [{ index, distanceKm: distanceM / 1000, tags }];
  });
  const analyzedDistanceKm = rows.reduce((sum, row) => sum + row.distanceKm, 0);
  if (analyzedDistanceKm <= 0) return [];
  const scale = routeDistanceKmValue > 0 ? routeDistanceKmValue / analyzedDistanceKm : 1;
  let cursor = 0;
  return rows.map((row) => {
    const startKm = cursor;
    cursor += row.distanceKm * scale;
    return {
      id: `brouter-condition-${String(row.index + 1).padStart(4, "0")}`,
      startKm: round(startKm, 4),
      endKm: round(Math.min(routeDistanceKmValue, cursor), 4),
      surface: row.tags.surface ?? null,
      wayType: row.tags.highway ?? null,
      tags: row.tags,
      dataSource: "brouter" as const
    };
  });
}

export function normalizeRouteConditionSourceSegments(value: unknown, totalDistanceKm = Number.POSITIVE_INFINITY) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index): RouteConditionSourceSegment[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Record<string, unknown>;
    const startKm = Number(record.startKm);
    const endKm = Number(record.endKm);
    if (!Number.isFinite(startKm) || !Number.isFinite(endKm) || endKm <= startKm) return [];
    const dataSource = ["gpx", "brouter", "provider", "estimated", "manual", "stored", "unknown"].includes(String(record.dataSource))
      ? record.dataSource as RouteConditionDataSource
      : "unknown";
    const tags = record.tags && typeof record.tags === "object"
      ? Object.fromEntries(Object.entries(record.tags as Record<string, unknown>).map(([key, tag]) => [key, String(tag)]))
      : {};
    const normalizedStart = bounded(startKm, 0, totalDistanceKm);
    const normalizedEnd = bounded(endKm, normalizedStart, totalDistanceKm);
    if (normalizedEnd <= normalizedStart) return [];
    return [{
      id: typeof record.id === "string" && record.id ? record.id : `condition-source-${index + 1}`,
      startKm: round(normalizedStart, 4),
      endKm: round(normalizedEnd, 4),
      surface: typeof record.surface === "string" ? record.surface : null,
      wayType: typeof record.wayType === "string" ? record.wayType : null,
      tags,
      dataSource
    }];
  }).sort((left, right) => left.startKm - right.startKm || left.endKm - right.endKm || left.id.localeCompare(right.id));
}

export function sliceRouteConditionSourceSegments(sourceSegments: RouteConditionSourceSegment[], startKm: number, endKm: number) {
  return normalizeRouteConditionSourceSegments(sourceSegments).flatMap((segment, index): RouteConditionSourceSegment[] => {
    const overlapStart = Math.max(startKm, segment.startKm);
    const overlapEnd = Math.min(endKm, segment.endKm);
    if (overlapEnd <= overlapStart) return [];
    return [{
      ...segment,
      id: `${segment.id}-slice-${index + 1}`,
      startKm: round(overlapStart - startKm, 4),
      endKm: round(overlapEnd - startKm, 4),
      tags: { ...(segment.tags ?? {}) }
    }];
  });
}

export function analyzeRouteConditionSlice(
  input: AnalyzeRouteConditionInput,
  startKm: number,
  endKm: number
) {
  const totalDistanceKm = routeDistanceKm(input.geometry.coordinates);
  const safeStart = bounded(startKm, 0, totalDistanceKm);
  const safeEnd = bounded(endKm, safeStart, totalDistanceKm);
  const points = normalizeElevationPoints(input.elevationPoints ?? [], totalDistanceKm);
  const startElevation = elevationAt(points, safeStart);
  const endElevation = elevationAt(points, safeEnd);
  const slicedPoints = [
    ...(startElevation === null ? [] : [{ distanceKm: 0, elevationM: startElevation }]),
    ...points
      .filter((point) => point.distanceKm > safeStart && point.distanceKm < safeEnd)
      .map((point) => ({ distanceKm: round(point.distanceKm - safeStart, 4), elevationM: point.elevationM })),
    ...(endElevation === null ? [] : [{ distanceKm: round(safeEnd - safeStart, 4), elevationM: endElevation }])
  ];
  return analyzeRouteCondition({
    geometry: { type: "LineString", coordinates: sliceLineString(input.geometry.coordinates, safeStart, safeEnd) },
    elevationPoints: slicedPoints,
    elevationSource: input.elevationSource,
    sourceSegments: sliceRouteConditionSourceSegments(input.sourceSegments ?? [], safeStart, safeEnd)
  });
}

export function routeConditionStateSnapshot(
  sourceSegments: RouteConditionSourceSegment[],
  analysis: RouteConditionAnalysis
): RouteConditionStoredState {
  return {
    schemaVersion: ROUTE_CONDITION_STATE_VERSION,
    modelVersion: ROUTE_CONDITION_MODEL_VERSION,
    sourceSegments: normalizeRouteConditionSourceSegments(sourceSegments, analysis.totalDistanceKm),
    lastCalculation: analysis
  };
}

export function normalizeRouteConditionStoredState(value: unknown): RouteConditionStoredState {
  if (!value || typeof value !== "object") {
    return { schemaVersion: ROUTE_CONDITION_STATE_VERSION, modelVersion: ROUTE_CONDITION_MODEL_VERSION, sourceSegments: [] };
  }
  const record = value as Record<string, unknown>;
  const lastCalculation = record.lastCalculation && typeof record.lastCalculation === "object"
    && (record.lastCalculation as Record<string, unknown>).modelVersion === ROUTE_CONDITION_MODEL_VERSION
      ? record.lastCalculation as RouteConditionAnalysis
      : undefined;
  return {
    schemaVersion: ROUTE_CONDITION_STATE_VERSION,
    modelVersion: ROUTE_CONDITION_MODEL_VERSION,
    sourceSegments: normalizeRouteConditionSourceSegments(record.sourceSegments),
    ...(lastCalculation ? { lastCalculation } : {})
  };
}

export function serializeRouteConditionStoredState(state: RouteConditionStoredState) {
  const normalized = normalizeRouteConditionStoredState(state);
  return JSON.stringify({
    schemaVersion: normalized.schemaVersion,
    modelVersion: normalized.modelVersion,
    sourceSegments: normalized.sourceSegments,
    ...(normalized.lastCalculation ? { lastCalculation: normalized.lastCalculation } : {})
  });
}
