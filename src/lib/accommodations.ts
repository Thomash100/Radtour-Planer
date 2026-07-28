import { distancePointToLineKm, haversineKm, type LineStringGeoJson, type Position } from "@/lib/geo";

export const accommodationTypes = ["hotel", "pension", "hostel", "camping", "apartment"] as const;
export type AccommodationType = (typeof accommodationTypes)[number];
export type AccommodationStatus = "suggested" | "bookmarked" | "overnight";
export type AccommodationDataQuality = "partner" | "osm" | "poi" | "manual" | "development";
export type AccommodationRoutingStatus = "not_required" | "routed" | "failed";
export type AccommodationFeatureKey = "bikeParking" | "lockableBikeRoom" | "ebikeCharging" | "luggageStorage";
export type AccommodationFeatures = Partial<Record<AccommodationFeatureKey, true>>;

export type AccommodationPoiInput = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  source?: string | null;
  osmId?: string | null;
  tagsJson?: Record<string, unknown>;
  distanceToRouteKm?: number;
  partnerId?: string | null;
  partnerCategory?: string | null;
};

export type AccommodationStageInput = {
  id?: string;
  dayNumber: number;
  endName?: string;
  geometryGeoJson: LineStringGeoJson;
};

export type AccommodationDetour = {
  distanceKm: number;
  outboundDistanceKm: number;
  returnDistanceKm: number;
  geometryGeoJson: LineStringGeoJson;
};

export type StageAccommodation = {
  id: string;
  stageId: string;
  poiId?: string;
  name: string;
  type: AccommodationType;
  place: string;
  coordinate: Position;
  distanceToStageEndKm: number;
  distanceToRouteKm: number;
  source: string;
  link?: string | null;
  phone?: string | null;
  email?: string | null;
  status: AccommodationStatus;
  dataQuality: AccommodationDataQuality;
  features: AccommodationFeatures;
  searchRadiusKm?: number;
  routingStatus: AccommodationRoutingStatus;
  routingMessage?: string | null;
  detour?: AccommodationDetour | null;
};

export type AccommodationCandidateFilters = {
  types?: AccommodationType[];
  maxDistanceToRouteKm?: number;
  maxDistanceToStageEndKm?: number;
  bicycleFeaturesOnly?: boolean;
};

export const accommodationDetourThresholdKm = 0.15;

const typeLabels: Record<AccommodationType, string> = {
  hotel: "Hotel",
  pension: "Pension",
  hostel: "Hostel",
  camping: "Campingplatz",
  apartment: "Ferienwohnung"
};

const featureLabels: Record<AccommodationFeatureKey, string> = {
  bikeParking: "Fahrradabstellplatz",
  lockableBikeRoom: "Abschließbarer Fahrradraum",
  ebikeCharging: "E-Bike-Lademöglichkeit",
  luggageStorage: "Gepäckaufbewahrung"
};

export function accommodationTypeLabel(value: AccommodationType) {
  return typeLabels[value];
}

export function accommodationFeatureLabel(value: AccommodationFeatureKey) {
  return featureLabels[value];
}

export function evidencedAccommodationFeatures(features: AccommodationFeatures) {
  return (Object.keys(featureLabels) as AccommodationFeatureKey[]).filter((feature) => features[feature] === true);
}

export function stageAccommodationSearchRadiusKm(stage: AccommodationStageInput & { distanceKm?: number }) {
  const distanceKm = Number(stage.distanceKm ?? 0);
  if (distanceKm >= 90) return 12;
  if (distanceKm >= 55) return 8;
  return 5;
}

export function accommodationDataQualityLabel(value: AccommodationDataQuality) {
  if (value === "partner") return "Partnerdaten";
  if (value === "osm") return "OSM-Daten";
  if (value === "manual") return "manuell geprüft";
  if (value === "development") return "Entwicklungsdaten";
  return "POI-Daten";
}

