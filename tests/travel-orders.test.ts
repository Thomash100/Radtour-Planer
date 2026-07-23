import assert from "node:assert/strict";
import test from "node:test";

import type { StageAccommodation } from "../src/lib/accommodations";
import type { LineStringGeoJson } from "../src/lib/geo";
import type { TourLibraryEntry } from "../src/lib/tour-library";
import {
  applyTravelOrderStartDate,
  buildAccommodationRequest,
  buildBaggageTransferRequest,
  buildTravelOrderSummary,
  createTravelOrderExport,
  createTravelOrderFromTour,
  duplicateTravelOrder,
  parseTravelOrderExport,
  parseTravelOrderLibrary,
  selectTravelOrderAccommodation,
  serializeTravelOrderLibrary
} from "../src/lib/travel-orders";

const routeGeometry: LineStringGeoJson = {
  type: "LineString",
  coordinates: [
    [10, 50],
    [10.25, 50.1],
    [10.5, 50.2]
  ]
};

const stageOneGeometry: LineStringGeoJson = {
  type: "LineString",
  coordinates: [
    [10, 50],
    [10.25, 50.1]
  ]
};

const stageTwoGeometry: LineStringGeoJson = {
  type: "LineString",
  coordinates: [
    [10.25, 50.1],
    [10.5, 50.2]
  ]
};

const selectedAccommodation: StageAccommodation = {
  id: "selected-stage-1",
  stageId: "stage-1",
  poiId: "poi-hotel",
  name: "Hotel am Etappenziel",
  type: "Hotel",
  place: "Mittelstadt",
  coordinate: [10.251, 50.101],
  distanceToStageEndKm: 0.2,
  distanceToRouteKm: 0.1,
  source: "OpenStreetMap",
  link: "https://example.invalid/hotel",
  status: "selected",
  dataQuality: "osm",
  searchRadiusKm: 8
};

function createTourFixture(): TourLibraryEntry {
  return {
    id: "tour-test",
    name: "Testtour Nord-Süd",
    kind: "user",
    releaseStatus: "review",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T09:00:00.000Z",
    lastOpenedAt: null,
    state: {
      libraryTourId: "tour-test",
      tourKind: "user",
      inputMode: "gpx",
      route: {
        name: "Testtour Nord-Süd",
        startName: "Nordstadt",
        endName: "Südstadt",
        profile: "trekking",
        distanceKm: 102,
        elevationUp: 940,
        elevationDown: 870,
        durationHours: 6,
        geometryGeoJson: routeGeometry,
        elevationProfile: [
          { distanceKm: 0, elevationM: 100 },
          { distanceKm: 51, elevationM: 420 },
          { distanceKm: 102, elevationM: 180 }
        ],
        waypoints: []
      },
      stages: [
        {
          id: "stage-1",
          dayNumber: 1,
          startName: "Nordstadt",
          endName: "Mittelstadt",
          distanceKm: 51,
          elevationUp: 560,
          elevationDown: 180,
          geometryGeoJson: stageOneGeometry
        },
        {
          id: "stage-2",
          dayNumber: 2,
          startName: "Mittelstadt",
          endName: "Südstadt",
          distanceKm: 51,
          elevationUp: 380,
          elevationDown: 690,
          geometryGeoJson: stageTwoGeometry
        }
      ],
      pois: [
        {
          id: "poi-pension",
          name: "Pension Alternative",
          category: "ACCOMMODATION",
          lat: 50.1015,
          lon: 10.252,
          address: "Mittelstadt",
          website: "https://example.invalid/pension",
          source: "osm-overpass",
          tagsJson: {
            dataSource: "openstreetmap",
            tourism: "guest_house"
          }
        }
      ],
      stageAccommodations: {
        "stage-1": selectedAccommodation
      },
      stageGenerationMode: "difficulty",
      difficultyTarget: "moderate",
      updatedAt: "2026-07-20T09:00:00.000Z"
    }
  };
}

test("creates a complete travel order snapshot from a stored tour", () => {
  const order = createTravelOrderFromTour(createTourFixture(), {
    id: "order-test",
    now: "2026-07-21T10:00:00.000Z",
    startDate: "2026-08-10"
  });

  assert.equal(order.id, "order-test");
  assert.equal(order.tourId, "tour-test");
  assert.equal(order.travelDays, 2);
  assert.equal(order.startDate, "2026-08-10");
  assert.equal(order.endDate, "2026-08-11");
  assert.deepEqual(
    order.stages.map((stage) => stage.date),
    ["2026-08-10", "2026-08-11"]
  );
  assert.equal(order.stages[0].accommodation.selected?.name, "Hotel am Etappenziel");
  assert.equal(order.stages[0].accommodation.selected?.stageId, order.stages[0].id);
  assert.ok(order.stages[0].accommodation.alternatives.some((candidate) => candidate.name === "Pension Alternative"));
  assert.equal(order.stages[1].baggage.pickupAccommodation, "Hotel am Etappenziel");
});

