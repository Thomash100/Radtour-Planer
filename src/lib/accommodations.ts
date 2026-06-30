import { distancePointToLineKm, haversineKm, type LineStringGeoJson, type Position } from "@/lib/geo";

export type AccommodationStatus = "planned" | "selected" | "candidate";

export type AccommodationPoiInput = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string | null;
  website?: string | null;
  source?: string | null;
  tagsJson?: Record<string, unknown>;
  distanceToRouteKm?: number;
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
  status: AccommodationStatus;
};

export const accommodationDetourThresholdKm = 1.5;

function stageKey(stage: AccommodationStageInput) {
  return stage.id ?? `day-${stage.dayNumber}`;
}

function stageEndCoordinate(stage: AccommodationStageInput): Position {
  return stage.geometryGeoJson.coordinates[stage.geometryGeoJson.coordinates.length - 1];
}

function roundedKm(value: number) {
  return Number(value.toFixed(2));
}

export function accommodationTypeFromTags(tags: unknown, name = "") {
  const record = typeof tags === "object" && tags !== null ? (tags as Record<string, unknown>) : {};
  const explicitType = record.accommodationType ?? record.type;
  if (typeof explicitType === "string" && explicitType.trim()) {
    return explicitType.trim();
  }

  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("camping")) return "Camping";
  if (normalizedName.includes("ferien")) return "Ferienwohnung";
  if (normalizedName.includes("pension")) return "Pension";
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
  poi: AccommodationPoiInput
): StageAccommodation {
  const coordinate: Position = [poi.lon, poi.lat];
  const stageEnd = stageEndCoordinate(stage);

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
    source: poi.source ?? "POI",
    link: poi.website ?? null,
    status: "candidate"
  };
}

export function createMockStageAccommodation(stage: AccommodationStageInput, routeGeometry: LineStringGeoJson, index = 0): StageAccommodation {
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
    status: "candidate"
  };
}

export function rankStageAccommodationCandidates(
  stage: AccommodationStageInput,
  routeGeometry: LineStringGeoJson,
  pois: AccommodationPoiInput[],
  limit = 3
) {
  const candidates = pois
    .filter((poi) => poi.category === "ACCOMMODATION")
    .map((poi) => toStageAccommodationCandidate(stage, routeGeometry, poi))
    .sort((a, b) => a.distanceToStageEndKm + a.distanceToRouteKm * 0.5 - (b.distanceToStageEndKm + b.distanceToRouteKm * 0.5));

  const needsLocalFallback = candidates.length === 0 || candidates[0].distanceToStageEndKm > 20;
  const withFallback = needsLocalFallback ? [createMockStageAccommodation(stage, routeGeometry), ...candidates] : candidates;

  return withFallback.slice(0, limit);
}

export function selectStageAccommodation(candidate: StageAccommodation, status: Exclude<AccommodationStatus, "candidate"> = "selected") {
  return {
    ...candidate,
    status
  };
}
