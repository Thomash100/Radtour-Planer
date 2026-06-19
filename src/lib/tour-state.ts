import type { LineStringGeoJson } from "@/lib/geo";

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
  elevationProfile: Array<{ distanceKm: number; elevationM: number }>;
  waypoints: Array<{ order: number; name: string; lat: number; lon: number }>;
  coordinateCorrections?: string[];
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

export type StoredTourState = {
  inputMode: TourInputMode;
  route: StoredRoute | null;
  stages: StoredStage[];
  pois: StoredPoi[];
  selectedPoiId?: string | null;
  status?: string;
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
