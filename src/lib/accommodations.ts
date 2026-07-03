import { distancePointToLineKm, haversineKm, type LineStringGeoJson, type Position } from "@/lib/geo";

export type AccommodationStatus = "planned" | "selected" | "candidate";
export type AccommodationDataQuality = "partner" | "osm" | "poi" | "manual" | "local-test";

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
};

export type AccommodationStageInput = {
  id?: string;
  dayNumber: number;
  endName?: string;
  geometryGeoJson: LineStringGeoJson;
};

export type StageAccommodation = {
  id: string;
  stageId: string;
  poiId?: string;
  name: string;
  type: string;
  place: string;
  coordinate: Position;
  distanceToStageEndKm: number;
  distanceToRouteKm: number;
  source?: string | null;
  link?: string | null;
  phone?: string | null;
  email?: string | null;
  status: AccommodationStatus;
  dataQuality?: AccommodationDataQuality;
  searchRadiusKm?: number;
};

export const accommodationDetourThresholdKm = 1.5;

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
  if (value === "poi") return "POI-Daten";
  return "Lokale MVP-Testdaten";
}

function dataQualityForPoi(poi: AccommodationPoiInput): AccommodationDataQuality {
  if (poi.partnerId) return "partner";
  if (poi.source === "generated-test" || Boolean(poi.tagsJson?.testData)) return "local-test";
  if (poi.source === "manual" || poi.source === "manual-verified") return "manual";
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

export function accommodationTypeFromTags(tags: unknown, name = "") {
  const record = typeof tags === "object" && tags !== null ? (tags as Record<string, unknown>) : {};
  const explicitType = record.accommodationType ?? record.type;
  if (typeof explicitType === "string" && explicitType.trim()) {
    return explicitType.trim();
  }

  const tourism = typeof record.tourism === "string" ? record.tourism : undefined;
  if (tourism === "hotel") return "Hotel";
  if (tourism === "guest_house" || tourism === "bed_and_breakfast") return "Pension/Gästehaus";
  if (tourism === "hostel") return "Hostel";
  if (tourism === "motel") return "Motel";
  if (tourism === "camp_site" || tourism === "caravan_site") return "Camping";
  if (tourism === "apartment" || tourism === "chalet") return "Ferienwohnung";
  if (tourism === "alpine_hut" || tourism === "wilderness_hut") return "Hütte";

  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("camping")) return "Camping";
  if (normalizedName.includes("ferien")) return "Ferienwohnung";
  if (normalizedName.includes("hostel")) return "Hostel";
  if (normalizedName.includes("pension")) return "Pension";
  if (normalizedName.includes("gästehaus") || normalizedName.includes("gaestehaus")) return "Gästehaus";
  return "Hotel";
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

export function isAccommodationDetour(accommodation: Pick<StageAccommodation, "distanceToRouteKm">, thresholdKm = accommodationDetourThresholdKm) {
  return accommodation.distanceToRouteKm > thresholdKm;
}

export function toStageAccommodationCandidate(
  stage: AccommodationStageInput,
  routeGeometry: LineStringGeoJson,
  poi: AccommodationPoiInput,
  searchRadiusKm = stageAccommodationSearchRadiusKm(stage)
): StageAccommodation {
  const coordinate: Position = [poi.lon, poi.lat];
  const stageEnd = stageEndCoordinate(stage);
  const sourceLabel = poi.source === "osm-overpass" ? "OpenStreetMap" : poi.source ?? "POI";
  const osmLink = poi.osmId ? `https://www.openstreetmap.org/${poi.osmId}` : null;

  return {
    id: `poi-${poi.id}-stage-${stageKey(stage)}`,
    stageId: stageKey(stage),
    poiId: poi.id,
    name: poi.name,
    type: accommodationTypeFromTags(poi.tagsJson, poi.name),
    place: accommodationPlaceFromAddress(poi.address, stage.endName ?? `Etappe ${stage.dayNumber}`),
    coordinate,
    distanceToStageEndKm: roundedKm(haversineKm(coordinate, stageEnd)),
    distanceToRouteKm: roundedKm(distancePointToLineKm(coordinate, routeGeometry.coordinates)),
    source: sourceLabel,
    link: poi.website ?? osmLink,
    phone: poi.phone ?? stringTag(poi.tagsJson, "phone") ?? stringTag(poi.tagsJson, "contact:phone"),
    email: stringTag(poi.tagsJson, "email") ?? stringTag(poi.tagsJson, "contact:email"),
    status: "candidate",
    dataQuality: dataQualityForPoi(poi),
    searchRadiusKm
  };
}

export function createMockStageAccommodation(
  stage: AccommodationStageInput,
  routeGeometry: LineStringGeoJson,
  index = 0,
  searchRadiusKm = stageAccommodationSearchRadiusKm(stage)
): StageAccommodation {
  const stageEnd = stageEndCoordinate(stage);
  const direction = index % 2 === 0 ? 1 : -1;
  const offset = 0.0045 + (stage.dayNumber % 3) * 0.0014;
  const coordinate: Position = [stageEnd[0] + direction * offset, stageEnd[1] - direction * offset * 0.65];
  const types = ["Pension", "Hotel", "Camping", "Ferienwohnung"];
  const type = types[(stage.dayNumber + index) % types.length];
  const place = stage.endName?.trim() || `Etappe ${stage.dayNumber}`;

  return {
    id: `mock-accommodation-${stageKey(stage)}-${index + 1}`,
    stageId: stageKey(stage),
    name: `${type} ${place}`,
    type,
    place,
    coordinate,
    distanceToStageEndKm: roundedKm(haversineKm(coordinate, stageEnd)),
    distanceToRouteKm: roundedKm(distancePointToLineKm(coordinate, routeGeometry.coordinates)),
    source: "Lokale MVP-Testdaten",
    link: null,
    status: "candidate",
    dataQuality: "local-test",
    searchRadiusKm
  };
}

export function rankStageAccommodationCandidates(
  stage: AccommodationStageInput,
  routeGeometry: LineStringGeoJson,
  pois: AccommodationPoiInput[],
  limit = 3,
  searchRadiusKm = stageAccommodationSearchRadiusKm(stage)
) {
  const candidates = pois
    .filter((poi) => poi.category === "ACCOMMODATION")
    .map((poi) => toStageAccommodationCandidate(stage, routeGeometry, poi, searchRadiusKm))
    .filter((candidate) => candidate.distanceToStageEndKm <= searchRadiusKm || candidate.distanceToRouteKm <= accommodationDetourThresholdKm)
    .sort((a, b) => a.distanceToStageEndKm + a.distanceToRouteKm * 0.5 - (b.distanceToStageEndKm + b.distanceToRouteKm * 0.5));

  const needsLocalFallback = candidates.length === 0 || candidates[0].distanceToStageEndKm > 20;
  const withFallback = needsLocalFallback ? [createMockStageAccommodation(stage, routeGeometry, 0, searchRadiusKm), ...candidates] : candidates;

  return withFallback.slice(0, limit);
}

export function selectStageAccommodation(candidate: StageAccommodation, status: Exclude<AccommodationStatus, "candidate"> = "selected") {
  return {
    ...candidate,
    status
  };
}
