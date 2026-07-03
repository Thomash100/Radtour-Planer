import { PoiCategory } from "@prisma/client";

import { distancePointToLineKm, type LineStringGeoJson, type Position } from "@/lib/geo";
import type { RoutePoi } from "@/lib/route-pois";

const defaultOverpassEndpoint = "https://overpass-api.de/api/interpreter";
const overpassAccommodationTypes = [
  "hotel",
  "guest_house",
  "hostel",
  "motel",
  "camp_site",
  "caravan_site",
  "apartment",
  "chalet",
  "bed_and_breakfast",
  "alpine_hut",
  "wilderness_hut"
] as const;

export type OsmAccommodationFetchOptions = {
  corridorKm: number;
  endpoint?: string;
  timeoutMs?: number;
  maxSamplePoints?: number;
};

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OsmElement[];
  remark?: string;
};

export type OsmAccommodationFetchResult = {
  pois: RoutePoi[];
  source: "openstreetmap";
  warning?: string;
};

function boundedNumber(value: number, fallback: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function sampledRouteCoordinates(geometry: LineStringGeoJson, maxSamplePoints: number): Position[] {
  const coordinates = geometry.coordinates.filter((coordinate) => Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]));
  if (coordinates.length <= maxSamplePoints) {
    return coordinates;
  }

  const step = (coordinates.length - 1) / (maxSamplePoints - 1);
  return Array.from({ length: maxSamplePoints }, (_, index) => coordinates[Math.round(index * step)]);
}

export function buildOverpassAccommodationQuery(geometry: LineStringGeoJson, corridorKm: number, maxSamplePoints = 14) {
  const searchRadiusM = Math.round(boundedNumber(corridorKm, 8, 2, 15) * 1000);
  const tourismSelector = overpassAccommodationTypes.join("|");
  const coordinateClauses = sampledRouteCoordinates(geometry, maxSamplePoints)
    .map(([lon, lat]) => {
      const coordinate = `${lat.toFixed(6)},${lon.toFixed(6)}`;
      return [
        `node["tourism"~"^(${tourismSelector})$"](around:${searchRadiusM},${coordinate});`,
        `way["tourism"~"^(${tourismSelector})$"](around:${searchRadiusM},${coordinate});`,
        `relation["tourism"~"^(${tourismSelector})$"](around:${searchRadiusM},${coordinate});`
      ].join("\n");
    })
    .join("\n");

  return `[out:json][timeout:10];\n(\n${coordinateClauses}\n);\nout center tags;`;
}

function tagValue(tags: Record<string, string> | undefined, key: string) {
  const value = tags?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstTag(tags: Record<string, string> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = tagValue(tags, key);
    if (value) {
      return value;
    }
  }
  return null;
}

function normalizeAddress(tags: Record<string, string> | undefined) {
  const street = tagValue(tags, "addr:street");
  const houseNumber = tagValue(tags, "addr:housenumber");
  const postcode = tagValue(tags, "addr:postcode");
  const city = tagValue(tags, "addr:city") ?? tagValue(tags, "addr:place");

  const line1 = [street, houseNumber].filter(Boolean).join(" ");
  const line2 = [postcode, city].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ") || null;
}

function accommodationTypeLabel(tourism: string | null) {
  if (tourism === "hotel") return "Hotel";
  if (tourism === "guest_house" || tourism === "bed_and_breakfast") return "Pension/Gästehaus";
  if (tourism === "hostel") return "Hostel";
  if (tourism === "motel") return "Motel";
  if (tourism === "camp_site" || tourism === "caravan_site") return "Camping";
  if (tourism === "apartment" || tourism === "chalet") return "Ferienwohnung";
  if (tourism === "alpine_hut" || tourism === "wilderness_hut") return "Hütte";
  return "Unterkunft";
}

function elementCoordinate(element: OsmElement): Position | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  return [Number(lon), Number(lat)];
}

export function osmElementToRoutePoi(element: OsmElement, geometry: LineStringGeoJson): RoutePoi | null {
  const coordinate = elementCoordinate(element);
  if (!coordinate) {
    return null;
  }

  const tags = element.tags ?? {};
  const name = tagValue(tags, "name") ?? `${accommodationTypeLabel(tagValue(tags, "tourism"))} ohne Namen`;
  const osmId = `${element.type}/${element.id}`;
  const website = firstTag(tags, ["website", "contact:website", "url"]);
  const phone = firstTag(tags, ["phone", "contact:phone"]);
  const email = firstTag(tags, ["email", "contact:email"]);
  const tourism = tagValue(tags, "tourism");

  return {
    id: `osm_${element.type}_${element.id}`,
    name,
    category: PoiCategory.ACCOMMODATION,
    lat: coordinate[1],
    lon: coordinate[0],
    address: normalizeAddress(tags),
    phone,
    website,
    source: "osm-overpass",
    osmId,
    partnerId: null,
    tagsJson: {
      ...tags,
      dataSource: "openstreetmap",
      accommodationType: accommodationTypeLabel(tourism),
      email,
      phone,
      website
    },
    partner: null,
    distanceToRouteKm: Number(distancePointToLineKm(coordinate, geometry.coordinates).toFixed(2))
  };
}

export async function fetchOsmAccommodationPois(
  geometry: LineStringGeoJson,
  options: OsmAccommodationFetchOptions
): Promise<OsmAccommodationFetchResult> {
  const endpoint = options.endpoint ?? process.env.OVERPASS_API_URL ?? defaultOverpassEndpoint;
  const timeoutMs = boundedNumber(options.timeoutMs ?? 3500, 3500, 1000, 12000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const query = buildOverpassAccommodationQuery(geometry, options.corridorKm, options.maxSamplePoints ?? 14);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json"
      },
      body: new URLSearchParams({ data: query }).toString(),
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 }
    });

    if (!response.ok) {
      return { pois: [], source: "openstreetmap", warning: `OSM-Unterkunftsdaten nicht geladen: HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as OverpassResponse;
    const seen = new Set<string>();
    const pois = (payload.elements ?? [])
      .map((element) => osmElementToRoutePoi(element, geometry))
      .filter((poi): poi is RoutePoi => Boolean(poi))
      .filter((poi) => {
        if (seen.has(poi.osmId ?? poi.id)) {
          return false;
        }
        seen.add(poi.osmId ?? poi.id);
        return true;
      });

    return {
      pois,
      source: "openstreetmap",
      warning: payload.remark ? "OpenStreetMap/Overpass hat eine Warnung geliefert; Daten bitte stichprobenartig prüfen." : undefined
    };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Zeitüberschreitung bei Overpass." : "Overpass-Abfrage fehlgeschlagen.";
    return { pois: [], source: "openstreetmap", warning: `OSM-Unterkunftsdaten nicht geladen: ${message}` };
  } finally {
    clearTimeout(timeout);
  }
}
