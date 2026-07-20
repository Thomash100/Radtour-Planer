import type { StageAccommodation } from "@/lib/accommodations";
import type { LineStringGeoJson } from "@/lib/geo";
import type { CycleRouteCoverage } from "@/lib/mock-routing";

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

export type StoredStageGenerationMode = "distance" | "days" | "custom";

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
  stageBreakpoints?: StoredStageBreakpoint[];
  stageAccommodations?: Record<string, StageAccommodation>;
  status?: string;
  lastSavedAt?: string | null;
  updatedAt: string;
};

export function parseStoredTourState(raw: string | null): StoredTourState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredTourState;
    if (!parsed || typeof parsed !== "object" || !parsed.route || parsed.route.geometryGeoJson?.type !== "LineString") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
