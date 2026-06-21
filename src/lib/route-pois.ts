import { PartnerStatus, PoiCategory } from "@prisma/client";

import { distancePointToLineKm, pointAtDistance, routeDistanceKm, type LineStringGeoJson, type Position } from "@/lib/geo";

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

const routeTestPoiTemplates = [
  {
    category: PoiCategory.ACCOMMODATION,
    fraction: 0.18,
    name: "Test-Unterkunft nahe der Route",
    tagsJson: {
      testData: true,
      rating: 4.4,
      bikeGarage: true,
      bikeParking: true,
      luggageAccepted: true,
      restaurantInHouse: true
    }
  },
  {
    category: PoiCategory.BIKE_REPAIR,
    fraction: 0.32,
    name: "Test-Werkstatt Radservice",
    tagsJson: {
      testData: true,
      rating: 4.2,
      repair: true,
      spareParts: true,
      ebikeService: true,
      emergencyContact: true
    }
  },
  {
    category: PoiCategory.RESTAURANT,
    fraction: 0.46,
    name: "Test-Gasthof Etappenpause",
    tagsJson: {
      testData: true,
      rating: 4.1,
      lunch: true,
      dinner: true,
      vegetarian: true,
      bikeParking: true
    }
  },
  {
    category: PoiCategory.SUPERMARKET,
    fraction: 0.58,
    name: "Test-Supermarkt Proviant",
    tagsJson: {
      testData: true,
      rating: 3.9,
      supplies: true,
      bikeParking: true
    }
  },
  {
    category: PoiCategory.DRINKING_WATER,
    fraction: 0.7,
    name: "Test-Trinkwasserstelle",
    tagsJson: {
      testData: true,
      rating: 4.0,
      free: true
    }
  },
  {
    category: PoiCategory.SIGHT,
    fraction: 0.84,
    name: "Test-Aussichtspunkt",
    tagsJson: {
      testData: true,
      rating: 4.5,
      scenic: true
    }
  }
] satisfies Array<{
  category: PoiCategory;
  fraction: number;
  name: string;
  tagsJson: Record<string, unknown>;
}>;

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

function offsetPosition(position: Position, index: number): Position {
  const direction = index % 2 === 0 ? 1 : -1;
  const offset = 0.0025 + (index % 3) * 0.0007;
  return [position[0] + direction * offset, position[1] + direction * offset * 0.6];
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

export function createRouteTestPois(routeId: string, geometry: LineStringGeoJson, categories?: PoiCategory[]): RoutePoi[] {
  const totalDistanceKm = routeDistanceKm(geometry.coordinates);
  if (geometry.coordinates.length < 2 || totalDistanceKm <= 0) {
    return [];
  }

  return routeTestPoiTemplates
    .filter((template) => (categories ? categories.includes(template.category) : true))
    .map((template, index) => {
      const routePosition = pointAtDistance(geometry.coordinates, totalDistanceKm * template.fraction);
      const [lon, lat] = offsetPosition(routePosition, index);

      return {
        id: `test_${routeId}_${template.category.toLowerCase()}_${index}`,
        name: template.name,
        category: template.category,
        lat,
        lon,
        address: "Testdaten entlang der importierten Route",
        phone: null,
        website: null,
        source: "generated-test",
        osmId: null,
        partnerId: null,
        tagsJson: template.tagsJson,
        partner: null,
        distanceToRouteKm: Number(distancePointToLineKm([lon, lat], geometry.coordinates).toFixed(2))
      };
    });
}
