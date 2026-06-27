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

export function closestPointOnRoute(point: Position, coordinates: Position[]) {
  const cumulative = cumulativeDistances(coordinates);
  let best = {
    coordinate: coordinates[0] ?? point,
    distanceKm: 0,
    distanceToRouteKm: coordinates[0] ? haversineKm(point, coordinates[0]) : Number.POSITIVE_INFINITY
  };

  for (let index = 1; index < coordinates.length; index += 1) {
    const a = coordinates[index - 1];
    const b = coordinates[index];
    const p = projectToKm(point, a);
    const end = projectToKm(b, a);
    const lengthSquared = end.x * end.x + end.y * end.y;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (p.x * end.x + p.y * end.y) / lengthSquared));
    const projected = interpolatePosition(a, b, t);
    const distanceToRouteKm = haversineKm(point, projected);

    if (distanceToRouteKm < best.distanceToRouteKm) {
      best = {
        coordinate: projected,
        distanceKm: (cumulative[index - 1] ?? 0) + haversineKm(a, projected),
        distanceToRouteKm
      };
    }
  }

  return best;
}

export function projectRouteClick(point: Position, geometry: LineStringGeoJson, originalStartKm = 0) {
  const projected = closestPointOnRoute(point, geometry.coordinates);

  return {
    coordinate: projected.coordinate,
    workDistanceKm: Number(projected.distanceKm.toFixed(1)),
    originalDistanceKm: Number((originalStartKm + projected.distanceKm).toFixed(1)),
    distanceToRouteKm: Number(projected.distanceToRouteKm.toFixed(3))
  };
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

export type StageBreakpoint = {
  name: string;
  distanceKm: number;
};

export type StageSliceValidationResult =
  | {
      ok: true;
      startKm: number;
      endKm: number;
    }
  | {
      ok: false;
      message: string;
    };

export function validateStageSliceBounds(totalDistanceKm: number, startKm: number, endKm: number): StageSliceValidationResult {
  if (!Number.isFinite(totalDistanceKm) || totalDistanceKm <= 0) {
    return { ok: false, message: "Die Route hat keine gültige Länge." };
  }

  if (!Number.isFinite(startKm) || !Number.isFinite(endKm)) {
    return { ok: false, message: "Start-km und Ziel-km müssen gültige Zahlen sein." };
  }

  if (startKm < 0) {
    return { ok: false, message: "Start-km darf nicht kleiner als 0 sein." };
  }

  if (endKm > totalDistanceKm) {
    return { ok: false, message: `Ziel-km darf nicht größer als die Routenlänge (${totalDistanceKm.toFixed(1)} km) sein.` };
  }

  if (endKm <= startKm) {
    return { ok: false, message: "Ziel-km muss größer als Start-km sein." };
  }

  return {
    ok: true,
    startKm,
    endKm
  };
}

export function normalizeRouteTrimBounds(totalDistanceKm: number, startKm: number, endKm: number): StageSliceValidationResult {
  const displayRoundingToleranceKm = 0.1;
  const normalizedEndKm =
    Number.isFinite(endKm) && endKm > totalDistanceKm && endKm - totalDistanceKm <= displayRoundingToleranceKm
      ? totalDistanceKm
      : endKm;

  return validateStageSliceBounds(totalDistanceKm, startKm, normalizedEndKm);
}

export function createTrimmedRouteFromOriginal(geometry: LineStringGeoJson, startKm: number, endKm: number) {
  const totalDistance = routeDistanceKm(geometry.coordinates);
  const validation = normalizeRouteTrimBounds(totalDistance, startKm, endKm);
  if (!validation.ok) {
    return validation;
  }

  const trimmedGeometry = trimRouteGeometry(geometry, validation.startKm, validation.endKm);

  return {
    ok: true as const,
    startKm: Number(validation.startKm.toFixed(1)),
    endKm: Number(validation.endKm.toFixed(1)),
    distanceKm: Number(routeDistanceKm(trimmedGeometry.coordinates).toFixed(1)),
    geometryGeoJson: trimmedGeometry
  };
}

export function createValidatedStageSliceFromBounds(
  geometry: LineStringGeoJson,
  startKm: number,
  endKm: number,
  stageIndex = 0
) {
  const totalDistance = routeDistanceKm(geometry.coordinates);
  const validation = normalizeRouteTrimBounds(totalDistance, startKm, endKm);
  if (!validation.ok) {
    return validation;
  }

  const stageCoordinates = sliceLineString(geometry.coordinates, validation.startKm, validation.endKm);
  const stageDistance = routeDistanceKm(stageCoordinates);
  const elevationFactor = 1 + Math.sin(stageIndex + 0.7) * 0.18;

  return {
    ok: true as const,
    startKm: Number(validation.startKm.toFixed(1)),
    endKm: Number(validation.endKm.toFixed(1)),
    distanceKm: Number(stageDistance.toFixed(1)),
    elevationUp: Math.round(stageDistance * 6.2 * elevationFactor),
    elevationDown: Math.round(stageDistance * 4.8 * elevationFactor),
    geometryGeoJson: {
      type: "LineString",
      coordinates: stageCoordinates
    } satisfies LineStringGeoJson
  };
}

export type ContiguousStageSliceInput = {
  dayNumber: number;
  distanceKm?: number;
  elevationUp?: number;
  elevationDown?: number;
  geometryGeoJson: LineStringGeoJson;
  routeStartKm?: number;
  routeEndKm?: number;
};

export type ContiguousStageSlicePatch = {
  startKm?: number;
  endKm?: number;
  distanceKm?: number;
};

export function rebuildContiguousStageSlices<T extends ContiguousStageSliceInput>(
  routeGeometry: LineStringGeoJson,
  stages: T[],
  changedStageIndex: number,
  patch: ContiguousStageSlicePatch
):
  | {
      ok: true;
      stages: Array<
        T & {
          distanceKm: number;
          elevationUp: number;
          elevationDown: number;
          routeStartKm: number;
          routeEndKm: number;
          geometryGeoJson: LineStringGeoJson;
        }
      >;
      changedStage: T & {
        distanceKm: number;
        elevationUp: number;
        elevationDown: number;
        routeStartKm: number;
        routeEndKm: number;
        geometryGeoJson: LineStringGeoJson;
      };
      affectedStageNumbers: number[];
    }
  | {
      ok: false;
      message: string;
    } {
  if (changedStageIndex < 0 || changedStageIndex >= stages.length) {
    return { ok: false, message: "Etappe wurde nicht gefunden." };
  }

  const totalDistance = routeDistanceKm(routeGeometry.coordinates);
  if (!Number.isFinite(totalDistance) || totalDistance <= 0) {
    return { ok: false, message: "Die Route hat keine gültige Länge." };
  }

  const changedStage = stages[changedStageIndex];
  const currentBounds = stages.map((stage) => {
    if (typeof stage.routeStartKm === "number" && typeof stage.routeEndKm === "number") {
      return {
        startKm: stage.routeStartKm,
        endKm: stage.routeEndKm
      };
    }

    return routeBoundsForStage(routeGeometry, stage.geometryGeoJson);
  });
  const nextBounds = currentBounds.map((bounds) => ({ ...bounds }));
  const baseBounds = nextBounds[changedStageIndex];
  let startKm = patch.startKm ?? baseBounds.startKm;
  let endKm = patch.endKm ?? baseBounds.endKm;

  if (typeof patch.startKm === "number" && !Number.isFinite(patch.startKm)) {
    return { ok: false, message: `Etappe ${changedStage.dayNumber}: Start-km muss eine gültige Zahl sein.` };
  }

  if (typeof patch.endKm === "number" && !Number.isFinite(patch.endKm)) {
    return { ok: false, message: `Etappe ${changedStage.dayNumber}: Ziel-km muss eine gültige Zahl sein.` };
  }

  if (typeof patch.distanceKm === "number") {
    if (!Number.isFinite(patch.distanceKm)) {
      return { ok: false, message: `Etappe ${changedStage.dayNumber}: Länge muss eine gültige Zahl sein.` };
    }

    if (patch.distanceKm <= 0) {
      return { ok: false, message: `Etappe ${changedStage.dayNumber}: Länge darf nicht 0 oder negativ sein.` };
    }

    endKm = startKm + patch.distanceKm;
  }

  startKm = Number(startKm.toFixed(3));
  endKm = Number(endKm.toFixed(3));
  nextBounds[changedStageIndex] = { startKm, endKm };

  if (typeof patch.startKm === "number" && changedStageIndex > 0) {
    nextBounds[changedStageIndex - 1] = {
      ...nextBounds[changedStageIndex - 1],
      endKm: startKm
    };
  }

  if ((typeof patch.endKm === "number" || typeof patch.distanceKm === "number") && changedStageIndex < stages.length - 1) {
    nextBounds[changedStageIndex + 1] = {
      ...nextBounds[changedStageIndex + 1],
      startKm: endKm
    };
  }

  const affectedIndexes = new Set([changedStageIndex]);
  if (typeof patch.startKm === "number" && changedStageIndex > 0) {
    affectedIndexes.add(changedStageIndex - 1);
  }
  if ((typeof patch.endKm === "number" || typeof patch.distanceKm === "number") && changedStageIndex < stages.length - 1) {
    affectedIndexes.add(changedStageIndex + 1);
  }

  const rebuiltStages = stages.map((stage, index) => {
    const bounds = nextBounds[index];
    const rebuilt = createValidatedStageSliceFromBounds(routeGeometry, bounds.startKm, bounds.endKm, index);
    if (!rebuilt.ok) {
      return {
        ok: false as const,
        message: `Etappe ${stage.dayNumber}: ${rebuilt.message}`
      };
    }

    return {
      ok: true as const,
      stage: {
        ...stage,
        routeStartKm: rebuilt.startKm,
        routeEndKm: rebuilt.endKm,
        distanceKm: rebuilt.distanceKm,
        elevationUp: rebuilt.elevationUp,
        elevationDown: rebuilt.elevationDown,
        geometryGeoJson: rebuilt.geometryGeoJson
      }
    };
  });
  const failedStage = rebuiltStages.find((result) => !result.ok);
  if (failedStage && !failedStage.ok) {
    return {
      ok: false,
      message: failedStage.message
    };
  }

  const nextStages = rebuiltStages.map((result) => (result.ok ? result.stage : null)).filter((stage): stage is NonNullable<typeof stage> => stage !== null);

  return {
    ok: true,
    stages: nextStages,
    changedStage: nextStages[changedStageIndex],
    affectedStageNumbers: Array.from(affectedIndexes)
      .sort((a, b) => a - b)
      .map((index) => stages[index].dayNumber)
  };
}

export function routeBoundsForStage(routeGeometry: LineStringGeoJson, stageGeometry: LineStringGeoJson) {
  const routeCoordinates = routeGeometry.coordinates;
  const stageCoordinates = stageGeometry.coordinates;
  const first = stageCoordinates[0];
  const last = stageCoordinates[stageCoordinates.length - 1];

  if (!first || !last || routeCoordinates.length < 2) {
    return { startKm: 0, endKm: 0 };
  }

  const start = closestPointOnRoute(first, routeCoordinates).distanceKm;
  const end = closestPointOnRoute(last, routeCoordinates).distanceKm;

  return {
    startKm: Number(Math.min(start, end).toFixed(1)),
    endKm: Number(Math.max(start, end).toFixed(1))
  };
}

export function createStageSliceFromBounds(
  geometry: LineStringGeoJson,
  startKm: number,
  endKm: number,
  stageIndex = 0
) {
  const totalDistance = routeDistanceKm(geometry.coordinates);
  const start = Math.min(Math.max(Number.isFinite(startKm) ? startKm : 0, 0), Math.max(totalDistance - 0.1, 0));
  const end = Math.min(Math.max(Number.isFinite(endKm) ? endKm : start + 0.1, start + 0.1), totalDistance);
  const stageCoordinates = sliceLineString(geometry.coordinates, start, end);
  const stageDistance = routeDistanceKm(stageCoordinates);
  const elevationFactor = 1 + Math.sin(stageIndex + 0.7) * 0.18;

  return {
    startKm: Number(start.toFixed(1)),
    endKm: Number(end.toFixed(1)),
    distanceKm: Number(stageDistance.toFixed(1)),
    elevationUp: Math.round(stageDistance * 6.2 * elevationFactor),
    elevationDown: Math.round(stageDistance * 4.8 * elevationFactor),
    geometryGeoJson: {
      type: "LineString",
      coordinates: stageCoordinates
    } satisfies LineStringGeoJson
  };
}

export function splitRouteByBreakpoints(geometry: LineStringGeoJson, breakpoints: StageBreakpoint[]) {
  const coordinates = geometry.coordinates;
  const totalDistance = routeDistanceKm(coordinates);
  const sortedBreakpoints = breakpoints
    .map((breakpoint) => ({
      name: breakpoint.name.trim() || "Etappenpunkt",
      distanceKm: Math.min(Math.max(breakpoint.distanceKm, 0), totalDistance)
    }))
    .filter((breakpoint) => breakpoint.distanceKm > 0 && breakpoint.distanceKm < totalDistance)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const distinctBreakpoints = sortedBreakpoints.filter(
    (breakpoint, index) => index === 0 || Math.abs(breakpoint.distanceKm - sortedBreakpoints[index - 1].distanceKm) >= 0.5
  );
  const splitPoints = [0, ...distinctBreakpoints.map((breakpoint) => breakpoint.distanceKm), totalDistance];
  const names = ["Start", ...distinctBreakpoints.map((breakpoint) => breakpoint.name), "Ziel"];

  return splitPoints.slice(0, -1).map((startKm, index) => {
    const endKm = splitPoints[index + 1];
    const stageCoordinates = sliceLineString(coordinates, startKm, endKm);
    const stageDistance = routeDistanceKm(stageCoordinates);
    const elevationFactor = 1 + Math.sin(index + 0.7) * 0.18;

    return {
      dayNumber: index + 1,
      startName: names[index],
      endName: names[index + 1],
      distanceKm: Number(stageDistance.toFixed(1)),
      elevationUp: Math.round(stageDistance * 6.2 * elevationFactor),
      elevationDown: Math.round(stageDistance * 4.8 * elevationFactor),
      geometryGeoJson: {
        type: "LineString",
        coordinates: stageCoordinates
      } satisfies LineStringGeoJson
    };
  });
}

export function trimRouteGeometry(geometry: LineStringGeoJson, startKm: number, endKm: number) {
  const totalDistance = routeDistanceKm(geometry.coordinates);
  const start = Math.min(Math.max(startKm, 0), totalDistance);
  const end = Math.min(Math.max(endKm, start + 1), totalDistance);

  return {
    type: "LineString",
    coordinates: sliceLineString(geometry.coordinates, start, end)
  } satisfies LineStringGeoJson;
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
