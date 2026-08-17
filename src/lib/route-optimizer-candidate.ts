import { EBIKE_ASSISTANCE_MODEL_VERSION } from "@/lib/ebike-assistance";
import {
  buildTourChargingSegments,
  calculateChargingPlan,
  type ChargingPoint,
  type ChargingStageSource
} from "@/lib/ebike-charging";
import { EBIKE_ENERGY_MODEL_VERSION, calculateStageEnergyProjection } from "@/lib/ebike-energy";
import { EBIKE_RIDING_STRATEGY_MODEL_VERSION } from "@/lib/ebike-riding-strategy";
import {
  elevationMetricsForRange,
  projectLocationToRoute,
  routeBoundsForStage,
  routeDistanceKm,
  sliceElevationProfile,
  type Position
} from "@/lib/geo";
import {
  ROUTE_CONDITION_MODEL_VERSION,
  analyzeRouteCondition,
  type RouteConditionAnalysis
} from "@/lib/route-elevation-surface";
import type { RouteCandidate, RouteCandidateSource } from "@/lib/route-optimizer";
import type { StoredPoi, StoredStage, StoredTourState } from "@/lib/tour-state";

export type StoredTourCandidateInput = {
  id: string;
  name: string;
  state: StoredTourState;
  sourceLabel?: string;
};

