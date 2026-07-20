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
import { buildBRouterUrl, calculateRoadRoute, createRoutingAnchors } from "../src/lib/road-routing";
import { configuredRoutingProvider } from "../src/lib/routing-provider";
import { calculateStageDifficulty } from "../src/lib/stage-difficulty";
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

function brouterFeature(
  coordinates: number[][],
  properties: Record<string, string | number> = {}
) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          "track-length": "10000",
          "filtered ascend": "100",
          "total-time": "1800",
          ...properties
        },
        geometry: {
          type: "LineString",
          coordinates
        }
      }
    ]
  };
}

test("builds BRouter requests for real bicycle profiles", () => {
  const url = buildBRouterUrl("https://routing.example.test/brouter", [13.7373, 51.0504], [13.9407, 50.9625], "sportive");

  assert.equal(url.searchParams.get("profile"), "fastbike");
  assert.equal(url.searchParams.get("format"), "geojson");
  assert.equal(url.searchParams.get("lonlats"), "13.737300,51.050400|13.940700,50.962500");
});

test("splits long provider requests into short internal routing sections", () => {
  const anchors = createRoutingAnchors([9.9937, 53.5511], [13.405, 52.52], 80);

  assert.ok(anchors.length > 2);
  assert.deepEqual(anchors[0], [9.9937, 53.5511]);
  assert.deepEqual(anchors[anchors.length - 1], [13.405, 52.52]);
});