function dataQualityForPoi(poi: AccommodationPoiInput): AccommodationDataQuality {
  if (poi.partnerId) return "partner";
  if (poi.source === "manual" || poi.source === "manual-verified") return "manual";
  if (poi.source === "local-test" || Boolean(poi.tagsJson?.testData)) return "development";
  if (poi.source === "osm-overpass" || typeof poi.osmId === "string" || poi.tagsJson?.dataSource === "openstreetmap") return "osm";
  return "poi";
}

function stageKey(stage: AccommodationStageInput) {
  return stage.id ?? `day-${stage.dayNumber}`;
}

function stageEndCoordinate(stage: AccommodationStageInput): Position {
  return stage.geometryGeoJson.coordinates[stage.geometryGeoJson.coordinates.length - 1];
}

function roundedKm(value: number) {
  return Number(value.toFixed(2));
}

function stringTag(tags: unknown, key: string) {
  if (typeof tags !== "object" || tags === null || !(key in tags)) {
    return null;
  }

  const value = (tags as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizedTagValue(tags: unknown, key: string) {
  if (typeof tags !== "object" || tags === null) {
    return null;
  }
  const value = (tags as Record<string, unknown>)[key];
  if (value === true) return "yes";
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

function affirmativeTag(tags: unknown, keys: string[]) {
  return keys.some((key) => {
    const value = normalizedTagValue(tags, key);
    return value !== null && ["yes", "true", "1", "designated", "customers", "private", "covered", "indoor"].includes(value);
  });
}

function evidencedTag(tags: unknown, keys: string[]) {
  return keys.some((key) => {
    const value = normalizedTagValue(tags, key);
    return value !== null && !["", "no", "false", "0", "none", "unknown"].includes(value);
  });
}

export function accommodationFeaturesFromTags(tags: unknown): AccommodationFeatures {
  const features: AccommodationFeatures = {};
  if (evidencedTag(tags, ["bikeParking", "bicycle_parking", "bicycle:parking", "service:bicycle:parking"])) {
    features.bikeParking = true;
  }
  if (
    affirmativeTag(tags, [
      "bikeGarage",
      "lockableBikeRoom",
      "bicycle_parking:lockable",
      "bicycle_parking:secure",
      "service:bicycle:storage"
    ])
  ) {
    features.lockableBikeRoom = true;
  }
  if (affirmativeTag(tags, ["ebikeCharging", "ebikeFriendly", "charging_station", "service:bicycle:charging"])) {
    features.ebikeCharging = true;
  }
  if (affirmativeTag(tags, ["luggageStorage", "luggageAccepted", "luggage_storage", "service:luggage:storage"])) {
    features.luggageStorage = true;
  }
  return features;
}

export function accommodationTypeFromTags(tags: unknown): AccommodationType | null {
  const record = typeof tags === "object" && tags !== null ? (tags as Record<string, unknown>) : {};
  const explicitType = record.accommodationType ?? record.type;
  if (typeof explicitType === "string") {
    const normalized = explicitType.trim().toLowerCase();
    if (normalized === "hotel") return "hotel";
    if (["pension", "guest_house", "guest house", "bed_and_breakfast", "bed & breakfast", "pension/gästehaus"].includes(normalized)) {
      return "pension";
    }
    if (normalized === "hostel" || normalized === "jugendherberge") return "hostel";
    if (["camping", "camp_site", "campingplatz", "caravan_site"].includes(normalized)) return "camping";
    if (["apartment", "ferienwohnung", "chalet"].includes(normalized)) return "apartment";
  }

  const tourism = typeof record.tourism === "string" ? record.tourism.toLowerCase() : undefined;
  if (tourism === "hotel") return "hotel";
  if (tourism === "guest_house" || tourism === "bed_and_breakfast") return "pension";
  if (tourism === "hostel") return "hostel";
  if (tourism === "camp_site" || tourism === "caravan_site") return "camping";
  if (tourism === "apartment" || tourism === "chalet") return "apartment";
  return null;
}

export function accommodationPlaceFromAddress(address: string | null | undefined, fallback: string) {
  if (!address) {
    return fallback;
  }

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.at(-1) ?? fallback;
}

export function isAccommodationDetour(
  accommodation: Pick<StageAccommodation, "distanceToRouteKm">,
  thresholdKm = accommodationDetourThresholdKm
) {
  return accommodation.distanceToRouteKm > thresholdKm;
}

export function toStageAccommodationCandidate(
  stage: AccommodationStageInput,
  routeGeometry: LineStringGeoJson,
  poi: AccommodationPoiInput,
  searchRadiusKm = stageAccommodationSearchRadiusKm(stage)
): StageAccommodation | null {
  const type =
    accommodationTypeFromTags(poi.tagsJson) ??
    accommodationTypeFromTags({ accommodationType: poi.partnerCategory });
  if (!type) {
    return null;
  }

  const coordinate: Position = [poi.lon, poi.lat];
  const stageEnd = stageEndCoordinate(stage);
  const sourceLabel = poi.partnerId ? "Partnerdaten" : poi.source === "osm-overpass" ? "OpenStreetMap" : poi.source ?? "POI";
  const osmLink = poi.osmId ? `https://www.openstreetmap.org/${poi.osmId}` : null;

  return {
    id: `poi-${poi.id}-stage-${stageKey(stage)}`,
    stageId: stageKey(stage),
    poiId: poi.id,
    name: poi.name,
    type,
    place: accommodationPlaceFromAddress(poi.address, stage.endName ?? `Etappe ${stage.dayNumber}`),
    coordinate,
    distanceToStageEndKm: roundedKm(haversineKm(coordinate, stageEnd)),
    distanceToRouteKm: roundedKm(poi.distanceToRouteKm ?? distancePointToLineKm(coordinate, routeGeometry.coordinates)),
    source: sourceLabel,
    link: poi.website ?? osmLink,
    phone: poi.phone ?? stringTag(poi.tagsJson, "phone") ?? stringTag(poi.tagsJson, "contact:phone"),
    email: stringTag(poi.tagsJson, "email") ?? stringTag(poi.tagsJson, "contact:email"),
    status: "suggested",
    dataQuality: dataQualityForPoi(poi),
    features: accommodationFeaturesFromTags(poi.tagsJson),
    searchRadiusKm,
    routingStatus: "not_required",
    routingMessage: null,
    detour: null
  };
}

export function rankStageAccommodationCandidates(
  stage: AccommodationStageInput,
  routeGeometry: LineStringGeoJson,
  pois: AccommodationPoiInput[],
  limit = 12,
  filters: AccommodationCandidateFilters = {}
) {
  const searchRadiusKm = stageAccommodationSearchRadiusKm(stage);
  const maxDistanceToStageEndKm = filters.maxDistanceToStageEndKm ?? searchRadiusKm;
  const maxDistanceToRouteKm = filters.maxDistanceToRouteKm ?? accommodationDetourThresholdKm;
  const selectedTypes = new Set(filters.types ?? accommodationTypes);

  return pois
    .filter((poi) => poi.category === "ACCOMMODATION")
    .map((poi) => toStageAccommodationCandidate(stage, routeGeometry, poi, searchRadiusKm))
    .filter((candidate): candidate is StageAccommodation => candidate !== null)
    .filter((candidate) => selectedTypes.has(candidate.type))
    .filter((candidate) => candidate.distanceToStageEndKm <= maxDistanceToStageEndKm)
    .filter((candidate) => candidate.distanceToRouteKm <= maxDistanceToRouteKm)
    .filter((candidate) => (filters.bicycleFeaturesOnly ? evidencedAccommodationFeatures(candidate.features).length > 0 : true))
    .sort((a, b) => a.distanceToStageEndKm + a.distanceToRouteKm * 0.5 - (b.distanceToStageEndKm + b.distanceToRouteKm * 0.5))
    .slice(0, limit);
}

export function selectStageAccommodation(
  candidate: StageAccommodation,
  status: Exclude<AccommodationStatus, "suggested"> = "overnight"
) {
  return {
    ...candidate,
    status
  };
}
