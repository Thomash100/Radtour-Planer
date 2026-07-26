import { PoiCategory } from "@prisma/client";

import { pointAtDistance, routeDistanceKm, type LineStringGeoJson } from "@/lib/geo";
import { fetchOsmAccommodationPois } from "@/lib/osm-accommodation-pois";
import { withDistanceToRoute, type RoutePoi } from "@/lib/route-pois";

export type AccommodationProviderSearch = {
  routeId: string;
  geometry: LineStringGeoJson;
  corridorKm: number;
};

export type AccommodationProviderResult = {
  pois: RoutePoi[];
  provider: string;
  attribution?: string;
  warning?: string;
  cached?: boolean;
};

export interface AccommodationProvider {
  readonly name: string;
  search(input: AccommodationProviderSearch): Promise<AccommodationProviderResult>;
}

type CacheEntry = {
  expiresAt: number;
  result: AccommodationProviderResult;
};

const providerCache = new Map<string, CacheEntry>();

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function cacheKey(provider: string, input: AccommodationProviderSearch) {
  const coordinates = input.geometry.coordinates;
  const first = coordinates[0] ?? [0, 0];
  const last = coordinates.at(-1) ?? [0, 0];
  return [provider, input.routeId, input.corridorKm.toFixed(1), coordinates.length, first.join(","), last.join(",")].join(":");
}

abstract class ConfiguredOsmProvider implements AccommodationProvider {
  abstract readonly name: string;

  constructor(
    private readonly endpoint: string | undefined,
    private readonly timeoutMs: number,
    private readonly cacheTtlMs: number
  ) {}

  async search(input: AccommodationProviderSearch): Promise<AccommodationProviderResult> {
    if (!this.endpoint?.trim()) {
      return {
        pois: [],
        provider: this.name,
        warning: "Unterkunftsdatenquelle nicht konfiguriert. Lokale POI bleiben verfügbar."
      };
    }

    const key = cacheKey(this.name, input);
    const cached = providerCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.result, cached: true };
    }

    const result = await fetchOsmAccommodationPois(input.geometry, {
      corridorKm: input.corridorKm,
      endpoint: this.endpoint,
      timeoutMs: this.timeoutMs,
      maxSamplePoints: 14
    });
    const providerResult: AccommodationProviderResult = {
      pois: result.pois,
      provider: this.name,
      attribution: result.pois.length > 0 ? "© OpenStreetMap-Mitwirkende (ODbL)" : undefined,
      warning: result.warning
    };
    providerCache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, result: providerResult });
    return providerResult;
  }
}

export class DevelopmentProvider extends ConfiguredOsmProvider {
  readonly name = "development";

  constructor(options: { endpoint?: string; timeoutMs?: number; cacheTtlMs?: number } = {}) {
    super(
      options.endpoint ?? process.env.OVERPASS_API_URL,
      boundedNumber(options.timeoutMs ?? process.env.ACCOMMODATION_TIMEOUT_MS, 4_000, 1_000, 12_000),
      boundedNumber(options.cacheTtlMs ?? process.env.ACCOMMODATION_CACHE_TTL_MS, 300_000, 10_000, 86_400_000)
    );
  }
}

export class ProductionProvider extends ConfiguredOsmProvider {
  readonly name = "production";

  constructor(options: { endpoint?: string; timeoutMs?: number; cacheTtlMs?: number } = {}) {
    super(
      options.endpoint ?? process.env.ACCOMMODATION_API_URL,
      boundedNumber(options.timeoutMs ?? process.env.ACCOMMODATION_TIMEOUT_MS, 4_000, 1_000, 12_000),
      boundedNumber(options.cacheTtlMs ?? process.env.ACCOMMODATION_CACHE_TTL_MS, 900_000, 10_000, 86_400_000)
    );
  }
}

export class LocalTestProvider implements AccommodationProvider {
  readonly name = "local-test";

  async search(input: AccommodationProviderSearch): Promise<AccommodationProviderResult> {
    const distanceKm = routeDistanceKm(input.geometry.coordinates);
    if (distanceKm <= 0) {
      return { pois: [], provider: this.name };
    }

    const [lon, lat] = pointAtDistance(input.geometry.coordinates, distanceKm * 0.8);
    const poi = withDistanceToRoute(
      [
        {
          id: `local-test-accommodation-${input.routeId}`,
          name: "Lokale Test-Pension",
          category: PoiCategory.ACCOMMODATION,
          lat: lat + 0.001,
          lon: lon + 0.001,
          address: "Nur explizit aktivierte Entwicklungsdaten",
          phone: null,
          website: null,
          source: "local-test",
          osmId: null,
          partnerId: null,
          tagsJson: {
            testData: true,
            accommodationType: "pension",
            bikeParking: true
          },
          partner: null
        }
      ],
      input.geometry
    ) as RoutePoi[];

    return {
      pois: poi,
      provider: this.name,
      warning: "Explizit aktivierter LocalTestProvider: Daten sind nicht produktiv."
    };
  }
}

export class DisabledAccommodationProvider implements AccommodationProvider {
  readonly name = "disabled";

  async search(): Promise<AccommodationProviderResult> {
    return {
      pois: [],
      provider: this.name,
      warning: "Externe Unterkunftsdaten sind deaktiviert. Lokale POI bleiben verfügbar."
    };
  }
}

export function createAccommodationProvider(
  environment: Record<string, string | undefined> = process.env
): AccommodationProvider {
  const configured = environment.ACCOMMODATION_PROVIDER?.trim().toLowerCase();
  if (configured === "local-test") {
    return new LocalTestProvider();
  }
  if (configured === "disabled") {
    return new DisabledAccommodationProvider();
  }
  if (configured === "development") {
    return new DevelopmentProvider({ endpoint: environment.OVERPASS_API_URL });
  }
  if (configured === "production") {
    return new ProductionProvider({ endpoint: environment.ACCOMMODATION_API_URL });
  }
  return environment.NODE_ENV === "production"
    ? new ProductionProvider({ endpoint: environment.ACCOMMODATION_API_URL })
    : new DevelopmentProvider({ endpoint: environment.OVERPASS_API_URL });
}

export function clearAccommodationProviderCache() {
  providerCache.clear();
}
