import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseGpx } from "../src/lib/gpx";
import {
  closestPointOnRoute,
  createStageSliceFromBounds,
  cumulativeDistances,
  routeDistanceKm,
  routeBoundsForStage,
  splitRouteByBreakpoints,
  splitRouteIntoStages,
  trimRouteGeometry,
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

  it("projects a selected off-center target to the nearest existing route position", () => {
    const originalCoordinates: Position[] = straightRoute.coordinates.map((coordinate) => [...coordinate]);
    const selected = closestPointOnRoute([11.75, 52.2], straightRoute.coordinates);

    assertClose(selected.coordinate[0], 11.75, 0.01);
    assertClose(selected.coordinate[1], 52, 0.01);
    assert.ok(selected.distanceToRouteKm > 0);
    assert.deepEqual(straightRoute.coordinates, originalCoordinates);
  });
});