test("redistributes all stage dates when the order start changes", () => {
  const initial = createTravelOrderFromTour(createTourFixture(), {
    id: "order-dates",
    now: "2026-07-21T10:00:00.000Z",
    startDate: "2026-08-10"
  });
  const updated = applyTravelOrderStartDate(initial, "2026-09-30", "2026-07-21T11:00:00.000Z");

  assert.equal(updated.startDate, "2026-09-30");
  assert.equal(updated.endDate, "2026-10-01");
  assert.deepEqual(
    updated.stages.map((stage) => stage.date),
    ["2026-09-30", "2026-10-01"]
  );
});

test("updates the following baggage pickup when an accommodation changes", () => {
  const initial = createTravelOrderFromTour(createTourFixture(), {
    id: "order-accommodation",
    now: "2026-07-21T10:00:00.000Z"
  });
  const alternative = initial.stages[0].accommodation.alternatives.find(
    (candidate) => candidate.name === "Pension Alternative"
  );

  assert.ok(alternative);
  const updated = selectTravelOrderAccommodation(
    initial,
    initial.stages[0].id,
    alternative,
    "2026-07-21T11:00:00.000Z"
  );

  assert.equal(updated.stages[0].accommodation.selected?.name, "Pension Alternative");
  assert.equal(updated.stages[0].accommodation.requestStatus, "open");
  assert.equal(updated.stages[0].baggage.destinationAccommodation, "Pension Alternative");
  assert.equal(updated.stages[1].baggage.pickupAccommodation, "Pension Alternative");
  assert.ok(updated.stages[0].accommodation.alternatives.some((candidate) => candidate.name === "Hotel am Etappenziel"));
});

test("preserves the full travel order through storage and JSON export", () => {
  const order = createTravelOrderFromTour(createTourFixture(), {
    id: "order-storage",
    now: "2026-07-21T10:00:00.000Z",
    startDate: "2026-08-10"
  });
  order.customer.name = "Erika Beispiel";
  order.customer.email = "erika@example.invalid";
  order.baggageTransfer.required = true;
  order.baggageTransfer.luggageItems = 2;
  order.stages[0].accommodation.requestStatus = "confirmed";

  const stored = parseTravelOrderLibrary(serializeTravelOrderLibrary([order]));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].customer.name, "Erika Beispiel");
  assert.equal(stored[0].stages[0].accommodation.requestStatus, "confirmed");
  assert.equal(stored[0].baggageTransfer.required, true);

  const exported = createTravelOrderExport(order, "2026-07-21T12:00:00.000Z");
  const imported = parseTravelOrderExport(JSON.stringify(exported));
  assert.equal(imported?.id, "order-storage");
  assert.equal(imported?.customer.email, "erika@example.invalid");
  assert.equal(imported?.stages[0].accommodation.selected?.name, "Hotel am Etappenziel");
  assert.equal(parseTravelOrderExport('{"invalid":true}'), null);
});

test("duplicates an order with new order and stage identifiers", () => {
  const source = createTravelOrderFromTour(createTourFixture(), {
    id: "order-source",
    now: "2026-07-21T10:00:00.000Z"
  });
  const [duplicate, original] = duplicateTravelOrder(
    [source],
    source.id,
    "2026-07-21T13:00:00.000Z",
    "order-copy"
  );

  assert.equal(duplicate.id, "order-copy");
  assert.equal(duplicate.title, `${source.title} Kopie`);
  assert.equal(duplicate.status, "draft");
  assert.notEqual(duplicate.stages[0].id, source.stages[0].id);
  assert.equal(duplicate.stages[0].accommodation.selected?.stageId, duplicate.stages[0].id);
  assert.equal(original.id, source.id);
});

test("creates explicit non-binding accommodation and baggage request drafts", () => {
  const order = createTravelOrderFromTour(createTourFixture(), {
    id: "order-text",
    now: "2026-07-21T10:00:00.000Z",
    startDate: "2026-08-10"
  });
  order.customer.name = "Erika Beispiel";
  order.customer.email = "erika@example.invalid";
  order.persons = 2;
  order.bikes = 2;
  order.ebikes = 1;
  order.baggageTransfer.required = true;
  order.baggageTransfer.luggageItems = 2;

  const summary = buildTravelOrderSummary(order);
  const accommodation = buildAccommodationRequest(order, order.stages[0].id);
  const baggage = buildBaggageTransferRequest(order);

  assert.match(summary, /Keine Buchung, Reservierung, Zahlung/);
  assert.match(summary, /Hotel am Etappenziel/);
  assert.match(accommodation, /UNVERBINDLICHER UNTERKUNFTS-ANFRAGEENTWURF/);
  assert.match(accommodation, /Erika Beispiel/);
  assert.match(accommodation, /keine Buchung/i);
  assert.match(baggage, /UNVERBINDLICHER GEPÄCKTRANSPORT-ANFRAGEENTWURF/);
  assert.match(baggage, /Hotel am Etappenziel/);
  assert.match(baggage, /keine Zahlung/i);
});

test("does not create a baggage request when transport is disabled", () => {
  const order = createTravelOrderFromTour(createTourFixture(), {
    id: "order-no-baggage",
    now: "2026-07-21T10:00:00.000Z"
  });

  const baggage = buildBaggageTransferRequest(order);
  assert.match(baggage, /kein Gepäcktransport vorgesehen/);
  assert.match(baggage, /keine Anfrage erzeugt/);
});
