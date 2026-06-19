export type Position = [number, number];

export type LineStringGeoJson = {
  type: "LineString";
  coordinates: Position[];
};

export type ElevationPoint = {
  distanceKm: number;
  elevationM: number;
};

const earthRadiusKm = 6371;

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineKm(a: Position, b: Position) {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

export function routeDistanceKm(coordinates: Position[]) {
  return coordinates.reduce((sum, point, index) => {
    if (index === 0) {
      return 0;
    }
    return sum + haversineKm(coordinates[index - 1], point);
  }, 0);
}

export function cumulativeDistances(coordinates: Position[]) {
  const distances = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    distances[index] = distances[index - 1] + haversineKm(coordinates[index - 1], coordinates[index]);
  }
  return distances;
}

export function interpolatePosition(a: Position, b: Position, ratio: number): Position {
  return [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio];
}

export function pointAtDistance(coordinates: Position[], distanceKm: number) {
  const cumulative = cumulativeDistances(coordinates);
  const total = cumulative[cumulative.length - 1] ?? 0;
  const clampedDistance = Math.min(Math.max(distanceKm, 0), total);

  for (let index = 1; index < coordinates.length; index += 1) {
    if (cumulative[index] >= clampedDistance) {
      const previousDistance = cumulative[index - 1];
      const segmentDistance = cumulative[index] - previousDistance || 1;
      const ratio = (clampedDistance - previousDistance) / segmentDistance;
      return interpolatePosition(coordinates[index - 1], coordinates[index], ratio);
    }
  }

  return coordinates[coordinates.length - 1];
}

export function sliceLineString(coordinates: Position[], startKm: number, endKm: number) {
  const cumulative = cumulativeDistances(coordinates);
  const total = cumulative[cumulative.length - 1] ?? 0;
  const start = Math.min(Math.max(startKm, 0), total);
  const end = Math.min(Math.max(endKm, start), total);
  const result: Position[] = [pointAtDistance(coordinates, start)];

  for (let index = 1; index < coordinates.length - 1; index += 1) {
    if (cumulative[index] > start && cumulative[index] < end) {
      result.push(coordinates[index]);
    }
  }

  result.push(pointAtDistance(coordinates, end));
  return result;
}

function projectToKm(position: Position, origin: Position) {
  const [lon, lat] = position;
  const [originLon, originLat] = origin;
  const x = toRad(lon - originLon) * earthRadiusKm * Math.cos(toRad((lat + originLat) / 2));
  const y = toRad(lat - originLat) * earthRadiusKm;
  return { x, y };
}

function distancePointToSegmentKm(point: Position, a: Position, b: Position) {
  const p = projectToKm(point, a);
  const start = { x: 0, y: 0 };
  const end = projectToKm(b, a);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.sqrt(p.x * p.x + p.y * p.y);
  }

  const t = Math.max(0, Math.min(1, ((p.x - start.x) * dx + (p.y - start.y) * dy) / lengthSquared));
  const projectedX = start.x + t * dx;
  const projectedY = start.y + t * dy;
  return Math.sqrt((p.x - projectedX) ** 2 + (p.y - projectedY) ** 2);
}

export function distancePointToLineKm(point: Position, coordinates: Position[]) {
  if (coordinates.length < 2) {
    return coordinates[0] ? haversineKm(point, coordinates[0]) : Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < coordinates.length; index += 1) {
    minDistance = Math.min(minDistance, distancePointToSegmentKm(point, coordinates[index - 1], coordinates[index]));
  }

  return minDistance;
}

export function createElevationProfile(coordinates: Position[]) {
  const cumulative = cumulativeDistances(coordinates);
  return coordinates.map((coordinate, index) => {
    const wave = Math.sin(index * 0.85) * 52 + Math.cos(coordinate[0] * 2.2) * 34;
    return {
      distanceKm: Number(cumulative[index].toFixed(2)),
      elevationM: Math.max(250, Math.round(480 + wave + index * 12))
    };
  });
}

export function splitRouteIntoStages(geometry: LineStringGeoJson, targetKm: number) {
  const coordinates = geometry.coordinates;
  const totalDistance = routeDistanceKm(coordinates);
  const safeTarget = Math.max(15, targetKm || 50);
  const stageCount = Math.max(1, Math.ceil(totalDistance / safeTarget));
  const stages = [];

  for (let index = 0; index < stageCount; index += 1) {
    const startKm = (totalDistance / stageCount) * index;
    const endKm = (totalDistance / stageCount) * (index + 1);
    const stageCoordinates = sliceLineString(coordinates, startKm, endKm);
    const stageDistance = routeDistanceKm(stageCoordinates);
    const elevationFactor = 1 + Math.sin(index + 0.7) * 0.18;

    stages.push({
      dayNumber: index + 1,
      startName: index === 0 ? "Start" : `Etappenpunkt ${index}`,
      endName: index === stageCount - 1 ? "Ziel" : `Etappenpunkt ${index + 1}`,
      distanceKm: Number(stageDistance.toFixed(1)),
      elevationUp: Math.round(stageDistance * 6.2 * elevationFactor),
      elevationDown: Math.round(stageDistance * 4.8 * elevationFactor),
      geometryGeoJson: {
        type: "LineString",
        coordinates: stageCoordinates
      } satisfies LineStringGeoJson
    });
  }

  return stages;
}

export function toGpx(geometry: LineStringGeoJson, name: string) {
  const trkpts = geometry.coordinates
    .map(([lon, lat]) => `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"></trkpt>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="BikeTripHub" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${name}</name></metadata>
  <trk><name>${name}</name><trkseg>
${trkpts}
  </trkseg></trk>
</gpx>`;
}
