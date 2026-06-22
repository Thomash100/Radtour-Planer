import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseGpx } from "../src/lib/gpx";
import {
  closestPointOnRoute,
  createTrimmedRouteFromOriginal,
  createValidatedStageSliceFromBounds,
  createStageSliceFromBounds,
  cumulativeDistances,
  normalizeRouteTrimBounds,
  routeDistanceKm,
  routeBoundsForStage,
  splitRouteByBreakpoints,
  splitRouteIntoStages,
  trimRouteGeometry,
  validateStageSliceBounds,
  type LineStringGeoJson,
  type Position
} from "../src/lib/geo";

const straightRoute: LineStringGeoJson = {
  type: "LineString",
  coordinates: [
    [11, 52],
    [11.5, 52],
    [12, 52],
    [12.5, 52]
  ]
};

const longRoute: LineStringGeoJson = {
  type: "LineString",
  coordinates: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0]
  ]
};

function assertClose(actual: number, expected: number, tolerance: number) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function routeEndpoints(route: LineStringGeoJson) {
  return {
    first: route.coordinates[0],
    last: route.coordinates[route.coordinates.length - 1]
  };
}

describe("GPX parsing and stage planning", () => {
  it("loads GPX track coordinates with elevation and a decoded route name", () => {
    const parsed = parseGpx(`
      <gpx version="1.1" creator="test">
        <metadata><name>Fallback &amp; Name</name></metadata>
        <trk>
          <name><![CDATA[Elbe Testtour]]></name>
          <trkseg>
            <trkpt lat="52.000000" lon="11.000000"><ele>100</ele></trkpt>
            <trkpt lat="52.000000" lon="11.500000"><ele>140</ele></trkpt>
            <trkpt lat="52.000000" lon="12.000000"><ele>120</ele></trkpt>
          </trkseg>
        </trk>
      </gpx>
    `);

    assert.equal(parsed.name, "Elbe Testtour");
    assert.equal(parsed.pointType, "trkpt");
    assert.equal(parsed.hasElevation, true);
    assert.deepEqual(parsed.coordinates, [
      [11, 52],
      [11.5, 52],
      [12, 52]
    ]);
    assert.equal(parsed.elevationUp, 40);
    assert.equal(parsed.elevationDown, 20);
    assert.equal(parsed.elevationProfile.length, 3);
    assert.ok(parsed.elevationProfile[2].distanceKm > parsed.elevationProfile[1].distanceKm);
  });

  it("computes cumulative kilometers from the fixed GPX route geometry", () => {
    const distances = cumulativeDistances(straightRoute.coordinates);

    assert.equal(distances[0], 0);
    assert.equal(distances.length, straightRoute.coordinates.length);
    assert.ok(distances[1] > distances[0]);
    assert.ok(distances[2] > distances[1]);
    assert.ok(distances[3] > distances[2]);
    assertClose(distances[3], routeDistanceKm(straightRoute.coordinates), 0.001);
  });

  it("trims start and end along the route and keeps the resulting geometry on-route", () => {
    const totalKm = routeDistanceKm(straightRoute.coordinates);
    const trimmed = trimRouteGeometry(straightRoute, totalKm * 0.25, totalKm * 0.75);
    const { first, last } = routeEndpoints(trimmed);

    assert.equal(trimmed.type, "LineString");
    assert.ok(trimmed.coordinates.length >= 3);
    assertClose(first[0], 11.375, 0.01);
    assertClose(first[1], 52, 0.001);
    assertClose(last[0], 12.125, 0.01);
    assertClose(last[1], 52, 0.001);
    assertClose(routeDistanceKm(trimmed.coordinates), totalKm * 0.5, 0.25);
  });

  it("keeps a large 300 km start trim on a long route reliable", () => {
    const totalKm = routeDistanceKm(longRoute.coordinates);
    const roundedEndKm = Number(totalKm.toFixed(1));
    const validation = normalizeRouteTrimBounds(totalKm, 300, roundedEndKm);

    assert.equal(validation.ok, true);
    if (!validation.ok) {
      return;
    }

    const trimmed = trimRouteGeometry(longRoute, validation.startKm, validation.endKm);
    const firstVisiblePoint = trimmed.coordinates[0];
    const firstVisibleKm = closestPointOnRoute(firstVisiblePoint, longRoute.coordinates).distanceKm;

    assert.ok(trimmed.coordinates.length >= 2);
    assertClose(routeDistanceKm(trimmed.coordinates), totalKm - 300, 0.2);
    assertClose(firstVisibleKm, 300, 0.2);
    trimmed.coordinates.slice(1).forEach((coordinate) => {
      assert.ok(closestPointOnRoute(coordinate, longRoute.coordinates).distanceKm >= 300);
    });
    assert.equal(normalizeRouteTrimBounds(totalKm, 300, totalKm + 0.2).ok, false);
  });

  it("recomputes route trims idempotently from the original route", () => {
    const totalKm = routeDistanceKm(longRoute.coordinates);
    const trimFrom300 = createTrimmedRouteFromOriginal(longRoute, 300, totalKm);
    const trimFrom250 = createTrimmedRouteFromOriginal(longRoute, 250, totalKm);
    const resetTrim = createTrimmedRouteFromOriginal(longRoute, 0, totalKm);
    const shorterEnd = createTrimmedRouteFromOriginal(longRoute, 100, 350);
    const correctedEnd = createTrimmedRouteFromOriginal(longRoute, 100, 400);

    assert.equal(trimFrom300.ok, true);
    assert.equal(trimFrom250.ok, true);
    assert.equal(resetTrim.ok, true);
    assert.equal(shorterEnd.ok, true);
    assert.equal(correctedEnd.ok, true);
    if (!trimFrom300.ok || !trimFrom250.ok || !resetTrim.ok || !shorterEnd.ok || !correctedEnd.ok) {
      return;
    }

    assertClose(trimFrom300.distanceKm, totalKm - 300, 0.2);
    assertClose(trimFrom250.distanceKm, totalKm - 250, 0.2);
    assertClose(resetTrim.distanceKm, totalKm, 0.2);
    assertClose(shorterEnd.distanceKm, 250, 0.2);
    assertClose(correctedEnd.distanceKm, 300, 0.2);
  });

  it("creates stage suggestions along a route that was trimmed from the original", () => {
    const totalKm = routeDistanceKm(longRoute.coordinates);
    const trimmed = createTrimmedRouteFromOriginal(longRoute, 300, totalKm);

    assert.equal(trimmed.ok, true);
    if (!trimmed.ok) {
      return;
    }

    const stages = splitRouteIntoStages(trimmed.geometryGeoJson, 70);
    assert.ok(stages.length >= 2);
    assertClose(
      stages.reduce((sum, stage) => sum + stage.distanceKm, 0),
      trimmed.distanceKm,
      0.4
    );
    assert.ok(stages.every((stage) => stage.distanceKm > 0));
  });

  it("creates automatic stage suggestions close to the target distance", () => {
    const totalKm = routeDistanceKm(straightRoute.coordinates);
    const stages = splitRouteIntoStages(straightRoute, totalKm / 3);

    assert.equal(stages.length, 3);
    assert.deepEqual(stages.map((stage) => stage.dayNumber), [1, 2, 3]);
    assert.equal(stages[0].startName, "Start");
    assert.equal(stages[2].endName, "Ziel");
    assertClose(
      stages.reduce((sum, stage) => sum + stage.distanceKm, 0),
      totalKm,
      0.3
    );
    stages.forEach((stage) => assertClose(stage.distanceKm, totalKm / 3, 0.3));
  });

  it("uses sorted manual breakpoints and removes duplicate or out-of-range stage targets", () => {
    const totalKm = routeDistanceKm(straightRoute.coordinates);
    const stages = splitRouteByBreakpoints(straightRoute, [
      { name: "Too far", distanceKm: totalKm + 5 },
      { name: "Middle", distanceKm: totalKm * 0.5 },
      { name: "Duplicate middle", distanceKm: totalKm * 0.5 + 0.2 },
      { name: "First stop", distanceKm: totalKm * 0.25 }
    ]);

    assert.equal(stages.length, 3);
    assert.deepEqual(
      stages.map((stage) => [stage.startName, stage.endName]),
      [
        ["Start", "First stop"],
        ["First stop", "Middle"],
        ["Middle", "Ziel"]
      ]
    );
    assertClose(
      stages.reduce((sum, stage) => sum + stage.distanceKm, 0),
      totalKm,
      0.3
    );
  });

  it("maps manual stage geometry back to editable route kilometers", () => {
    const totalKm = routeDistanceKm(straightRoute.coordinates);
    const stageGeometry = trimRouteGeometry(straightRoute, totalKm * 0.25, totalKm * 0.5);
    const bounds = routeBoundsForStage(straightRoute, stageGeometry);

    assertClose(bounds.startKm, totalKm * 0.25, 0.15);
    assertClose(bounds.endKm, totalKm * 0.5, 0.15);
  });

  it("rebuilds a manual stage slice when start, target or length changes", () => {
    const totalKm = routeDistanceKm(straightRoute.coordinates);
    const slice = createStageSliceFromBounds(straightRoute, totalKm * 0.2, totalKm * 0.45, 1);

    assertClose(slice.startKm, totalKm * 0.2, 0.15);
    assertClose(slice.endKm, totalKm * 0.45, 0.15);
    assertClose(slice.distanceKm, totalKm * 0.25, 0.3);
    assert.ok(slice.elevationUp > 0);
    assert.ok(slice.elevationDown > 0);
    assertClose(slice.geometryGeoJson.coordinates[0][0], 11.3, 0.01);
    assertClose(slice.geometryGeoJson.coordinates.at(-1)?.[0] ?? 0, 11.675, 0.01);
  });

  it("rejects invalid manual stage kilometer ranges before rebuilding geometry", () => {
    const totalKm = routeDistanceKm(straightRoute.coordinates);

    assert.deepEqual(validateStageSliceBounds(totalKm, -0.1, totalKm * 0.5), {
      ok: false,
      message: "Start-km darf nicht kleiner als 0 sein."
    });
    assert.deepEqual(validateStageSliceBounds(totalKm, totalKm * 0.2, totalKm + 0.1), {
      ok: false,
      message: `Ziel-km darf nicht groesser als die Routenlaenge (${totalKm.toFixed(1)} km) sein.`
    });
    assert.deepEqual(validateStageSliceBounds(totalKm, totalKm * 0.6, totalKm * 0.6), {
      ok: false,
      message: "Ziel-km muss groesser als Start-km sein."
    });
    assert.equal(createValidatedStageSliceFromBounds(straightRoute, totalKm * 0.5, totalKm * 0.25).ok, false);
  });

  it("rebuilds validated manual stage geometry without mutating the source route", () => {
    const totalKm = routeDistanceKm(straightRoute.coordinates);
    const originalCoordinates: Position[] = straightRoute.coordinates.map((coordinate) => [...coordinate]);
    const slice = createValidatedStageSliceFromBounds(straightRoute, totalKm * 0.2, totalKm * 0.45, 1);

    assert.equal(slice.ok, true);
    if (!slice.ok) {
      return;
    }

    assertClose(slice.startKm, totalKm * 0.2, 0.15);
    assertClose(slice.endKm, totalKm * 0.45, 0.15);
    assertClose(slice.distanceKm, totalKm * 0.25, 0.3);
    assert.ok(slice.geometryGeoJson.coordinates.length >= 2);
    assert.deepEqual(straightRoute.coordinates, originalCoordinates);
  });

  it("keeps edited stage geometry through a JSON save/load shaped roundtrip", () => {
    const totalKm = routeDistanceKm(straightRoute.coordinates);
    const slice = createValidatedStageSliceFromBounds(straightRoute, totalKm * 0.1, totalKm * 0.4, 0);

    assert.equal(slice.ok, true);
    if (!slice.ok) {
      return;
    }

    const savedStage = JSON.parse(
      JSON.stringify({
        dayNumber: 1,
        startName: "Start",
        endName: "Etappenpunkt",
        distanceKm: slice.distanceKm,
        elevationUp: slice.elevationUp,
        elevationDown: slice.elevationDown,
        geometryGeoJson: slice.geometryGeoJson
      })
    );
    const loadedGeometry = savedStage.geometryGeoJson as LineStringGeoJson;
    const bounds = routeBoundsForStage(straightRoute, loadedGeometry);

    assert.deepEqual(loadedGeometry, slice.geometryGeoJson);
    assertClose(bounds.startKm, totalKm * 0.1, 0.15);
    assertClose(bounds.endKm, totalKm * 0.4, 0.15);
  });

  it("projects a selected off-center target to the nearest existing route position", () => {
    const originalCoordinates: Position[] = straightRoute.coordinates.map((coordinate) => [...coordinate]);
    const selected = closestPointOnRoute([11.75, 52.2], straightRoute.coordinates);

    assertClose(selected.coordinate[0], 11.75, 0.01);
    assertClose(selected.coordinate[1], 52, 0.01);
    assert.ok(selected.distanceToRouteKm > 0);
    assert.deepEqual(straightRoute.coordinates, originalCoordinates);
  });
});
