import { z } from "zod";

import {
  createElevationProfile,
  cumulativeDistances,
  haversineKm,
  pointAtDistance,
  routeDistanceKm,
  type ElevationPoint,
  type Position
} from "@/lib/geo";
import {
  parseBRouterConditionSegments,
  type RouteConditionSourceSegment
} from "@/lib/route-elevation-surface";
import {
  resolveRouteControlPoints,
  type CycleRouteCoverage,
  type CycleRouteNetwork,
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

type BRouterProfileConfiguration = {
  providerProfile: string;
  displayName: string;
  parameters: Record<string, string>;
  notice: string;
};

export const brouterProfileConfigurationByRoutingProfile: Record<RoutingProfile, BRouterProfileConfiguration> = {
  balanced: {
    providerProfile: "trekking",
    displayName: "trekking / ausgewogen",
    parameters: {
      "profile:consider_elevation": "1",
      "profile:ignore_cycleroutes": "1",
      "profile:stick_to_cycleroutes": "0"
    },
    notice: "Ausgewogene Trekkingroute ohne zusätzliche Bindung an ausgeschilderte Radroutennetze."
  },
  cycleways: {
    providerProfile: "safety",
    displayName: "safety / Fahrradwege",
    parameters: {},
    notice: "Das Profil safety bevorzugt sichere Wege und erfasste Fahrradinfrastruktur."
  },
  low_elevation: {
    providerProfile: "trekking",
    displayName: "trekking / wenig Steigung",
    parameters: {
      "profile:consider_elevation": "1",
      "profile:ignore_cycleroutes": "1",
      "profile:stick_to_cycleroutes": "0",
      "profile:uphillcost": "500",
      "profile:downhillcost": "500"
    },
    notice: "Das Trekkingprofil gewichtet Anstiege und Abfahrten stärker und bevorzugt dadurch höhenärmere Verbindungen."
  },
  touristic: {
    providerProfile: "trekking",
    displayName: "trekking / Radwanderwege",
    parameters: {
      "profile:consider_elevation": "1",
      "profile:ignore_cycleroutes": "0",
      "profile:stick_to_cycleroutes": "1"
    },
    notice: "Das Trekkingprofil bindet ausgeschilderte Radwanderwege aus dem OSM-Radroutennetz besonders stark ein."
  },
  sportive: {
    providerProfile: "fastbike",
    displayName: "fastbike / sportlich",
    parameters: {},
    notice: "Das Profil fastbike bevorzugt eine zügige, sportliche Fahrradroute."
  }
};

export const brouterProfileByRoutingProfile = Object.fromEntries(
  Object.entries(brouterProfileConfigurationByRoutingProfile).map(([profile, configuration]) => [
    profile,
    configuration.providerProfile
  ])
) as Record<RoutingProfile, string>;

const brouterCorridorConfiguration = {
  providerProfile: "shortest",
  parameters: {}
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

export type RoutedSegment = {
  coordinates: RoutedCoordinate[];
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  durationSeconds: number;
  cycleRouteCoverage: CycleRouteCoverage;
  routeConditionSourceSegments: RouteConditionSourceSegment[];
};

export type BRouterCoordinateRoute = Pick<
  RoutedSegment,
  "coordinates" | "distanceKm" | "elevationUp" | "elevationDown" | "durationSeconds"
>;

const cycleRouteNetworks: CycleRouteNetwork[] = ["icn", "ncn", "rcn", "lcn"];

function emptyCycleRouteCoverage(): CycleRouteCoverage {
  return {
    dataAvailable: false,
    analyzedDistanceKm: 0,
    bicycleInfrastructureDistanceKm: 0,
    bicycleInfrastructurePercent: 0,
    signedCycleRouteDistanceKm: 0,
    signedCycleRoutePercent: 0,
    networkDistanceKm: { icn: 0, ncn: 0, rcn: 0, lcn: 0 }
  };
}

function parseBRouterWayTags(value: unknown) {
  if (typeof value !== "string") {
    return new Map<string, string>();
  }

  return new Map(
    value
      .trim()
      .split(/\s+/)
      .map((entry) => {
        const separatorIndex = entry.indexOf("=");
        return separatorIndex > 0 ? [entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1)] : [entry, "yes"];
      })
  );
}

function isBicycleInfrastructure(tags: Map<string, string>) {
  if (tags.get("highway") === "cycleway" || tags.get("bicycle") === "designated") {
    return true;
  }

  return Array.from(tags.entries()).some(([key, value]) => {
    if (key !== "cycleway" && !key.startsWith("cycleway:")) {
      return false;
    }
    return !["", "no", "none", "separate", "unknown"].includes(value);
  });
}

export function analyzeBRouterCycleCoverage(messages: unknown, routeDistanceKm: number): CycleRouteCoverage {
  if (!Array.isArray(messages) || messages.length < 2 || !Array.isArray(messages[0])) {
    return emptyCycleRouteCoverage();
  }

  const header = messages[0].map(String);
  const distanceIndex = header.indexOf("Distance");
  const wayTagsIndex = header.indexOf("WayTags");
  if (distanceIndex < 0 || wayTagsIndex < 0) {
    return emptyCycleRouteCoverage();
  }

  let analyzedMeters = 0;
  let bicycleInfrastructureMeters = 0;
  let signedCycleRouteMeters = 0;
  const networkMeters: Record<CycleRouteNetwork, number> = { icn: 0, ncn: 0, rcn: 0, lcn: 0 };

  for (const row of messages.slice(1)) {
    if (!Array.isArray(row)) {
      continue;
    }

    const distanceMeters = numericProperty(row[distanceIndex]);
    if (distanceMeters === null || distanceMeters <= 0) {
      continue;
    }

    analyzedMeters += distanceMeters;
    const tags = parseBRouterWayTags(row[wayTagsIndex]);
    if (isBicycleInfrastructure(tags)) {
      bicycleInfrastructureMeters += distanceMeters;
    }

    const networks = cycleRouteNetworks.filter((network) => tags.get(`route_bicycle_${network}`) === "yes");
    if (networks.length > 0) {
      signedCycleRouteMeters += distanceMeters;
      for (const network of networks) {
        networkMeters[network] += distanceMeters;
      }
    }
  }

  const safeRouteMeters = Math.max(routeDistanceKm * 1000, analyzedMeters, 1);
  const toKm = (meters: number) => Number((meters / 1000).toFixed(3));
  const toPercent = (meters: number) => Number(Math.min(100, (meters / safeRouteMeters) * 100).toFixed(1));

  return {
    dataAvailable: analyzedMeters > 0,
    analyzedDistanceKm: toKm(analyzedMeters),
    bicycleInfrastructureDistanceKm: toKm(bicycleInfrastructureMeters),
    bicycleInfrastructurePercent: toPercent(bicycleInfrastructureMeters),
    signedCycleRouteDistanceKm: toKm(signedCycleRouteMeters),
    signedCycleRoutePercent: toPercent(signedCycleRouteMeters),
    networkDistanceKm: Object.fromEntries(
      cycleRouteNetworks.map((network) => [network, toKm(networkMeters[network])])
    ) as Record<CycleRouteNetwork, number>
  };
}

function combineCycleRouteCoverage(segments: RoutedSegment[], routeDistanceKm: number): CycleRouteCoverage {
  if (segments.length === 0 || segments.some((segment) => !segment.cycleRouteCoverage.dataAvailable)) {
    return emptyCycleRouteCoverage();
  }

  const bicycleInfrastructureDistanceKm = segments.reduce(
    (sum, segment) => sum + segment.cycleRouteCoverage.bicycleInfrastructureDistanceKm,
    0
  );
  const signedCycleRouteDistanceKm = segments.reduce(
    (sum, segment) => sum + segment.cycleRouteCoverage.signedCycleRouteDistanceKm,
    0
  );
  const percent = (distanceKm: number) => Number(Math.min(100, (distanceKm / Math.max(routeDistanceKm, 0.001)) * 100).toFixed(1));

  return {
    dataAvailable: true,
    analyzedDistanceKm: Number(
      segments.reduce((sum, segment) => sum + segment.cycleRouteCoverage.analyzedDistanceKm, 0).toFixed(3)
    ),
    bicycleInfrastructureDistanceKm: Number(bicycleInfrastructureDistanceKm.toFixed(3)),
    bicycleInfrastructurePercent: percent(bicycleInfrastructureDistanceKm),
    signedCycleRouteDistanceKm: Number(signedCycleRouteDistanceKm.toFixed(3)),
    signedCycleRoutePercent: percent(signedCycleRouteDistanceKm),
    networkDistanceKm: Object.fromEntries(
      cycleRouteNetworks.map((network) => [
        network,
        Number(segments.reduce((sum, segment) => sum + segment.cycleRouteCoverage.networkDistanceKm[network], 0).toFixed(3))
      ])
    ) as Record<CycleRouteNetwork, number>
  };
}

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
  const cycleRouteCoverage = analyzeBRouterCycleCoverage(feature.properties.messages, distanceKm);
  const routeConditionSourceSegments = parseBRouterConditionSegments(feature.properties.messages, distanceKm);

  return {
    coordinates,
    distanceKm,
    elevationUp,
    elevationDown,
    durationSeconds,
    cycleRouteCoverage,
    routeConditionSourceSegments
  };
}