function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function geometryFingerprint(coordinates: Position[]) {
  let hash = 2166136261;
  const stable = coordinates.map(([lon, lat]) => `${round(lon, 6)},${round(lat, 6)}`).join(";");
  for (const character of stable) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function candidateSource(state: StoredTourState, sourceLabel?: string): RouteCandidateSource {
  const route = state.route!;
  if (state.inputMode === "gpx") {
    return {
      kind: "gpx",
      label: sourceLabel ?? "GPX-Import",
      detail: "Vorhandene GPX-Geometrie; Oberflächen bleiben ohne belegte Quelldaten unbekannt.",
      existingCandidateOfflineAvailable: true,
      newCandidateGeneration: "not_available"
    };
  }
  if (route.routingProvider === "brouter") {
    return {
      kind: "brouter",
      label: sourceLabel ?? "BRouter",
      detail: "Bereits berechnete und unverändert gespeicherte BRouter-Geometrie.",
      routingProvider: "brouter",
      routingProfile: route.routingProfileName,
      existingCandidateOfflineAvailable: true,
      newCandidateGeneration: "external_router"
    };
  }
  return {
    kind: state.inputMode === "direct" ? "manual" : "saved",
    label: sourceLabel ?? (route.routingProvider === "mock" ? "Lokale Testgeometrie" : "Gespeicherte Route"),
    detail: route.routingProvider === "mock"
      ? "Vorhandene Testgeometrie; nicht als reale Navigation verwenden."
      : "Vorhandene, unveränderte Routengeometrie aus der Tourbibliothek.",
    ...(route.routingProvider === "mock" ? { routingProvider: "mock" as const } : {}),
    routingProfile: route.routingProfileName,
    existingCandidateOfflineAvailable: true,
    newCandidateGeneration: route.routingProvider === "mock" ? "not_available" : "unknown"
  };
}

function chargingTagNumber(tags: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = Number(tags[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function chargingConnectorTypes(tags: Record<string, unknown>) {
  const explicit = tags.connectorTypes;
  if (Array.isArray(explicit)) return explicit.map((value) => String(value).trim()).filter(Boolean).sort(compareText);
  if (typeof explicit === "string") return explicit.split(/[;,]/).map((value) => value.trim()).filter(Boolean).sort(compareText);
  return Object.entries(tags)
    .filter(([key, value]) => key.startsWith("socket:") && value !== false && value !== "no" && Number(value) !== 0)
    .map(([key]) => key.slice("socket:".length))
    .sort(compareText);
}

function isChargingPoi(poi: StoredPoi) {
  return (
    poi.category === "EBIKE_CHARGING" ||
    poi.tagsJson.ebikeCharging === true ||
    poi.tagsJson.charging_station === true ||
    [true, "yes", "customers"].includes(poi.tagsJson["service:bicycle:charging"] as true | string)
  );
}

function stageSources(state: StoredTourState): ChargingStageSource[] {
  const route = state.route!;
  const totalDistanceKm = routeDistanceKm(route.geometryGeoJson.coordinates);
  const sourceStages: StoredStage[] = state.stages.length > 0
    ? state.stages
    : [{
        id: `${state.libraryTourId ?? "route"}-whole-route`,
        dayNumber: 1,
        distanceKm: totalDistanceKm,
        elevationUp: route.elevationUp,
        elevationDown: route.elevationDown,
        geometryGeoJson: route.geometryGeoJson
      }];
  return sourceStages.map((stage, index) => {
    const bounds = state.stages.length > 0
      ? routeBoundsForStage(route.geometryGeoJson, stage.geometryGeoJson)
      : { startKm: 0, endKm: totalDistanceKm };
    const distanceKm = Math.max(0, bounds.endKm - bounds.startKm) || stage.distanceKm || totalDistanceKm;
    const elevationProfile = sliceElevationProfile(route.elevationProfile, bounds.startKm, bounds.endKm);
    const elevation = elevationMetricsForRange(route.elevationProfile, bounds.startKm, bounds.endKm);
    return {
      id: stage.id ?? `${state.libraryTourId ?? "route"}-stage-${index + 1}`,
      dayNumber: stage.dayNumber,
      routeStartKm: bounds.startKm,
      routeEndKm: bounds.endKm,
      distanceKm,
      elevationUp: stage.elevationUp ?? elevation?.elevationUp ?? 0,
      elevationDown: stage.elevationDown ?? elevation?.elevationDown ?? 0,
      elevationProfile,
      durationHours: route.durationHours > 0 && totalDistanceKm > 0 ? route.durationHours * (distanceKm / totalDistanceKm) : undefined,
      elevationDataStatus:
        route.elevationSource === "estimated" || route.routingProvider === "mock"
          ? "estimated"
          : elevationProfile.length >= 2
            ? "measured"
            : "missing"
    };
  });
}

function stageIdAt(stages: ChargingStageSource[], routeKm: number) {
  return stages.find((stage) => routeKm >= stage.routeStartKm - 0.001 && routeKm <= stage.routeEndKm + 0.001)?.id;
}

function chargingPoints(state: StoredTourState, stages: ChargingStageSource[]): ChargingPoint[] {
  const route = state.route!;
  const poiPoints: ChargingPoint[] = state.pois.filter(isChargingPoi).map((poi) => {
    const projected = projectLocationToRoute(poi.name, [poi.lon, poi.lat], route.geometryGeoJson);
    const availability = poi.tagsJson.availability === "unavailable" || poi.tagsJson.access === "no"
      ? "unavailable" as const
      : poi.tagsJson.availability === "available" || poi.tagsJson.access === "yes"
        ? "available" as const
        : "unknown" as const;
    return {
      id: `poi-${poi.id}`,
      name: poi.name,
      coordinate: [poi.lon, poi.lat],
      routeKm: projected.workDistanceKm,
      stageId: stageIdAt(stages, projected.workDistanceKm),
      connectorTypes: chargingConnectorTypes(poi.tagsJson),
      powerW: chargingTagNumber(poi.tagsJson, ["chargingPowerW", "powerW", "socketPowerW"]),
      operator: typeof poi.tagsJson.operator === "string" ? poi.tagsJson.operator : null,
      openingHours: typeof poi.tagsJson.opening_hours === "string" ? poi.tagsJson.opening_hours : null,
      costInfo: typeof poi.tagsJson.fee === "string" ? poi.tagsJson.fee : null,
      availability,
      source: "poi"
    };
  });
  const accommodationPoints: ChargingPoint[] = Object.values(state.stageAccommodations ?? {})
    .filter((accommodation) => accommodation.features.ebikeCharging)
    .map((accommodation) => {
      const projected = projectLocationToRoute(accommodation.name, accommodation.coordinate, route.geometryGeoJson);
      return {
        id: `accommodation-${accommodation.id}`,
        name: `${accommodation.name} · E-Bike-Laden`,
        coordinate: accommodation.coordinate,
        routeKm: projected.workDistanceKm,
        stageId: stageIdAt(stages, projected.workDistanceKm) ?? accommodation.stageId,
        connectorTypes: [],
        powerW: null,
        operator: null,
        openingHours: null,
        costInfo: null,
        availability: "unknown",
        source: "accommodation"
      };
    });
  const points = new Map<string, ChargingPoint>();
  [...poiPoints, ...accommodationPoints, ...(state.chargingPlanning?.customPoints ?? [])].forEach((point) => {
    points.set(point.id, { ...point, stageId: stageIdAt(stages, point.routeKm) ?? point.stageId });
  });
  return Array.from(points.values()).sort((left, right) => left.routeKm - right.routeKm || compareText(left.id, right.id));
}

function weightedComfort(analysis: RouteConditionAnalysis) {
  const knownSegments = analysis.segments.filter((segment) => segment.surface !== "unknown" && segment.lengthKm > 0);
  const distance = knownSegments.reduce((sum, segment) => sum + segment.lengthKm, 0);
  if (distance <= 0) return null;
  return round(knownSegments.reduce((sum, segment) => sum + segment.resistance.comfortFactor * segment.lengthKm, 0) / distance * 100, 2);
}

function minimumBatteryPercent(values: Array<number | null | undefined>) {
  const known = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return known.length > 0 ? round(Math.min(...known), 2) : null;
}

export function buildRouteCandidateFromStoredTour(input: StoredTourCandidateInput): RouteCandidate | null {
  const route = input.state.route;
  if (!route || route.geometryGeoJson.type !== "LineString" || route.geometryGeoJson.coordinates.length < 2) return null;
  const distanceKm = routeDistanceKm(route.geometryGeoJson.coordinates);
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  const analysis = analyzeRouteCondition({
    geometry: route.geometryGeoJson,
    elevationPoints: route.elevationProfile,
    elevationSource: route.elevationSource ?? "unknown",
    sourceSegments: route.routeConditionSourceSegments ?? []
  });
  const profile = input.state.riderBikeProfile;
  const energy = profile
    ? calculateStageEnergyProjection({
        profile,
        distanceKm,
        elevationUp: route.elevationUp,
        elevationDown: route.elevationDown,
        elevationProfile: route.elevationProfile,
        elevationDataStatus:
          route.elevationSource === "estimated" || route.routingProvider === "mock"
            ? "estimated"
            : route.elevationProfile.length >= 2
              ? "measured"
              : "missing"
      })
    : null;
  const stages = profile ? stageSources(input.state) : [];
  const plan = profile
    ? calculateChargingPlan({
        profile,
        segments: buildTourChargingSegments(profile, stages),
        chargingPoints: chargingPoints(input.state, stages),
        manualStops: input.state.chargingPlanning?.manualStops ?? []
      })
    : null;
  const destinationBatteryPercent = plan?.status !== "not_applicable"
    ? plan?.stages.at(-1)?.endCapacityPercent ?? energy?.remainingCapacityPercent ?? null
    : null;
  const minimumReservePercent = plan?.status !== "not_applicable"
    ? minimumBatteryPercent([
        100,
        ...(plan?.stages.flatMap((stage) => [stage.startCapacityPercent, stage.endCapacityPercent]) ?? []),
        ...(plan?.stops.flatMap((stop) => [stop.arrivalCapacityPercent, stop.departureCapacityPercent]) ?? [])
      ])
    : null;
  const warnings = Array.from(new Set([
    ...analysis.warnings.map((warning) => warning.message),
    ...(energy?.reserveWarning ? [energy.reserveWarning] : []),
    ...(plan?.warnings.map((warning) => warning.message) ?? []),
    ...(!profile ? ["Für diese Alternative fehlt ein gespeichertes Fahrer- und Fahrradprofil; Energie- und Akkuwerte bleiben unbekannt."] : [])
  ])).sort(compareText);
  return {
    id: input.id,
    name: input.name.trim() || route.name,
    source: candidateSource(input.state, input.sourceLabel),
    geometry: route.geometryGeoJson,
    geometryFingerprint: geometryFingerprint(route.geometryGeoJson.coordinates),
    distanceKm: round(distanceKm, 3),
    travelTimeHours: Number.isFinite(route.durationHours) && route.durationHours > 0 ? round(route.durationHours, 4) : null,
    elevationUpM: Number.isFinite(route.elevationUp) ? round(route.elevationUp, 1) : null,
    elevationDownM: Number.isFinite(route.elevationDown) ? round(route.elevationDown, 1) : null,
    maximumGradePercent: analysis.maximumGradePercent,
    energyNeedWh: energy ? round(energy.energyNeedWh, 2) : null,
    destinationBatteryPercent,
    minimumReservePercent,
    chargingStops: plan?.status === "not_applicable" ? null : plan?.stops.length ?? null,
    chargingTimeMinutes: plan?.status === "not_applicable" ? null : plan?.totalChargingDurationMinutes ?? null,
    surfaceDistribution: analysis.surfaceDistribution.map((entry) => ({ ...entry })),
    asphaltPercent: analysis.unknownSurfacePercent >= 100 ? null : analysis.surfaceDistribution.find((entry) => entry.classification === "asphalt")?.percent ?? 0,
    unpavedPercent: analysis.unknownSurfacePercent >= 100 ? null : analysis.unpavedPercent,
    unknownSurfacePercent: analysis.unknownSurfacePercent,
    comfortScore: weightedComfort(analysis),
    dataQualityLevel: analysis.quality.level,
    dataQualityScore: analysis.quality.score,
    warnings,
    modelVersions: {
      routeCondition: ROUTE_CONDITION_MODEL_VERSION,
      energy: EBIKE_ENERGY_MODEL_VERSION,
      charging: plan?.modelVersion ?? "not-calculated",
      assistance: EBIKE_ASSISTANCE_MODEL_VERSION,
      ridingStrategy: EBIKE_RIDING_STRATEGY_MODEL_VERSION
    }
  };
}
