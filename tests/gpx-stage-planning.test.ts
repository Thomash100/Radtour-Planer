import assert from "node:assert/strict";
import test from "node:test";

import {
  accommodationDataQualityLabel,
  accommodationTypeFromTags,
  rankStageAccommodationCandidates,
  type AccommodationPoiInput,
  type AccommodationStageInput
} from "../src/lib/accommodations";
import type { LineStringGeoJson } from "../src/lib/geo";

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
