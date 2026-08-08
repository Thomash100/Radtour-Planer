import {
  accommodationTypeFromTags,
  type AccommodationDataQuality,
  type AccommodationStatus,
  type StageAccommodation
} from "@/lib/accommodations";
import type { LineStringGeoJson } from "@/lib/geo";
import {
  normalizeChargingPlanningState,
  type ChargingPlanningState
} from "@/lib/ebike-charging";
import {
  normalizeRidingStrategyState,
  type RidingStrategyState
} from "@/lib/ebike-riding-strategy";
import type { CycleRouteCoverage } from "@/lib/mock-routing";
import { parseRiderBikeProfileValue, type RiderBikeProfile } from "@/lib/rider-bike-profile";
import {
  normalizeRouteConditionSourceSegments,
  normalizeRouteConditionStoredState,
  type RouteConditionSourceSegment,
  type RouteConditionStoredState
} from "@/lib/route-elevation-surface";
import {
  normalizeRouteOptimizationStoredState,
  type RouteOptimizationStoredState
} from "@/lib/route-optimizer";
import type { StageDifficultyLevel } from "@/lib/stage-difficulty";

export const TOUR_STATE_STORAGE_KEY = "biketriphub.tourState.v1";

export const TOUR_STATE_STORAGE_ERROR_MESSAGE =
  "Die Route konnte im Browser nicht gespeichert werden. Bitte eine vorhandene Tour löschen oder die Tour exportieren.";

export type TourInputMode = "direct" | "gpx" | "demo";

export type StoredRoute = {
  id?: string;
  name: string;
  description?: string | null;
  startName: string;
  endName: string;
  profile: string;
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  durationHours: number;
  geometryGeoJson: LineStringGeoJson;
  originalGeometryGeoJson?: LineStringGeoJson;
  originalDistanceKm?: number;
  originalElevationUp?: number;
  originalElevationDown?: number;
  originalDurationHours?: number;
  originalElevationProfile?: Array<{ distanceKm: number; elevationM: number }>;
  elevationSource?: "provider" | "gpx" | "estimated";
  trimStartKmOriginal?: number;
  trimEndKmOriginal?: number;
  startLocationName?: string;
  startLocationCoordinate?: [number, number];
  elevationProfile: Array<{ distanceKm: number; elevationM: number }>;
  waypoints: Array<{ order: number; name: string; lat: number; lon: number }>;
  coordinateCorrections?: string[];
  routingProvider?: "brouter" | "mock";
  routingProfileName?: string;
  routingAttribution?: string;
  routingDataNotice?: string;
  cycleRouteCoverage?: CycleRouteCoverage;
  routeConditionSourceSegments?: RouteConditionSourceSegment[];
  originalRouteConditionSourceSegments?: RouteConditionSourceSegment[];
};

export type StoredStage = {
  id?: string;
  dayNumber: number;
  startName?: string;
  endName?: string;
  distanceKm?: number;
  elevationUp?: number;
  elevationDown?: number;
  geometryGeoJson: LineStringGeoJson;
};

export type StoredPoi = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  source?: string | null;
  tagsJson: Record<string, unknown>;
  distanceToRouteKm?: number;
  partnerId?: string | null;
};

export type StoredStageGenerationMode = "distance" | "days" | "difficulty" | "custom";

export type StoredStageBreakpoint = {
  id?: string;
  name: string;
  distanceKm: number;
};

export type StoredTourState = {
  libraryTourId?: string | null;
  tourKind?: "demo" | "user";
  inputMode: TourInputMode;
  route: StoredRoute | null;
  stages: StoredStage[];
  pois: StoredPoi[];
  selectedPoiId?: string | null;
  selectedStageId?: string | null;
  stageGenerationMode?: StoredStageGenerationMode;
  targetKm?: number;
  travelDays?: number;
  difficultyTarget?: StageDifficultyLevel;
  riderBikeProfile?: RiderBikeProfile;
  stageBreakpoints?: StoredStageBreakpoint[];
  stageAccommodations?: Record<string, StageAccommodation>;
  chargingPlanning?: ChargingPlanningState;
  ridingStrategy?: RidingStrategyState;
  routeCondition?: RouteConditionStoredState;
  routeOptimization?: RouteOptimizationStoredState;
  status?: string;
  lastSavedAt?: string | null;
  updatedAt: string;
};

