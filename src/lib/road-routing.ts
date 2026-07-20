import { z } from "zod";

import {
  createElevationProfile,
  cumulativeDistances,
  haversineKm,
  routeDistanceKm,
  type ElevationPoint,
  type Position
} from "@/lib/geo";
import {
  resolveRouteControlPoints,
  type RouteCalculation,
  type RouteCalculationInput,
  type RoutingProfile
} from "@/lib/mock-routing";

type RoutedCoordinate = [number, number, number?];
type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const brouterFeatureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.record(z.unknown()).optional().default({}),
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.array(z.number()).min(2)).min(2)
  })
});

const brouterResponseSchema = z.union([
  brouterFeatureSchema,
  z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(brouterFeatureSchema).min(1)
  })
]);

export const brouterProfileByRoutingProfile: Record<RoutingProfile, string> = {
  balanced: "trekking",
  cycleways: "trekking",
  low_elevation: "trekking",
  touristic: "trekking",
  sportive: "fastbike"
};

const fallbackSpeedKmh: Record<RoutingProfile, number> = {
  balanced: 18,
  cycleways: 17,
  low_elevation: 16,
  touristic: 15,
  sportive: 23
};

export class RoutingProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutingProviderError";
  }
}

export type RoadRoutingOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  maxSegmentKm?: number;
  fetcher?: Fetcher;
};

type RoutedSegment = {
  coordinates: RoutedCoordinate[];
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  durationSeconds: number;
};

function numericProperty(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function routedCoordinates(value: number[][]): RoutedCoordinate[] {
  return value.map((coordinate) => [coordinate[0], coordinate[1], coordinate[2]]);
}

function elevationGainLoss(coordinates: RoutedCoordinate[]) {
  let up = 0;
  let down = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1][2];
    const current = coordinates[index][2];
    if (!Number.isFinite(previous) || !Number.isFinite(current)) {
      continue;
    }

    const difference = Number(current) - Number(previous);
    if (difference > 0) {
      up += difference;
    } else {
      down += Math.abs(difference);
    }
  }

  return { up, down };
}

function parseBRouterPayload(payload: unknown, profile: RoutingProfile): RoutedSegment {
  const parsed = brouterResponseSchema.parse(payload);
  const feature = parsed.type === "FeatureCollection" ? parsed.features[0] : parsed;
  const coordinates = routedCoordinates(feature.geometry.coordinates);
  const twoDimensionalCoordinates = coordinates.map(([lon, lat]) => [lon, lat] satisfies Position);
  const calculatedElevation = elevationGainLoss(coordinates);
  const startElevation = coordinates[0][2];
  const endElevation = coordinates[coordinates.length - 1][2];
  const filteredAscent = numericProperty(feature.properties["filtered ascend"]);
  const elevationUp = filteredAscent ?? calculatedElevation.up;
  const elevationDown =
    filteredAscent !== null && Number.isFinite(startElevation) && Number.isFinite(endElevation)
      ? Math.max(0, filteredAscent + Number(startElevation) - Number(endElevation))
      : calculatedElevation.down;
  const distanceKm = (numericProperty(feature.properties["track-length"]) ?? routeDistanceKm(twoDimensionalCoordinates) * 1000) / 1000;
  const durationSeconds =
    numericProperty(feature.properties["total-time"]) ?? (distanceKm / fallbackSpeedKmh[profile]) * 60 * 60;

  return {
    coordinates,
    distanceKm,
    elevationUp,
    elevationDown,
    durationSeconds
  };
}

export function buildBRouterUrl(baseUrl: string, start: Position, end: Position, profile: RoutingProfile) {
  const url = new URL(baseUrl);
  const formatCoordinate = ([lon, lat]: Position) => `${lon.toFixed(6)},${lat.toFixed(6)}`;
  url.searchParams.set("lonlats", `${formatCoordinate(start)}|${formatCoordinate(end)}`);
  url.searchParams.set("profile", brouterProfileByRoutingProfile[profile]);
  url.searchParams.set("alternativeidx", "0");
  url.searchParams.set("format", "geojson");
  return url;
}

