import {
  accommodationTypeFromTags,
  type AccommodationDataQuality,
  type AccommodationStatus,
  type StageAccommodation
} from "@/lib/accommodations";
import type { LineStringGeoJson } from "@/lib/geo";
import type { CycleRouteCoverage } from "@/lib/mock-routing";
import type { StageDifficultyLevel } from "@/lib/stage-difficulty";

export const TOUR_STATE_STORAGE_KEY = "biketriphub.tourState.v1";

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
  stageBreakpoints?: StoredStageBreakpoint[];
  stageAccommodations?: Record<string, StageAccommodation>;
  status?: string;
  lastSavedAt?: string | null;
  updatedAt: string;
};

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
    return {
      ...parsed,
      stageAccommodations
    };
  } catch {
    return null;
  }
}