export type StoreTourStateResult =
  | { ok: true; serializedLength: number }
  | { ok: false; reason: "quota" | "storage"; message: string };

function jsonValuesEqual(left: unknown, right: unknown) {
  if (left === right) return true;
  if (left === undefined || right === undefined) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

function compactStoredRoute(route: StoredRoute, fallbackSourceSegments: RouteConditionSourceSegment[]) {
  const compactRoute: StoredRoute = {
    ...route,
    routeConditionSourceSegments: normalizeRouteConditionSourceSegments(
      route.routeConditionSourceSegments ?? fallbackSourceSegments,
      route.distanceKm
    )
  };

  if (jsonValuesEqual(compactRoute.originalGeometryGeoJson, compactRoute.geometryGeoJson)) {
    delete compactRoute.originalGeometryGeoJson;
  }
  if (compactRoute.originalDistanceKm === compactRoute.distanceKm) delete compactRoute.originalDistanceKm;
  if (compactRoute.originalElevationUp === compactRoute.elevationUp) delete compactRoute.originalElevationUp;
  if (compactRoute.originalElevationDown === compactRoute.elevationDown) delete compactRoute.originalElevationDown;
  if (compactRoute.originalDurationHours === compactRoute.durationHours) delete compactRoute.originalDurationHours;
  if (jsonValuesEqual(compactRoute.originalElevationProfile, compactRoute.elevationProfile)) {
    delete compactRoute.originalElevationProfile;
  }
  if (
    jsonValuesEqual(
      compactRoute.originalRouteConditionSourceSegments,
      compactRoute.routeConditionSourceSegments
    )
  ) {
    delete compactRoute.originalRouteConditionSourceSegments;
  }
  if (compactRoute.trimStartKmOriginal === 0) delete compactRoute.trimStartKmOriginal;
  if (
    compactRoute.trimEndKmOriginal === compactRoute.distanceKm ||
    compactRoute.trimEndKmOriginal === compactRoute.originalDistanceKm
  ) {
    delete compactRoute.trimEndKmOriginal;
  }

  return compactRoute;
}

/**
 * Removes deterministic calculation results and exact original-route duplicates
 * before browser persistence. The source data remains available, so the current
 * model can reproduce the analysis after loading. Older, uncompressed states
 * remain supported by parseStoredTourState.
 */
export function compactStoredTourState(state: StoredTourState): StoredTourState {
  const fallbackSourceSegments = normalizeRouteConditionSourceSegments(state.routeCondition?.sourceSegments);
  return {
    ...state,
    route: state.route ? compactStoredRoute(state.route, fallbackSourceSegments) : null,
    routeCondition: undefined
  };
}

export function serializeStoredTourState(state: StoredTourState) {
  return JSON.stringify(compactStoredTourState(state));
}

export function storeCurrentTourState(
  storage: Pick<Storage, "setItem">,
  state: StoredTourState
): StoreTourStateResult {
  try {
    const serialized = serializeStoredTourState(state);
    storage.setItem(TOUR_STATE_STORAGE_KEY, serialized);
    return { ok: true, serializedLength: serialized.length };
  } catch (error) {
    const errorName =
      error && typeof error === "object" && "name" in error ? String(error.name) : "";
    const reason =
      errorName === "QuotaExceededError" || errorName === "NS_ERROR_DOM_QUOTA_REACHED"
        ? "quota"
        : "storage";
    return { ok: false, reason, message: TOUR_STATE_STORAGE_ERROR_MESSAGE };
  }
}

function normalizeStageAccommodation(value: unknown): StageAccommodation | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const coordinate = record.coordinate;
  const type =
    accommodationTypeFromTags({ accommodationType: record.type }) ??
    accommodationTypeFromTags({ tourism: record.type });
  if (
    !type ||
    !Array.isArray(coordinate) ||
    coordinate.length < 2 ||
    !Number.isFinite(Number(coordinate[0])) ||
    !Number.isFinite(Number(coordinate[1])) ||
    typeof record.id !== "string" ||
    typeof record.stageId !== "string" ||
    typeof record.name !== "string"
  ) {
    return null;
  }

  const legacyStatus = record.status;
  const status: AccommodationStatus =
    legacyStatus === "selected" || legacyStatus === "overnight"
      ? "overnight"
      : legacyStatus === "planned" || legacyStatus === "bookmarked"
        ? "bookmarked"
        : "suggested";
  const legacyDataQuality = record.dataQuality;
  const dataQuality: AccommodationDataQuality =
    legacyDataQuality === "local-test"
      ? "development"
      : ["partner", "osm", "poi", "manual", "development"].includes(String(legacyDataQuality))
        ? (legacyDataQuality as AccommodationDataQuality)
        : "poi";
  const rawFeatures =
    record.features && typeof record.features === "object" ? (record.features as Record<string, unknown>) : {};
  const features = {
    ...(rawFeatures.bikeParking === true ? { bikeParking: true as const } : {}),
    ...(rawFeatures.lockableBikeRoom === true ? { lockableBikeRoom: true as const } : {}),
    ...(rawFeatures.ebikeCharging === true ? { ebikeCharging: true as const } : {}),
    ...(rawFeatures.luggageStorage === true ? { luggageStorage: true as const } : {})
  };

  return {
    ...(record as unknown as StageAccommodation),
    type,
    coordinate: [Number(coordinate[0]), Number(coordinate[1])],
    source: typeof record.source === "string" && record.source ? record.source : "POI",
    dataQuality,
    status,
    features,
    routingStatus: record.routingStatus === "routed" || record.routingStatus === "failed" ? record.routingStatus : "not_required",
    routingMessage: typeof record.routingMessage === "string" ? record.routingMessage : null,
    detour: record.detour && typeof record.detour === "object" ? (record.detour as StageAccommodation["detour"]) : null
  };
}