export function createRoutingAnchors(start: Position, end: Position, maxSegmentKm = 80) {
  const safeMaxSegmentKm = Number.isFinite(maxSegmentKm) && maxSegmentKm >= 10 ? maxSegmentKm : 80;
  const sectionCount = Math.max(1, Math.ceil(haversineKm(start, end) / safeMaxSegmentKm));

  return Array.from({ length: sectionCount + 1 }, (_, index) => {
    const ratio = index / sectionCount;
    return [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio] satisfies Position;
  });
}

async function fetchBRouterSegment(
  start: Position,
  end: Position,
  profile: RoutingProfile,
  options: Required<Pick<RoadRoutingOptions, "baseUrl" | "timeoutMs" | "fetcher">>
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const url = buildBRouterUrl(options.baseUrl, start, end, profile);

  try {
    const response = await options.fetcher(url, {
      headers: {
        Accept: "application/geo+json, application/json",
        "User-Agent": "Radtour-Planer-MVP/0.3 (+https://github.com/Thomash100/Radtour-Planer)"
      },
      signal: controller.signal
    });
    const body = await response.text();

    if (!response.ok) {
      const providerMessage = body.replace(/\s+/g, " ").trim().slice(0, 240);
      throw new RoutingProviderError(
        `Der Fahrradrouting-Dienst antwortet mit HTTP ${response.status}${providerMessage ? `: ${providerMessage}` : "."}`
      );
    }

    try {
      return parseBRouterPayload(JSON.parse(body), profile);
    } catch (error) {
      if (error instanceof RoutingProviderError) {
        throw error;
      }
      throw new RoutingProviderError("Der Fahrradrouting-Dienst hat keine verwendbare Routengeometrie geliefert.");
    }
  } catch (error) {
    if (error instanceof RoutingProviderError) {
      throw error;
    }
    if (controller.signal.aborted) {
      throw new RoutingProviderError(`Der Fahrradrouting-Dienst hat nach ${Math.round(options.timeoutMs / 1000)} Sekunden nicht geantwortet.`);
    }
    throw new RoutingProviderError(
      `Der Fahrradrouting-Dienst ist derzeit nicht erreichbar: ${error instanceof Error ? error.message : "unbekannter Netzwerkfehler"}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

function createRoutedElevationProfile(coordinates: RoutedCoordinate[], maxPoints = 480): ElevationPoint[] {
  const twoDimensionalCoordinates = coordinates.map(([lon, lat]) => [lon, lat] satisfies Position);
  const distances = cumulativeDistances(twoDimensionalCoordinates);
  const hasElevation = coordinates.some((coordinate) => Number.isFinite(coordinate[2]));
  const fallbackProfile = hasElevation ? null : createElevationProfile(twoDimensionalCoordinates);
  const sampleStep = Math.max(1, Math.ceil(coordinates.length / maxPoints));
  const profile: ElevationPoint[] = [];

  for (let index = 0; index < coordinates.length; index += sampleStep) {
    profile.push({
      distanceKm: Number((distances[index] ?? 0).toFixed(2)),
      elevationM: Math.round(Number.isFinite(coordinates[index][2]) ? Number(coordinates[index][2]) : fallbackProfile?.[index].elevationM ?? 0)
    });
  }

  const lastIndex = coordinates.length - 1;
  const lastDistance = Number((distances[lastIndex] ?? 0).toFixed(2));
  if (profile[profile.length - 1]?.distanceKm !== lastDistance) {
    profile.push({
      distanceKm: lastDistance,
      elevationM: Math.round(
        Number.isFinite(coordinates[lastIndex][2]) ? Number(coordinates[lastIndex][2]) : fallbackProfile?.[lastIndex].elevationM ?? 0
      )
    });
  }

  return profile;
}

export async function calculateRoadRoute(input: RouteCalculationInput, options: RoadRoutingOptions = {}): Promise<RouteCalculation> {
  const { profile, orderedNames, controlPoints } = resolveRouteControlPoints(input);
  const configuredTimeoutMs = Number(process.env.ROUTING_TIMEOUT_MS ?? 60_000);
  const configuredMaxSegmentKm = Number(process.env.ROUTING_MAX_SEGMENT_KM ?? 80);
  const routingOptions = {
    baseUrl: options.baseUrl ?? process.env.BROUTER_BASE_URL ?? "https://brouter.de/brouter",
    timeoutMs: options.timeoutMs ?? (Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : 60_000),
    maxSegmentKm:
      options.maxSegmentKm ?? (Number.isFinite(configuredMaxSegmentKm) && configuredMaxSegmentKm >= 10 ? configuredMaxSegmentKm : 80),
    fetcher: options.fetcher ?? fetch
  };
  const segments: RoutedSegment[] = [];
  const snappedControlPoints: RoutedCoordinate[] = [];

  for (let index = 1; index < controlPoints.length; index += 1) {
    const anchors = createRoutingAnchors(controlPoints[index - 1], controlPoints[index], routingOptions.maxSegmentKm);
    const sectionSegments: RoutedSegment[] = [];

    for (let anchorIndex = 1; anchorIndex < anchors.length; anchorIndex += 1) {
      try {
        const segment = await fetchBRouterSegment(anchors[anchorIndex - 1], anchors[anchorIndex], profile, routingOptions);
        segments.push(segment);
        sectionSegments.push(segment);
      } catch (error) {
        const section = `${orderedNames[index - 1]} - ${orderedNames[index]}`;
        const part = anchors.length > 2 ? ` (Teil ${anchorIndex}/${anchors.length - 1})` : "";
        throw new RoutingProviderError(`${section}${part}: ${error instanceof Error ? error.message : "Routing fehlgeschlagen."}`);
      }
    }

    if (index === 1) {
      snappedControlPoints.push(sectionSegments[0].coordinates[0]);
    }
    const lastSection = sectionSegments[sectionSegments.length - 1];
    snappedControlPoints.push(lastSection.coordinates[lastSection.coordinates.length - 1]);
  }

  const coordinates: RoutedCoordinate[] = [];
  for (const [index, segment] of segments.entries()) {
    if (index === 0) {
      coordinates.push(...segment.coordinates);
      continue;
    }

    const previousEndpoint = coordinates[coordinates.length - 1];
    const nextStartpoint = segment.coordinates[0];
    const gapKm = haversineKm([previousEndpoint[0], previousEndpoint[1]], [nextStartpoint[0], nextStartpoint[1]]);
    if (gapKm > 0.05) {
      throw new RoutingProviderError(
        `Der Fahrradrouting-Dienst hat zwischen zwei Abschnitten eine Lücke von ${(gapKm * 1000).toFixed(0)} m geliefert. Die Route wurde nicht als Luftlinie ergänzt.`
      );
    }
    coordinates.push(...segment.coordinates.slice(1));
  }

  if (coordinates.length < 2) {
    throw new RoutingProviderError("Der Fahrradrouting-Dienst hat keine Route geliefert.");
  }

  const geometryCoordinates = coordinates.map(([lon, lat]) => [lon, lat] satisfies Position);
  const brouterProfile = brouterProfileByRoutingProfile[profile];

  return {
    name: `${input.start.trim()} nach ${input.end.trim()}`,
    startName: input.start.trim(),
    endName: input.end.trim(),
    profile,
    distanceKm: Number(segments.reduce((sum, segment) => sum + segment.distanceKm, 0).toFixed(1)),
    elevationUp: Math.round(segments.reduce((sum, segment) => sum + segment.elevationUp, 0)),
    elevationDown: Math.round(segments.reduce((sum, segment) => sum + segment.elevationDown, 0)),
    durationHours: Number((segments.reduce((sum, segment) => sum + segment.durationSeconds, 0) / 3600).toFixed(2)),
    geometryGeoJson: {
      type: "LineString",
      coordinates: geometryCoordinates
    },
    elevationProfile: createRoutedElevationProfile(coordinates),
    waypoints: orderedNames.map((name, order) => {
      const [lon, lat] = snappedControlPoints[order];
      return { order, name, lat, lon };
    }),
    routingProvider: "brouter",
    routingProfileName: brouterProfile,
    routingAttribution: "BRouter / OpenStreetMap-Mitwirkende",
    routingDataNotice: `Reale Fahrradroute über BRouter (${brouterProfile}) auf Basis von OpenStreetMap.`
  };
}
