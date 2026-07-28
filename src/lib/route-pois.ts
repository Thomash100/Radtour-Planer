import { PartnerStatus, PoiCategory } from "@prisma/client";

import { distancePointToLineKm, type LineStringGeoJson } from "@/lib/geo";

export type RoutePoiPartner = {
  id: string;
  companyName: string;
  category: string;
  status: PartnerStatus | string;
  subscriptionPlan: string;
  isFeatured: boolean;
  email: string;
  website?: string | null;
} | null;

export type RoutePoi = {
  id: string;
  name: string;
  category: PoiCategory;
  lat: number;
  lon: number;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  source: string;
  osmId?: string | null;
  partnerId?: string | null;
  tagsJson: Record<string, unknown>;
  partner?: RoutePoiPartner;
  distanceToRouteKm: number;
};

export type PoiFilterOptions = {
  corridorKm: number;
  minRating: number;
  categories?: PoiCategory[];
  partnerOnly: boolean;
  ebikeFriendly: boolean;
  bikeGarage: boolean;
  luggageAccepted: boolean;
  dogsAllowed: boolean;
  restaurantInHouse: boolean;
  bikeParking: boolean;
};

function tagValue(tags: unknown, key: string) {
  return typeof tags === "object" && tags !== null && key in tags ? Boolean((tags as Record<string, unknown>)[key]) : false;
}

function numericTagValue(tags: unknown, key: string) {
  if (typeof tags !== "object" || tags === null || !(key in tags)) {
    return 0;
  }

  const value = Number((tags as Record<string, unknown>)[key]);
  return Number.isFinite(value) ? value : 0;
}

export function withDistanceToRoute<T extends { lon: number; lat: number }>(pois: T[], geometry: LineStringGeoJson) {
  return pois.map((poi) => ({
    ...poi,
    distanceToRouteKm: Number(distancePointToLineKm([poi.lon, poi.lat], geometry.coordinates).toFixed(2))
  }));
}

export function applyPoiFilters<T extends RoutePoi>(pois: T[], filters: PoiFilterOptions) {
  return pois
    .filter((poi) => poi.distanceToRouteKm <= filters.corridorKm)
    .filter((poi) => (filters.categories ? filters.categories.includes(poi.category) : true))
    .filter((poi) => (filters.partnerOnly ? poi.partnerId && poi.partner?.status === PartnerStatus.APPROVED : true))
    .filter((poi) => (filters.ebikeFriendly ? tagValue(poi.tagsJson, "ebikeFriendly") || tagValue(poi.tagsJson, "ebikeService") : true))
    .filter((poi) => (filters.bikeGarage ? tagValue(poi.tagsJson, "bikeGarage") : true))
    .filter((poi) => (filters.luggageAccepted ? tagValue(poi.tagsJson, "luggageAccepted") || tagValue(poi.tagsJson, "luggageTransfer") : true))
    .filter((poi) => (filters.dogsAllowed ? tagValue(poi.tagsJson, "dogsAllowed") : true))
    .filter((poi) => (filters.restaurantInHouse ? tagValue(poi.tagsJson, "restaurantInHouse") : true))
    .filter((poi) => (filters.bikeParking ? tagValue(poi.tagsJson, "bikeParking") || tagValue(poi.tagsJson, "bikeGarage") : true))
    .filter((poi) => (filters.minRating > 0 ? numericTagValue(poi.tagsJson, "rating") >= filters.minRating : true));
}

export function sortRoutePois<T extends RoutePoi>(pois: T[]) {
  return pois.slice().sort((a, b) => {
    const featuredA = a.partner?.isFeatured ? 1 : 0;
    const featuredB = b.partner?.isFeatured ? 1 : 0;
    return featuredB - featuredA || a.distanceToRouteKm - b.distanceToRouteKm;
  });
}
