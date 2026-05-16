import { createElevationProfile, haversineKm, routeDistanceKm, type LineStringGeoJson, type Position } from "@/lib/geo";

export type RoutingProfile = "balanced" | "cycleways" | "low_elevation" | "touristic" | "sportive";

export type RouteCalculationInput = {
  start: string;
  end: string;
  waypoints?: string[];
  profile?: RoutingProfile;
};

export type RouteCalculation = {
  name: string;
  startName: string;
  endName: string;
  profile: RoutingProfile;
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  durationHours: number;
  geometryGeoJson: LineStringGeoJson;
  elevationProfile: ReturnType<typeof createElevationProfile>;
  waypoints: Array<{
    order: number;
    name: string;
    lat: number;
    lon: number;
  }>;
};

const knownPlaces: Record<string, Position> = {
  munchen: [11.5761, 48.1372],
  muenchen: [11.5761, 48.1372],
  munich: [11.5761, 48.1372],
  rosenheim: [12.1264, 47.8561],
  traunstein: [12.6421, 47.8685],
  salzburg: [13.0457, 47.8095],
  passau: [13.4319, 48.5667],
  regensburg: [12.1016, 49.0134],
  nurnberg: [11.0767, 49.4521],
  nuernberg: [11.0767, 49.4521],
  augsburg: [10.8978, 48.3705],
  ulm: [9.9937, 48.4011],
  konstanz: [9.1751, 47.6603],
  hamburg: [9.9937, 53.5511],
  berlin: [13.405, 52.52],
  koln: [6.9603, 50.9375],
  koeln: [6.9603, 50.9375],
  frankfurt: [8.6821, 50.1109],
  freiburg: [7.8421, 47.999],
  innsbruck: [11.4041, 47.2692]
};

const profileSettings: Record<RoutingProfile, { speed: number; curve: number; elevation: number }> = {
  balanced: { speed: 18, curve: 0.018, elevation: 1 },
  cycleways: { speed: 17, curve: 0.026, elevation: 1.05 },
  low_elevation: { speed: 16, curve: 0.022, elevation: 0.72 },
  touristic: { speed: 15, curve: 0.034, elevation: 0.95 },
  sportive: { speed: 23, curve: 0.014, elevation: 1.3 }
};

function normalizePlace(place: string) {
  return place
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "");
}

function fallbackCoordinate(place: string): Position {
  const normalized = normalizePlace(place);
  const hash = normalized.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const lon = 7.5 + (hash % 700) / 100;
  const lat = 47.2 + ((hash * 7) % 420) / 100;
  return [Number(lon.toFixed(4)), Number(lat.toFixed(4))];
}

export function geocodeMock(place: string): Position {
  return knownPlaces[normalizePlace(place)] ?? fallbackCoordinate(place);
}

function segmentPoints(a: Position, b: Position, profile: RoutingProfile, segmentIndex: number) {
  const settings = profileSettings[profile];
  const distance = haversineKm(a, b);
  const steps = Math.max(4, Math.ceil(distance / 18));
  const points: Position[] = [];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const normal: Position = [-dy / length, dx / length];

  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const wave = Math.sin(ratio * Math.PI) * settings.curve * (segmentIndex % 2 === 0 ? 1 : -1);
    points.push([
      Number((a[0] + dx * ratio + normal[0] * wave).toFixed(6)),
      Number((a[1] + dy * ratio + normal[1] * wave).toFixed(6))
    ]);
  }

  return points;
}

export function calculateMockRoute(input: RouteCalculationInput): RouteCalculation {
  const profile = input.profile ?? "balanced";
  const orderedNames = [input.start, ...(input.waypoints ?? []).filter(Boolean), input.end];
  const controlPoints = orderedNames.map(geocodeMock);
  const coordinates: Position[] = [];

  for (let index = 1; index < controlPoints.length; index += 1) {
    const segment = segmentPoints(controlPoints[index - 1], controlPoints[index], profile, index);
    coordinates.push(...(index === 1 ? segment : segment.slice(1)));
  }

  const distanceKm = routeDistanceKm(coordinates);
  const settings = profileSettings[profile];
  const elevationUp = Math.round(distanceKm * 5.4 * settings.elevation + controlPoints.length * 35);
  const elevationDown = Math.round(distanceKm * 4.6 * settings.elevation + controlPoints.length * 25);

  return {
    name: `${input.start.trim()} nach ${input.end.trim()}`,
    startName: input.start.trim(),
    endName: input.end.trim(),
    profile,
    distanceKm: Number(distanceKm.toFixed(1)),
    elevationUp,
    elevationDown,
    durationHours: Number((distanceKm / settings.speed).toFixed(2)),
    geometryGeoJson: {
      type: "LineString",
      coordinates
    },
    elevationProfile: createElevationProfile(coordinates),
    waypoints: orderedNames.map((name, order) => {
      const [lon, lat] = controlPoints[order];
      return { order, name, lat, lon };
    })
  };
}
