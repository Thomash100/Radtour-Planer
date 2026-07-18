import assert from "node:assert/strict";
import test from "node:test";

import {
  accommodationDataQualityLabel,
  accommodationTypeFromTags,
  rankStageAccommodationCandidates,
  type AccommodationPoiInput,
  type AccommodationStageInput
} from "../src/lib/accommodations";
import { normalizeDirectRouteInput, normalizeRouteCalculationPayload, parseRouteExpression } from "../src/lib/direct-route-input";
import type { LineStringGeoJson } from "../src/lib/geo";
import { calculateMockRoute, resolveMockPlace } from "../src/lib/mock-routing";
import { routeCalculateSchema } from "../src/lib/validators";

const routeGeometry: LineStringGeoJson = {
  type: "LineString",
  coordinates: [
    [13.0, 51.0],
    [13.05, 51.02],
    [13.1, 51.04]
  ]
};

const stage: AccommodationStageInput & { distanceKm: number } = {
  id: "stage-1",
  dayNumber: 1,
  endName: "Teststadt",
  distanceKm: 64,
  geometryGeoJson: routeGeometry
};

test("labels real OSM accommodation data distinctly", () => {
  assert.equal(accommodationDataQualityLabel("osm"), "OSM-Daten");
  assert.equal(accommodationTypeFromTags({ tourism: "guest_house" }), "Pension/Gästehaus");
  assert.equal(accommodationTypeFromTags({ tourism: "camp_site" }), "Camping");
});

test("ranks OSM accommodation candidates without treating them as booking data", () => {
  const poi: AccommodationPoiInput = {
    id: "osm_node_1001",
    name: "Hotel Elberadweg",
    category: "ACCOMMODATION",
    lat: 51.0405,
    lon: 13.1005,
    address: "Markt 1, 01000 Teststadt",
    phone: "+49 123 456789",
    website: "https://hotel.example.invalid",
    source: "osm-overpass",
    osmId: "node/1001",
    tagsJson: {
      dataSource: "openstreetmap",
      tourism: "hotel"
    },
    partnerId: null
  };

  const [candidate] = rankStageAccommodationCandidates(stage, routeGeometry, [poi]);

  assert.equal(candidate.name, "Hotel Elberadweg");
  assert.equal(candidate.type, "Hotel");
  assert.equal(candidate.source, "OpenStreetMap");
  assert.equal(candidate.dataQuality, "osm");
  assert.equal(candidate.status, "candidate");
  assert.equal(candidate.link, "https://hotel.example.invalid");
});

test("parses direct route expressions with supported separators", () => {
  assert.deepEqual(parseRouteExpression("Flensburg-Swinemünde"), {
    start: "Flensburg",
    end: "Swinemünde",
    separator: "Bindestrich"
  });
  assert.deepEqual(parseRouteExpression(" Leipzig   nach   München "), {
    start: "Leipzig",
    end: "München",
    separator: "Worttrenner"
  });
  assert.deepEqual(parseRouteExpression("Kiel bis Lübeck"), {
    start: "Kiel",
    end: "Lübeck",
    separator: "Worttrenner"
  });
  assert.deepEqual(parseRouteExpression("Dresden → Prag"), {
    start: "Dresden",
    end: "Prag",
    separator: "Pfeil"
  });
});

test("normalizes one-field route input into start and destination", () => {
  const normalized = normalizeDirectRouteInput({ start: "  Hamburg   -   Berlin  ", end: "" });

  assert.deepEqual(normalized, {
    ok: true,
    start: "Hamburg",
    end: "Berlin",
    detectedExpression: "Hamburg - Berlin"
  });
});

test("rejects incomplete direct route input before geocoding", () => {
  const normalized = normalizeDirectRouteInput({ start: "Hamburg", end: "" });

  assert.equal(normalized.ok, false);
  if (!normalized.ok) {
    assert.match(normalized.error, /Zielort/);
  }
});

test("calculates accepted direct route expressions with distinct start and destination", () => {
  for (const expression of ["Flensburg-Swinemünde", "Hamburg-Berlin", "Dresden-Prag", "Leipzig nach München", "Kiel bis Lübeck"]) {
    const payload = normalizeRouteCalculationPayload({ start: expression, end: "", profile: "balanced", waypoints: [] });
    const input = routeCalculateSchema.parse(payload);
    const route = calculateMockRoute(input);

    assert.equal(route.startName, payload.start);
    assert.equal(route.endName, payload.end);
    assert.ok(route.distanceKm > 20, `${expression} should produce a non-trivial route`);
    assert.notDeepEqual(route.waypoints[0], route.waypoints[route.waypoints.length - 1]);
  }
});

test("reports unknown places instead of routing to fallback coordinates", () => {
  const unknown = resolveMockPlace("Flensburg-Suchbegriff");

  assert.equal(unknown.ok, false);
  assert.throws(
    () => calculateMockRoute({ start: "Flensburg-Suchbegriff", end: "Berlin", profile: "balanced" }),
    /Ort nicht eindeutig gefunden/
  );
});