function buildBRouterRequestUrl(
  baseUrl: string,
  start: Position,
  end: Position,
  configuration: Pick<BRouterProfileConfiguration, "providerProfile" | "parameters">
) {
  const url = new URL(baseUrl);
  const formatCoordinate = ([lon, lat]: Position) => `${lon.toFixed(6)},${lat.toFixed(6)}`;
  url.searchParams.set("lonlats", `${formatCoordinate(start)}|${formatCoordinate(end)}`);
  url.searchParams.set("profile", configuration.providerProfile);
  url.searchParams.set("alternativeidx", "0");
  url.searchParams.set("format", "geojson");
  for (const [key, value] of Object.entries(configuration.parameters)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export function buildBRouterUrl(baseUrl: string, start: Position, end: Position, profile: RoutingProfile) {
  return buildBRouterRequestUrl(baseUrl, start, end, brouterProfileConfigurationByRoutingProfile[profile]);
}

export function createRoutingAnchorsFromRoutedPath(coordinates: Position[], maxSegmentKm = 80) {
  if (coordinates.length < 2) {
    throw new RoutingProviderError("Der Fahrradrouting-Dienst hat keinen verwendbaren Korridor für die Segmentierung geliefert.");
  }

  const safeMaxSegmentKm = Number.isFinite(maxSegmentKm) && maxSegmentKm >= 10 ? maxSegmentKm : 80;
  const totalDistanceKm = routeDistanceKm(coordinates);
  const sectionCount = Math.max(1, Math.ceil(totalDistanceKm / safeMaxSegmentKm));
  const sectionDistanceKm = totalDistanceKm / sectionCount;

  return Array.from({ length: sectionCount + 1 }, (_, index) => {
    if (index === 0) {
      return coordinates[0];
    }
    if (index === sectionCount) {
      return coordinates[coordinates.length - 1];
    }
    return pointAtDistance(coordinates, sectionDistanceKm * index);
  });
}

async function fetchBRouterSegment(
  start: Position,
  end: Position,
  profile: RoutingProfile,
  options: Required<Pick<RoadRoutingOptions, "baseUrl" | "timeoutMs" | "fetcher">>,
  configuration: Pick<BRouterProfileConfiguration, "providerProfile" | "parameters"> =
    brouterProfileConfigurationByRoutingProfile[profile]
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const url = buildBRouterRequestUrl(options.baseUrl, start, end, configuration);

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

export async function calculateBRouterCoordinateRoute(
  start: Position,
  end: Position,
  profile: RoutingProfile,
  options: RoadRoutingOptions = {}
): Promise<BRouterCoordinateRoute> {
  const configuredTimeoutMs = Number(process.env.ROUTING_TIMEOUT_MS ?? 60_000);
  return fetchBRouterSegment(start, end, profile, {
    baseUrl: options.baseUrl ?? process.env.BROUTER_BASE_URL ?? "https://brouter.de/brouter",
    timeoutMs: options.timeoutMs ?? (Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : 60_000),
    fetcher: options.fetcher ?? fetch
  });
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchRoutedSections(
  start: Position,
  end: Position,
  profile: RoutingProfile,
  options: Required<Pick<RoadRoutingOptions, "baseUrl" | "timeoutMs" | "fetcher">>,
  maxSegmentKm: number
) {
  const directDistanceKm = haversineKm(start, end);
  const corridorUsesSelectedProfile = directDistanceKm <= maxSegmentKm;
  let routedCorridor: RoutedSegment;

  try {
    routedCorridor = await fetchBRouterSegment(
      start,
      end,
      profile,
      options,
      corridorUsesSelectedProfile ? brouterProfileConfigurationByRoutingProfile[profile] : brouterCorridorConfiguration
    );
  } catch (error) {
    if (directDistanceKm <= maxSegmentKm) {
      throw error;
    }
    throw new RoutingProviderError(
      `Die lange Verbindung konnte nicht zuerst als routbarer Korridor berechnet werden. Es wurden keine frei erzeugten Luftlinien-Hilfspunkte gesetzt. Bitte ein nachvollziehbares Zwischenziel ergänzen. Ursache: ${
        error instanceof Error ? error.message : "Routing fehlgeschlagen."
      }`
    );
  }

  if (routedCorridor.distanceKm <= maxSegmentKm) {
    if (corridorUsesSelectedProfile) {
      return [routedCorridor];
    }
    return [await fetchBRouterSegment(start, end, profile, options)];
  }

  const routedCoordinates = routedCorridor.coordinates.map(([lon, lat]) => [lon, lat] satisfies Position);
  const anchors = createRoutingAnchorsFromRoutedPath(routedCoordinates, maxSegmentKm);

  return mapWithConcurrency(
    Array.from({ length: anchors.length - 1 }, (_, offset) => offset + 1),
    4,
    async (index) => {
      try {
        return await fetchBRouterSegment(anchors[index - 1], anchors[index], profile, options);
      } catch (error) {
        throw new RoutingProviderError(
          `Die Segmentierung entlang des zuvor berechneten routbaren Korridors ist in Teil ${index}/${anchors.length - 1} fehlgeschlagen. Es wurde keine Luftlinie ergänzt: ${
            error instanceof Error ? error.message : "Routing fehlgeschlagen."
          }`
        );
      }
    }
  );
}

function createRoutedElevationProfile(coordinates: RoutedCoordinate[], maxPoints = 480) {
  const twoDimensionalCoordinates = coordinates.map(([lon, lat]) => [lon, lat] satisfies Position);
  const distances = cumulativeDistances(twoDimensionalCoordinates);
  const hasCompleteElevation = coordinates.every((coordinate) => Number.isFinite(coordinate[2]));
  const fallbackProfile = hasCompleteElevation ? null : createElevationProfile(twoDimensionalCoordinates);
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

  return { profile, isEstimated: !hasCompleteElevation };
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
  const legs = await mapWithConcurrency(
    Array.from({ length: controlPoints.length - 1 }, (_, offset) => offset + 1),
    2,
    async (index) => {
      try {
        return await fetchRoutedSections(
          controlPoints[index - 1],
          controlPoints[index],
          profile,
          routingOptions,
          routingOptions.maxSegmentKm
        );
      } catch (error) {
        const section = `${orderedNames[index - 1]} - ${orderedNames[index]}`;
        throw new RoutingProviderError(`${section}: ${error instanceof Error ? error.message : "Routing fehlgeschlagen."}`);
      }
    }
  );

  const segments: RoutedSegment[] = legs.flat();
  const snappedControlPoints: RoutedCoordinate[] = [];
  for (const [legIndex, sectionSegments] of legs.entries()) {
    if (legIndex === 0) {
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
  const brouterProfile = brouterProfileConfigurationByRoutingProfile[profile];
  const distanceKm = Number(segments.reduce((sum, segment) => sum + segment.distanceKm, 0).toFixed(1));
  const cycleRouteCoverage = combineCycleRouteCoverage(segments, distanceKm);
  const routedElevation = createRoutedElevationProfile(coordinates);
  let conditionOffsetKm = 0;
  const routeConditionSourceSegments = segments.flatMap((segment, segmentIndex) => {
    const offset = conditionOffsetKm;
    conditionOffsetKm += segment.distanceKm;
    return segment.routeConditionSourceSegments.map((source, sourceIndex) => ({
      ...source,
      id: `brouter-section-${segmentIndex + 1}-${sourceIndex + 1}`,
      startKm: Number((offset + source.startKm).toFixed(4)),
      endKm: Number((offset + source.endKm).toFixed(4)),
      tags: { ...(source.tags ?? {}) }
    }));
  });

  return {
    name: `${input.start.trim()} nach ${input.end.trim()}`,
    startName: input.start.trim(),
    endName: input.end.trim(),
    profile,
    distanceKm,
    elevationUp: Math.round(segments.reduce((sum, segment) => sum + segment.elevationUp, 0)),
    elevationDown: Math.round(segments.reduce((sum, segment) => sum + segment.elevationDown, 0)),
    durationHours: Number((segments.reduce((sum, segment) => sum + segment.durationSeconds, 0) / 3600).toFixed(2)),
    geometryGeoJson: {
      type: "LineString",
      coordinates: geometryCoordinates
    },
    elevationProfile: routedElevation.profile,
    elevationSource: routedElevation.isEstimated ? "estimated" : "provider",
    waypoints: orderedNames.map((name, order) => {
      const [lon, lat] = snappedControlPoints[order];
      return { order, name, lat, lon };
    }),
    routingProvider: "brouter",
    routingProfileName: brouterProfile.displayName,
    routingAttribution: "BRouter / OpenStreetMap-Mitwirkende",
    routingDataNotice: `Reale Fahrradroute auf Basis von OpenStreetMap. ${brouterProfile.notice}`,
    cycleRouteCoverage,
    routeConditionSourceSegments
  };
}
