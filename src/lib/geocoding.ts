import type { Position } from "@/lib/geo";
import { enrichDemoWaypoints, resolveMockPlace, type RoutingProfile } from "@/lib/mock-routing";

export class GeocodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeocodingError";
  }
}

type GeocodeCacheEntry = {
  expiresAt: number;
  coordinate: Position;
};

const geocodeCache = new Map<string, GeocodeCacheEntry>();
const cacheTtlMs = 24 * 60 * 60 * 1000;

// Nominatim usage policy caps public-instance traffic at roughly one request per second.
const minRequestGapMs = 1_100;
let lastRequestAt = 0;
let requestQueue: Promise<unknown> = Promise.resolve();

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

async function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = async () => {
    const waitMs = Math.max(0, lastRequestAt + minRequestGapMs - Date.now());
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    lastRequestAt = Date.now();
    return task();
  };

  const scheduled = requestQueue.then(run, run);
  requestQueue = scheduled.catch(() => undefined);
  return scheduled;
}

async function fetchNominatimCoordinate(place: string): Promise<Position | null> {
  const baseUrl = process.env.NOMINATIM_BASE_URL?.trim() || "https://nominatim.openstreetmap.org/search";
  const timeoutMs = boundedNumber(process.env.GEOCODING_TIMEOUT_MS, 5_000, 1_000, 15_000);
  const url = new URL(baseUrl);
  url.searchParams.set("q", place);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await throttled(() =>
      fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Radtour-Planer-MVP/0.3 (+https://github.com/Thomash100/Radtour-Planer)"
        },
        signal: controller.signal
      })
    );

    if (!response.ok) {
      return null;
    }

    const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const [first] = results;
    const lat = Number(first?.lat);
    const lon = Number(first?.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Resolves a place name to a coordinate. Known demo/MVP cities are matched
 * locally first (fast, no network call); everything else is looked up via
 * Nominatim (OpenStreetMap) so real-world tours are not limited to the
 * built-in city list.
 */
export async function geocodePlace(place: string): Promise<Position> {
  const known = resolveMockPlace(place);
  if (known.ok) {
    return known.coordinate;
  }

  const cached = geocodeCache.get(known.normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.coordinate;
  }

  const label = place.trim() || "unbekannter Ort";
  if (!known.normalized) {
    throw new GeocodingError(`Ort nicht gefunden: "${label}".`);
  }

  const coordinate = await fetchNominatimCoordinate(place);
  if (!coordinate) {
    throw new GeocodingError(
      `Ort nicht gefunden: "${label}". Bitte Schreibweise pruefen oder genauer eingrenzen, z. B. mit Land oder Region.`
    );
  }

  geocodeCache.set(known.normalized, { expiresAt: Date.now() + cacheTtlMs, coordinate });
  return coordinate;
}

export type ResolvedControlPoints = {
  profile: RoutingProfile;
  orderedNames: string[];
  controlPoints: Position[];
};

/**
 * Real-routing counterpart to mock-routing's resolveRouteControlPoints:
 * same demo-corridor waypoint enrichment, but geocodes every place through
 * geocodePlace instead of only the fixed known-places list.
 */
export async function resolveGeocodedControlPoints(input: {
  start: string;
  end: string;
  waypoints?: string[];
  profile?: RoutingProfile;
}): Promise<ResolvedControlPoints> {
  const profile = input.profile ?? "balanced";
  const inputWaypoints = (input.waypoints ?? []).map((waypoint) => waypoint.trim()).filter(Boolean);
  const routeWaypoints = enrichDemoWaypoints(input.start, input.end, inputWaypoints);
  const orderedNames = [input.start.trim(), ...routeWaypoints, input.end.trim()];

  const controlPoints: Position[] = [];
  for (const name of orderedNames) {
    controlPoints.push(await geocodePlace(name));
  }

  return { profile, orderedNames, controlPoints };
}