export function parseStoredTourState(raw: string | null): StoredTourState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredTourState;
    if (!parsed || typeof parsed !== "object" || !parsed.route || parsed.route.geometryGeoJson?.type !== "LineString") {
      return null;
    }
    const stageAccommodations = Object.fromEntries(
      Object.entries(parsed.stageAccommodations ?? {})
        .map(([stageId, accommodation]) => [stageId, normalizeStageAccommodation(accommodation)] as const)
        .filter((entry): entry is readonly [string, StageAccommodation] => entry[1] !== null)
    );
    const riderBikeProfile = parseRiderBikeProfileValue(parsed.riderBikeProfile);
    const chargingPlanning = normalizeChargingPlanningState(parsed.chargingPlanning);
    const ridingStrategy = normalizeRidingStrategyState(parsed.ridingStrategy);
    const routeCondition = normalizeRouteConditionStoredState(parsed.routeCondition);
    const routeOptimization = normalizeRouteOptimizationStoredState(parsed.routeOptimization);
    const routeConditionSourceSegments = normalizeRouteConditionSourceSegments(
      parsed.route.routeConditionSourceSegments ?? routeCondition.sourceSegments
    );
    const originalRouteConditionSourceSegments = normalizeRouteConditionSourceSegments(
      parsed.route.originalRouteConditionSourceSegments ?? routeConditionSourceSegments
    );
    return {
      ...parsed,
      route: {
        ...parsed.route,
        routeConditionSourceSegments,
        originalRouteConditionSourceSegments
      },
      ...(riderBikeProfile ? { riderBikeProfile } : { riderBikeProfile: undefined }),
      stageAccommodations,
      chargingPlanning,
      ridingStrategy,
      routeOptimization,
      routeCondition: {
        ...routeCondition,
        sourceSegments: routeConditionSourceSegments
      }
    };
  } catch {
    return null;
  }
}