test("combines routed BRouter segments without replacing them by straight lines", async () => {
  const replies = [
    brouterFeature(
      [
        [13.7373, 51.0504, 110],
        [13.66, 51.14, 145],
        [13.4775, 51.1616, 120]
      ],
      { "track-length": "18500", "filtered ascend": "120", "total-time": "3600" }
    ),
    brouterFeature(
      [
        [13.4775, 51.1616, 120],
        [12.8, 52.1, 90],
        [9.9937, 53.5511, 12]
      ],
      { "track-length": "410000", "filtered ascend": "800", "total-time": "72000" }
    )
  ];
  const requestedUrls: string[] = [];
  const fetcher = async (input: string | URL | Request) => {
    requestedUrls.push(String(input));
    const reply = replies.shift();
    assert.ok(reply, "unexpected BRouter request");
    return new Response(JSON.stringify(reply), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const route = await calculateRoadRoute(
    { start: "Dresden", end: "Hamburg", waypoints: ["Meissen"], profile: "balanced" },
    { baseUrl: "https://routing.example.test/brouter", maxSegmentKm: 1000, fetcher }
  );

  assert.equal(requestedUrls.length, 2);
  assert.equal(route.routingProvider, "brouter");
  assert.equal(route.routingProfileName, "trekking");
  assert.equal(route.distanceKm, 428.5);
  assert.equal(route.geometryGeoJson.coordinates.length, 5);
  assert.deepEqual(route.geometryGeoJson.coordinates[1], [13.66, 51.14]);
  assert.equal(route.waypoints[1].name, "Meissen");
  assert.deepEqual([route.waypoints[1].lon, route.waypoints[1].lat], [13.4775, 51.1616]);
  assert.ok(route.elevationProfile.length >= 2);
});

test("reports routing provider failures instead of silently drawing a direct line", async () => {
  const fetcher = async () => new Response("routing engine unavailable", { status: 503 });

  await assert.rejects(
    () =>
      calculateRoadRoute(
        { start: "Dresden", end: "Pirna", profile: "balanced" },
        { baseUrl: "https://routing.example.test/brouter", fetcher }
      ),
    /HTTP 503/
  );
});

test("uses BRouter by default and allows an explicit offline mock mode", () => {
  const previousProvider = process.env.ROUTING_PROVIDER;
  try {
    delete process.env.ROUTING_PROVIDER;
    assert.equal(configuredRoutingProvider(), "brouter");
    process.env.ROUTING_PROVIDER = "mock";
    assert.equal(configuredRoutingProvider(), "mock");
  } finally {
    if (previousProvider === undefined) {
      delete process.env.ROUTING_PROVIDER;
    } else {
      process.env.ROUTING_PROVIDER = previousProvider;
    }
  }
});

test("rates short flat stages as easy", () => {
  const rating = calculateStageDifficulty({ distanceKm: 30, elevationUp: 80, elevationDown: 60, durationHours: 1.8 });

  assert.equal(rating.level, "easy");
  assert.equal(rating.label, "leicht");
  assert.ok(rating.effortScore >= 0 && rating.effortScore <= 100);
});

test("keeps moderate reference stage in the middle range", () => {
  const rating = calculateStageDifficulty({ distanceKm: 60, elevationUp: 300, elevationDown: 250, durationHours: 3.6 });

  assert.equal(rating.level, "moderate");
  assert.equal(rating.label, "mittel");
  assert.ok(rating.effortScore >= 35 && rating.effortScore <= 64);
});

test("rates short hilly stages as hard and explains climb load", () => {
  const rating = calculateStageDifficulty({ distanceKm: 45, elevationUp: 1000, elevationDown: 250, durationHours: 3 });

  assert.equal(rating.level, "hard");
  assert.equal(rating.label, "schwer");
  assert.ok(rating.warnings.some((warning) => warning.includes("Höhenmeter")));
  assert.ok(rating.suggestions.some((suggestion) => suggestion.includes("Anstiegslast")));
});

test("treats long flat stages as distance-driven load", () => {
  const rating = calculateStageDifficulty({ distanceKm: 80, elevationUp: 150, elevationDown: 120, durationHours: 4.8 });

  assert.equal(rating.level, "moderate");
  assert.ok(rating.warnings.some((warning) => warning.includes("Lange Etappe")));
  assert.ok(rating.suggestions.some((suggestion) => suggestion.includes("Etappe verkürzen")));
});

test("warns about long descents without changing the route", () => {
  const rating = calculateStageDifficulty({ distanceKm: 50, elevationUp: 200, elevationDown: 1200, durationHours: 3.1 });

  assert.ok(rating.warnings.some((warning) => warning.includes("Abfahrt")));
  assert.ok(rating.suggestions.some((suggestion) => suggestion.includes("Brems")));
});

test("adds climb-density warning above 15 height meters per kilometer", () => {
  const rating = calculateStageDifficulty({ distanceKm: 35, elevationUp: 700, elevationDown: 100, durationHours: 2.5 });

  assert.equal(rating.climbDensityHmPerKm, 20);
  assert.ok(rating.factors.climbDensityBonus > 0);
  assert.ok(rating.warnings.some((warning) => warning.includes("Steigungsdichte")));
});

test("marks missing elevation data as incomplete and keeps score bounded", () => {
  const rating = calculateStageDifficulty({ distanceKm: 40, elevationUp: null, elevationDown: undefined });

  assert.equal(rating.isIncomplete, true);
  assert.equal(rating.climbDensityHmPerKm, null);
  assert.ok(rating.warnings.some((warning) => warning.includes("Höhendaten")));
  assert.ok(rating.effortScore >= 0 && rating.effortScore <= 100);
});

test("keeps difficulty thresholds ordered and caps very hard stages at 100", () => {
  assert.equal(calculateStageDifficulty({ distanceKm: 10, elevationUp: 0, elevationDown: 0 }).level, "easy");
  assert.equal(calculateStageDifficulty({ distanceKm: 60, elevationUp: 300, elevationDown: 150 }).level, "moderate");
  assert.equal(calculateStageDifficulty({ distanceKm: 45, elevationUp: 1000, elevationDown: 250 }).level, "hard");

  const veryHard = calculateStageDifficulty({ distanceKm: 100, elevationUp: 1400, elevationDown: 1300, durationHours: 6 });
  assert.equal(veryHard.level, "very_hard");
  assert.equal(veryHard.effortScore, 100);
});

test("recalculates difficulty when manual stage metrics change", () => {
  const before = calculateStageDifficulty({ distanceKm: 40, elevationUp: 100, elevationDown: 100 });
  const after = calculateStageDifficulty({ distanceKm: 40, elevationUp: 900, elevationDown: 100 });

  assert.ok(after.effortScore > before.effortScore);
  assert.equal(before.level, "easy");
  assert.equal(after.level, "hard");
});
