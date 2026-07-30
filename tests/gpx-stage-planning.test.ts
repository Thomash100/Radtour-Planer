import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  accommodationDataQualityLabel,
  accommodationFeaturesFromTags,
  accommodationTypeFromTags,
  evidencedAccommodationFeatures,
  rankStageAccommodationCandidates,
  type AccommodationPoiInput,
  type AccommodationStageInput
} from "../src/lib/accommodations";
import {
  DevelopmentProvider,
  LocalTestProvider,
  ProductionProvider,
  createAccommodationProvider
} from "../src/lib/accommodation-providers";
import { calculateAccommodationDetour } from "../src/lib/accommodation-routing";
import { normalizeDirectRouteInput, normalizeRouteCalculationPayload, parseRouteExpression } from "../src/lib/direct-route-input";
import { replaceRouteAfterSuccessfulCalculation } from "../src/lib/direct-route-replacement";
import {
  calculateStageEnergyProjection,
  type StageEnergyProjectionInput
} from "../src/lib/ebike-energy";
import {
  createValidatedStageSliceFromBounds,
  distancePointToLineKm,
  elevationMetricsForRange,
  routeDistanceKm,
  sliceElevationProfile,
  type ElevationPoint,
  type LineStringGeoJson
} from "../src/lib/geo";
import { calculateMockRoute, resolveMockPlace } from "../src/lib/mock-routing";
import {
  analyzeBRouterCycleCoverage,
  brouterProfileConfigurationByRoutingProfile,
  brouterProfileByRoutingProfile,
  buildBRouterUrl,
  calculateRoadRoute,
  createRoutingAnchorsFromRoutedPath
} from "../src/lib/road-routing";
import { configuredRoutingProvider } from "../src/lib/routing-provider";
import { MAX_ROUTE_WAYPOINTS } from "../src/lib/routing-limits";
import {
  CYCLOSM_SOURCE_MAX_ZOOM,
  MAP_AUTO_FIT_MAX_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  OSM_SOURCE_MAX_ZOOM
} from "../src/lib/map-zoom";
import {
  isPlannerStepForWorkflow,
  normalizePlannerStep,
  resolvePlannerStep
} from "../src/lib/planner-workflow";
import {
  DEFAULT_RIDER_BIKE_PROFILE,
  RIDER_BIKE_PROFILE_EXPORT_SCHEMA,
  createRiderBikeProfileExport,
  parseRiderBikeProfileExport,
  parseRiderBikeProfileValue
} from "../src/lib/rider-bike-profile";
import {
  createTourExport,
  createTourLibraryEntry,
  parseTourExport
} from "../src/lib/tour-library";
import { calculateStageDifficulty } from "../src/lib/stage-difficulty";
import { planStagesByDifficulty } from "../src/lib/stage-planning";
import { parseStoredTourState } from "../src/lib/tour-state";
import { autoStageSchema, routeCalculateSchema } from "../src/lib/validators";

const riderBikeProfile = {
  ...DEFAULT_RIDER_BIKE_PROFILE,
  rider: {
    ...DEFAULT_RIDER_BIKE_PROFILE.rider,
    name: "  Testfahrerin  ",
    bodyWeightKg: 68,
    desiredDailyLoad: 62,
    preferredDailyRideHours: 5.5,
    maximumDailyRideHours: 8
  },
  bike: {
    ...DEFAULT_RIDER_BIKE_PROFILE.bike,
    type: "ebike" as const,
    bikeWeightKg: 24,
    luggageWeightKg: 16,
    ebike: {
      ...DEFAULT_RIDER_BIKE_PROFILE.bike.ebike,
      batteryCapacityWh: 625,
      batteryCount: 2,
      usableBatteryCapacityPercent: 88,
      motorAssistancePercent: 140,
      referenceRangeKm: 95,
      desiredReservePercent: 25,
      chargerPowerW: 180,
      chargingLossPercent: 12,
      personalRidingStyle: "economical" as const
    }
  }
};

const measuredFlatProfile = (distanceKm: number) =>
  Array.from({ length: Math.ceil(distanceKm / 2) + 1 }, (_, index) => ({
    distanceKm: Math.min(index * 2, distanceKm),
    elevationM: 100
  })).filter((point, index, points) => index === 0 || point.distanceKm > points[index - 1].distanceKm);

const measuredClimbProfile = (distanceKm: number, elevationGainM: number) =>
  Array.from({ length: Math.ceil(distanceKm) + 1 }, (_, index) => {
    const pointDistanceKm = Math.min(index, distanceKm);
    return {
      distanceKm: pointDistanceKm,
      elevationM: 100 + (elevationGainM * pointDistanceKm) / distanceKm
    };
  }).filter((point, index, points) => index === 0 || point.distanceKm > points[index - 1].distanceKm);

function energyProjection(
  overrides: Partial<StageEnergyProjectionInput> = {}
) {
  return calculateStageEnergyProjection({
    profile: riderBikeProfile,
    distanceKm: 40,
    elevationUp: 0,
    elevationDown: 0,
    elevationProfile: measuredFlatProfile(40),
    elevationDataStatus: "measured",
    ...overrides
  });
}

test("validiert das zentrale Fahrer- und Fahrradprofil", () => {
  const parsed = parseRiderBikeProfileValue(riderBikeProfile);

  assert.equal(parsed?.rider.name, "Testfahrerin");
  assert.equal(parsed?.bike.type, "ebike");
  assert.equal(parsed?.bike.ebike.batteryCount, 2);
  assert.equal(parsed?.bike.ebike.usableBatteryCapacityPercent, 88);
  assert.equal(parsed?.bike.ebike.motorAssistancePercent, 140);
  assert.equal(parsed?.bike.ebike.chargerPowerW, 180);
  assert.equal(parsed?.bike.ebike.chargingLossPercent, 12);
  assert.equal(parsed?.bike.ebike.personalRidingStyle, "economical");
  assert.equal(
    parseRiderBikeProfileValue({
      ...riderBikeProfile,
      rider: {
        ...riderBikeProfile.rider,
        preferredDailyRideHours: 9,
        maximumDailyRideHours: 8
      }
    }),
    null
  );
  assert.equal(
    parseRiderBikeProfileValue({
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: {
          ...riderBikeProfile.bike.ebike,
          usableBatteryCapacityPercent: 101
        }
      }
    }),
    null
  );
});

test("ergänzt Paket-16-Profile rückwärtskompatibel um Ladeparameter", () => {
  const package16Profile = JSON.parse(JSON.stringify(riderBikeProfile));
  delete package16Profile.bike.ebike.usableBatteryCapacityPercent;
  delete package16Profile.bike.ebike.motorAssistancePercent;
  delete package16Profile.bike.ebike.chargerPowerW;
  delete package16Profile.bike.ebike.chargingLossPercent;
  delete package16Profile.bike.ebike.personalRidingStyle;

  const parsed = parseRiderBikeProfileValue(package16Profile);

  assert.equal(parsed?.bike.ebike.usableBatteryCapacityPercent, 90);
  assert.equal(parsed?.bike.ebike.motorAssistancePercent, 100);
  assert.equal(parsed?.bike.ebike.chargerPowerW, 100);
  assert.equal(parsed?.bike.ebike.chargingLossPercent, 10);
  assert.equal(parsed?.bike.ebike.personalRidingStyle, "balanced");
});

test("berechnet eine flache Referenzstrecke segmentweise und reproduzierbar", () => {
  const first = energyProjection();
  const second = energyProjection();

  assert.deepEqual(first, second);
  assert.equal(first.modelVersion, "biketriphub-energy-v1");
  assert.equal(first.quality, "high");
  assert.equal(first.terrain.flat.distanceKm, 40);
  assert.equal(first.terrain.climb.distanceKm, 0);
  assert.ok(first.batteryEnergyWh && first.batteryEnergyWh > 0);
  assert.ok(first.batteryConsumptionPercent && first.batteryConsumptionPercent > 0);
});

test("berechnet für eine kurze steile Etappe mehr Energie als für eine flache Etappe", () => {
  const flat = energyProjection({
    distanceKm: 12,
    elevationProfile: measuredFlatProfile(12)
  });
  const steep = energyProjection({
    distanceKm: 12,
    elevationUp: 720,
    elevationProfile: measuredClimbProfile(12, 720)
  });

  assert.ok(steep.energyNeedWh > flat.energyNeedWh);
  assert.ok(steep.terrain.climb.mechanicalEnergyWh > 0);
  assert.ok(steep.personalLoadScore >= flat.personalLoadScore);
});

test("trennt Steigung, Gefälle und elektrische Verluste", () => {
  const rolling = energyProjection({
    distanceKm: 20,
    elevationUp: 400,
    elevationDown: 400,
    elevationProfile: [
      { distanceKm: 0, elevationM: 100 },
      { distanceKm: 10, elevationM: 500 },
      { distanceKm: 20, elevationM: 100 }
    ]
  });

  assert.ok(rolling.terrain.climb.distanceKm > 0);
  assert.ok(rolling.terrain.descent.distanceKm > 0);
  assert.ok(rolling.conversionLossWh > 0);
  assert.ok(
    Math.abs(
      (rolling.batteryEnergyWh ?? 0) -
        rolling.motorMechanicalEnergyWh -
        rolling.conversionLossWh
    ) <= 1
  );
});

test("berechnet für eine lange flache Etappe mehr Verbrauch als für eine kurze", () => {
  const short = energyProjection({
    distanceKm: 30,
    elevationProfile: measuredFlatProfile(30)
  });
  const long = energyProjection({
    distanceKm: 100,
    elevationProfile: measuredFlatProfile(100)
  });

  assert.ok(long.energyNeedWh > short.energyNeedWh);
  assert.ok((long.batteryConsumptionPercent ?? 0) > (short.batteryConsumptionPercent ?? 0));
});

test("berücksichtigt unterschiedliches Gesamtgewicht deterministisch", () => {
  const light = energyProjection({
    profile: {
      ...riderBikeProfile,
      rider: { ...riderBikeProfile.rider, bodyWeightKg: 55 },
      bike: { ...riderBikeProfile.bike, luggageWeightKg: 5 }
    },
    elevationUp: 500,
    distanceKm: 40,
    elevationProfile: measuredClimbProfile(40, 500)
  });
  const heavy = energyProjection({
    profile: {
      ...riderBikeProfile,
      rider: { ...riderBikeProfile.rider, bodyWeightKg: 105 },
      bike: { ...riderBikeProfile.bike, luggageWeightKg: 30 }
    },
    elevationUp: 500,
    distanceKm: 40,
    elevationProfile: measuredClimbProfile(40, 500)
  });

  assert.ok(heavy.energyNeedWh > light.energyNeedWh);
  assert.ok(heavy.totalMassKg > light.totalMassKg);
});

test("trennt Fahrer- und Motoranteil bei unterschiedlicher Unterstützung", () => {
  const lowSupport = energyProjection({
    profile: {
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: { ...riderBikeProfile.bike.ebike, motorAssistancePercent: 50 }
      }
    }
  });
  const highSupport = energyProjection({
    profile: {
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: { ...riderBikeProfile.bike.ebike, motorAssistancePercent: 250 }
      }
    }
  });

  assert.ok((highSupport.batteryEnergyWh ?? 0) > (lowSupport.batteryEnergyWh ?? 0));
  assert.ok(highSupport.riderEnergyWh < lowSupport.riderEnergyWh);
});

test("weist beim klassischen Fahrrad keine Akkuwerte aus", () => {
  const classic = energyProjection({
    profile: {
      ...riderBikeProfile,
      bike: { ...riderBikeProfile.bike, type: "touring" as const }
    }
  });

  assert.equal(classic.bicycleMode, "classic");
  assert.equal(classic.batteryEnergyWh, null);
  assert.equal(classic.batteryConsumptionPercent, null);
  assert.equal(classic.remainingCapacityPercent, null);
  assert.equal(classic.reserveStatus, "not_applicable");
  assert.ok(classic.energyNeedWh > 0);
});

test("ein zweiter Akku senkt den prozentualen Verbrauch bei gleichem Energiebedarf", () => {
  const oneBattery = energyProjection({
    profile: {
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: { ...riderBikeProfile.bike.ebike, batteryCount: 1 }
      }
    }
  });
  const twoBatteries = energyProjection({
    profile: {
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: { ...riderBikeProfile.bike.ebike, batteryCount: 2 }
      }
    }
  });

  assert.equal(twoBatteries.batteryEnergyWh, oneBattery.batteryEnergyWh);
  assert.ok((twoBatteries.batteryConsumptionPercent ?? 100) < (oneBattery.batteryConsumptionPercent ?? 0));
  assert.ok((twoBatteries.remainingEnergyWh ?? 0) > (oneBattery.remainingEnergyWh ?? 0));
});

test("warnt bei unterschrittener Reserve und leerer nutzbarer Kapazität", () => {
  const belowReserve = energyProjection({
    distanceKm: 90,
    elevationUp: 900,
    elevationProfile: measuredClimbProfile(90, 900),
    profile: {
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: {
          ...riderBikeProfile.bike.ebike,
          batteryCapacityWh: 400,
          batteryCount: 1,
          usableBatteryCapacityPercent: 80,
          desiredReservePercent: 30
        }
      }
    }
  });

  assert.ok(belowReserve.reserveStatus === "below_reserve" || belowReserve.reserveStatus === "depleted");
  assert.ok(belowReserve.reserveWarning);
});

test("kennzeichnet fehlende oder unvollständige Höhendaten mit niedriger Qualität", () => {
  const missing = energyProjection({
    distanceKm: 60,
    elevationUp: 600,
    elevationDown: 400,
    elevationProfile: [],
    elevationDataStatus: "missing"
  });
  const incomplete = energyProjection({
    distanceKm: 60,
    elevationUp: 300,
    elevationDown: 0,
    elevationProfile: [
      { distanceKm: 0, elevationM: 100 },
      { distanceKm: 10, elevationM: 400 }
    ],
    elevationDataStatus: "measured"
  });

  assert.equal(missing.quality, "low");
  assert.equal(incomplete.quality, "low");
  assert.ok(missing.qualityReasons.length > 0);
  assert.ok(incomplete.qualityReasons.length > 0);
});

test("exportiert und importiert ein validiertes BikeTripHub-Profil", () => {
  const profileExport = createRiderBikeProfileExport(riderBikeProfile, "2026-07-29T20:00:00.000Z");
  const restored = parseRiderBikeProfileExport(JSON.stringify(profileExport));

  assert.equal(profileExport.schema, RIDER_BIKE_PROFILE_EXPORT_SCHEMA);
  assert.equal(restored?.rider.name, "Testfahrerin");
  assert.equal(restored?.bike.ebike.batteryCapacityWh, 625);
  assert.equal(restored?.bike.ebike.chargerPowerW, 180);
  assert.equal(restored?.bike.ebike.personalRidingStyle, "economical");
  assert.equal(parseRiderBikeProfileExport(JSON.stringify({ ...profileExport, schema: "unknown" })), null);
});

test("bewahrt das Fahrer- und Fahrradprofil im TourState", () => {
  const stored = parseStoredTourState(
    JSON.stringify({
      route: { geometryGeoJson: { type: "LineString", coordinates: [[13, 51], [13.1, 51.1]] } },
      stages: [],
      pois: [],
      inputMode: "direct",
      riderBikeProfile,
      updatedAt: "2026-07-29T20:00:00.000Z"
    })
  );

  assert.equal(stored?.riderBikeProfile?.rider.name, "Testfahrerin");
  assert.equal(stored?.riderBikeProfile?.bike.type, "ebike");
  assert.equal(stored?.riderBikeProfile?.bike.ebike.desiredReservePercent, 25);
  assert.equal(stored?.riderBikeProfile?.bike.ebike.chargingLossPercent, 12);
});

test("übernimmt das Profil in Tour-Speicherung und Tour-JSON", () => {
  const stored = parseStoredTourState(
    JSON.stringify({
      route: { geometryGeoJson: { type: "LineString", coordinates: [[13, 51], [13.1, 51.1]] } },
      stages: [],
      pois: [],
      inputMode: "direct",
      riderBikeProfile,
      updatedAt: "2026-07-29T20:00:00.000Z"
    })
  );
  assert.ok(stored);

  const entry = createTourLibraryEntry(stored, {
    id: "tour-profile-test",
    name: "Profiltest",
    now: "2026-07-29T20:00:00.000Z"
  });
  const restored = parseTourExport(
    JSON.stringify(createTourExport(entry, "2026-07-29T20:05:00.000Z"))
  );

  assert.equal(restored?.state.riderBikeProfile?.rider.name, "Testfahrerin");
  assert.equal(restored?.state.riderBikeProfile?.bike.ebike.batteryCount, 2);
  assert.equal(restored?.state.riderBikeProfile?.bike.ebike.motorAssistancePercent, 140);
});

test("Planungsbereiche erlauben nur ihre eigenen Arbeitsschritte", () => {
  assert.equal(isPlannerStepForWorkflow("overview", "route"), true);
  assert.equal(isPlannerStepForWorkflow("stage-edit", "route"), false);
  assert.equal(isPlannerStepForWorkflow("stage-create", "stages"), true);
  assert.equal(isPlannerStepForWorkflow("trim", "stages"), false);
  assert.equal(normalizePlannerStep("stages"), "stage-edit");
});

test("Etappenplanung übernimmt die gemeinsame Route ohne Routenarbeitsschritt", () => {
  assert.equal(
    resolvePlannerStep({
      workflowView: "stages",
      preferredStep: "overview",
      inputMode: "gpx",
      hasRoute: true,
      hasStages: false
    }),
    "stage-create"
  );
  assert.equal(
    resolvePlannerStep({
      workflowView: "stages",
      inputMode: "direct",
      hasRoute: true,
      hasStages: true
    }),
    "stage-edit"
  );
});

const routeGeometry: LineStringGeoJson = {
  type: "LineString",
  coordinates: [
    [13.0, 51.0],
    [13.05, 51.02],
    [13.1, 51.04]
  ]
};

function createLinearRoute(distanceKm: number, pointCount = 121): LineStringGeoJson {
  const latitudeDelta = distanceKm / 111.195;
  return {
    type: "LineString",
    coordinates: Array.from({ length: pointCount }, (_, index) => [
      10,
      48 + latitudeDelta * (index / (pointCount - 1))
    ])
  };
}

function createRollingElevationProfile(totalDistanceKm: number): ElevationPoint[] {
  const points: ElevationPoint[] = [];
  for (let distanceKm = 0; distanceKm < totalDistanceKm; distanceKm += 10) {
    points.push({
      distanceKm,
      elevationM: Math.floor(distanceKm / 10) % 2 === 0 ? 100 : 250
    });
  }
  points.push({
    distanceKm: totalDistanceKm,
    elevationM: Math.floor(totalDistanceKm / 10) % 2 === 0 ? 100 : 250
  });
  return points;
}

const stage: AccommodationStageInput & { distanceKm: number } = {
  id: "stage-1",
  dayNumber: 1,
  endName: "Teststadt",
  distanceKm: 64,
  geometryGeoJson: routeGeometry
};

test("uses the full native map zoom range without limiting manual controls to the route", () => {
  assert.equal(MAP_MIN_ZOOM, 0);
  assert.equal(MAP_MAX_ZOOM, 22);
  assert.equal(OSM_SOURCE_MAX_ZOOM, 19);
  assert.equal(CYCLOSM_SOURCE_MAX_ZOOM, 20);
  assert.ok(OSM_SOURCE_MAX_ZOOM < MAP_MAX_ZOOM);
  assert.ok(CYCLOSM_SOURCE_MAX_ZOOM < MAP_MAX_ZOOM);
  assert.ok(MAP_AUTO_FIT_MAX_ZOOM > MAP_MIN_ZOOM);
  assert.ok(MAP_AUTO_FIT_MAX_ZOOM < MAP_MAX_ZOOM);
});

test("labels real OSM accommodation data distinctly", () => {
  assert.equal(accommodationDataQualityLabel("osm"), "OSM-Daten");
  assert.equal(accommodationTypeFromTags({ tourism: "guest_house" }), "pension");
  assert.equal(accommodationTypeFromTags({ tourism: "camp_site" }), "camping");
  assert.equal(accommodationTypeFromTags({}), null);
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
  assert.equal(candidate.type, "hotel");
  assert.equal(candidate.source, "OpenStreetMap");
  assert.equal(candidate.dataQuality, "osm");
  assert.equal(candidate.status, "suggested");
  assert.equal(candidate.link, "https://hotel.example.invalid");
});

test("stores only explicitly evidenced bicycle accommodation features", () => {
  const features = accommodationFeaturesFromTags({
    bicycle_parking: "yes",
    "bicycle_parking:lockable": "no",
    "service:bicycle:charging": "customers"
  });

  assert.deepEqual(evidencedAccommodationFeatures(features), ["bikeParking", "ebikeCharging"]);
  assert.equal(features.lockableBikeRoom, undefined);
  assert.equal(features.luggageStorage, undefined);
});

test("applies accommodation type, route, stage-end and bicycle-feature filters without generated fallback", () => {
  const pois: AccommodationPoiInput[] = [
    {
      id: "hotel",
      name: "Hotel",
      category: "ACCOMMODATION",
      lat: 51.0402,
      lon: 13.1002,
      source: "manual",
      tagsJson: { tourism: "hotel" }
    },
    {
      id: "camp",
      name: "Camping",
      category: "ACCOMMODATION",
      lat: 51.0402,
      lon: 13.1002,
      source: "manual",
      tagsJson: { tourism: "camp_site", bicycle_parking: "yes" }
    }
  ];

  const candidates = rankStageAccommodationCandidates(stage, routeGeometry, pois, 12, {
    types: ["camping"],
    maxDistanceToRouteKm: 2,
    maxDistanceToStageEndKm: 2,
    bicycleFeaturesOnly: true
  });
  assert.deepEqual(candidates.map((candidate) => candidate.type), ["camping"]);
  assert.deepEqual(
    rankStageAccommodationCandidates(stage, routeGeometry, [], 12, {
      types: ["hotel"],
      maxDistanceToRouteKm: 5,
      maxDistanceToStageEndKm: 5
    }),
    []
  );
});

test("selects accommodation providers explicitly and keeps production endpoint configuration-only", async () => {
  assert.ok(createAccommodationProvider({ NODE_ENV: "production" }) instanceof ProductionProvider);
  assert.ok(createAccommodationProvider({ NODE_ENV: "development" }) instanceof DevelopmentProvider);
  assert.ok(createAccommodationProvider({ ACCOMMODATION_PROVIDER: "local-test" }) instanceof LocalTestProvider);

  const result = await new ProductionProvider({ endpoint: "" }).search({
    routeId: "route-1",
    geometry: routeGeometry,
    corridorKm: 5
  });
  assert.equal(result.pois.length, 0);
  assert.match(result.warning ?? "", /nicht konfiguriert/i);
});

test("forwards explicit accommodation provider settings to the Raspberry Pi app container", () => {
  const compose = readFileSync(new URL("../docker-compose.rpi.yml", import.meta.url), "utf8");

  assert.match(compose, /ACCOMMODATION_PROVIDER: "\$\{ACCOMMODATION_PROVIDER:-production\}"/);
  assert.match(compose, /ACCOMMODATION_API_URL: "\$\{ACCOMMODATION_API_URL:-\}"/);
  assert.match(compose, /ACCOMMODATION_TIMEOUT_MS: "\$\{ACCOMMODATION_TIMEOUT_MS:-4000\}"/);
  assert.match(compose, /ACCOMMODATION_CACHE_TTL_MS: "\$\{ACCOMMODATION_CACHE_TTL_MS:-900000\}"/);
  assert.doesNotMatch(compose, /ACCOMMODATION_API_URL: "https?:\/\/.*overpass/i);
});

test("routes accommodation detours with separate BRouter out-and-back geometry", async () => {
  const calls: Array<{ start: [number, number]; end: [number, number] }> = [];
  const detour = await calculateAccommodationDetour(
    [13.1, 51.04],
    [13.11, 51.045],
    "balanced",
    async (start, end) => {
      calls.push({ start, end });
      return {
        coordinates: [
          [start[0], start[1]],
          [end[0], end[1]]
        ],
        distanceKm: calls.length === 1 ? 1.2 : 1.3,
        elevationUp: 0,
        elevationDown: 0,
        durationSeconds: 0
      };
    }
  );

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], { start: [13.1, 51.04], end: [13.11, 51.045] });
  assert.deepEqual(calls[1], { start: [13.11, 51.045], end: [13.1, 51.04] });
  assert.equal(detour.distanceKm, 2.5);
  assert.equal(detour.geometryGeoJson.coordinates.length, 3);
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
    assert.equal(route.elevationSource, "estimated");
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

test("commits a direct-route replacement only after calculation succeeds", async () => {
  let currentRoute = "bestehende Tour";

  await assert.rejects(
    () =>
      replaceRouteAfterSuccessfulCalculation(
        async () => {
          throw new Error("BRouter nicht erreichbar");
        },
        (nextRoute) => {
          currentRoute = nextRoute;
        }
      ),
    /BRouter nicht erreichbar/
  );
  assert.equal(currentRoute, "bestehende Tour");

  await replaceRouteAfterSuccessfulCalculation(
    async () => "neue Route",
    (nextRoute) => {
      currentRoute = nextRoute;
    }
  );
  assert.equal(currentRoute, "neue Route");
});

test("accepts 20 intermediate destinations and rejects the 21st", () => {
  const accepted = routeCalculateSchema.safeParse({
    start: "Hamburg",
    end: "Berlin",
    waypoints: Array.from({ length: MAX_ROUTE_WAYPOINTS }, (_, index) => `Ort ${index + 1}`)
  });
  const rejected = routeCalculateSchema.safeParse({
    start: "Hamburg",
    end: "Berlin",
    waypoints: Array.from({ length: MAX_ROUTE_WAYPOINTS + 1 }, (_, index) => `Ort ${index + 1}`)
  });

  assert.equal(accepted.success, true);
  assert.equal(rejected.success, false);
  if (!rejected.success) {
    assert.match(rejected.error.issues[0].message, /Maximal 20 Zwischenziele/);
  }
});

function brouterFeature(
  coordinates: number[][],
  properties: Record<string, unknown> = {}
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

test("builds technically distinct BRouter requests for all advertised bicycle profiles", () => {
  const profiles = ["balanced", "cycleways", "low_elevation", "touristic", "sportive"] as const;
  const urls = profiles.map((profile) =>
    buildBRouterUrl("https://routing.example.test/brouter", [13.7373, 51.0504], [13.9407, 50.9625], profile)
  );

  assert.equal(new Set(urls.map((url) => url.search)).size, profiles.length);
  assert.equal(urls[0].searchParams.get("profile:ignore_cycleroutes"), "1");
  assert.equal(urls[1].searchParams.get("profile"), "safety");
  assert.equal(urls[2].searchParams.get("profile:uphillcost"), "500");
  assert.equal(urls[2].searchParams.get("profile:downhillcost"), "500");
  assert.equal(urls[3].searchParams.get("profile:stick_to_cycleroutes"), "1");
  assert.equal(urls[4].searchParams.get("profile"), "fastbike");
  assert.equal(urls[4].searchParams.get("format"), "geojson");
  assert.equal(urls[4].searchParams.get("lonlats"), "13.737300,51.050400|13.940700,50.962500");
  assert.equal(brouterProfileByRoutingProfile.cycleways, "safety");
  assert.equal(brouterProfileByRoutingProfile.touristic, "trekking");
  assert.match(brouterProfileConfigurationByRoutingProfile.low_elevation.displayName, /wenig Steigung/);
});

test("reports bicycle infrastructure and signed cycle-route networks from BRouter messages", () => {
  const coverage = analyzeBRouterCycleCoverage(
    [
      ["Distance", "WayTags"],
      [4000, "highway=cycleway route_bicycle_ncn=yes route_bicycle_rcn=yes"],
      [3000, "highway=path bicycle=designated route_bicycle_rcn=yes"],
      [3000, "highway=residential cycleway=no"]
    ],
    10
  );

  assert.equal(coverage.dataAvailable, true);
  assert.equal(coverage.bicycleInfrastructureDistanceKm, 7);
  assert.equal(coverage.bicycleInfrastructurePercent, 70);
  assert.equal(coverage.signedCycleRouteDistanceKm, 7);
  assert.equal(coverage.signedCycleRoutePercent, 70);
  assert.equal(coverage.networkDistanceKm.ncn, 4);
  assert.equal(coverage.networkDistanceKm.rcn, 7);
});

test("keeps cycle-route coverage in the stored browser tour state", () => {
  const coverage = analyzeBRouterCycleCoverage(
    [
      ["Distance", "WayTags"],
      [6000, "highway=cycleway route_bicycle_ncn=yes"],
      [4000, "highway=residential cycleway=no"]
    ],
    10
  );
  const stored = parseStoredTourState(
    JSON.stringify({
      route: { geometryGeoJson: routeGeometry, cycleRouteCoverage: coverage },
      stages: [],
      pois: [],
      inputMode: "direct",
      updatedAt: "2026-07-20T12:00:00.000Z"
    })
  );

  assert.equal(stored?.route?.cycleRouteCoverage?.signedCycleRouteDistanceKm, 6);
  assert.equal(stored?.route?.cycleRouteCoverage?.bicycleInfrastructurePercent, 60);
});

test("derives long-route anchors from a previously routed corridor", () => {
  const routedCorridor = [
    [9.9937, 53.5511],
    [10.8, 54.15],
    [12.2, 54.0],
    [13.405, 52.52]
  ] satisfies LineStringGeoJson["coordinates"];
  const anchors = createRoutingAnchorsFromRoutedPath(routedCorridor, 80);

  assert.ok(anchors.length > 2);
  assert.deepEqual(anchors[0], routedCorridor[0]);
  assert.deepEqual(anchors[anchors.length - 1], routedCorridor[routedCorridor.length - 1]);
  assert.ok(anchors.every((anchor) => distancePointToLineKm(anchor, routedCorridor) < 0.5));
  assert.ok(
    anchors.slice(1).every((anchor, index) => routeDistanceKm([anchors[index], anchor]) <= 80.1),
    "routed sections should respect the configured maximum"
  );
  assert.notDeepEqual(anchors[Math.floor(anchors.length / 2)], [
    (routedCorridor[0][0] + routedCorridor[routedCorridor.length - 1][0]) / 2,
    (routedCorridor[0][1] + routedCorridor[routedCorridor.length - 1][1]) / 2
  ]);
});

test("segments a long request only with anchors from the routed BRouter corridor", async () => {
  const routedCorridor = [
    [9.9937, 53.5511, 10],
    [10.8, 54.15, 20],
    [12.2, 54.0, 35],
    [13.405, 52.52, 50]
  ];
  const requestedUrls: URL[] = [];
  const fetcher = async (input: string | URL | Request) => {
    const url = new URL(String(input));
    requestedUrls.push(url);
    if (requestedUrls.length === 1) {
      return new Response(
        JSON.stringify(
          brouterFeature(routedCorridor, {
            "track-length": String(routeDistanceKm(routedCorridor.map(([lon, lat]) => [lon, lat])) * 1000),
            "filtered ascend": "200",
            "total-time": "48000"
          })
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const [start, end] = (url.searchParams.get("lonlats") ?? "").split("|").map((value) => value.split(",").map(Number));
    const distanceKm = routeDistanceKm([start as [number, number], end as [number, number]]);
    return new Response(
      JSON.stringify(
        brouterFeature(
          [
            [start[0], start[1], 20],
            [end[0], end[1], 30]
          ],
          {
            "track-length": String(distanceKm * 1000),
            "filtered ascend": "60",
            "total-time": String((distanceKm / 15) * 3600)
          }
        )
      ),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const route = await calculateRoadRoute(
    { start: "Hamburg", end: "Berlin", profile: "touristic" },
    { baseUrl: "https://routing.example.test/brouter", maxSegmentKm: 100, fetcher }
  );

  assert.ok(requestedUrls.length > 2);
  assert.equal(requestedUrls[0].searchParams.get("profile"), "shortest");
  assert.equal(requestedUrls[0].searchParams.has("profile:ignore_cycleroutes"), false);
  assert.ok(
    requestedUrls.slice(1).every((url) => url.searchParams.get("profile:stick_to_cycleroutes") === "1")
  );
  const corridor2d = routedCorridor.map(([lon, lat]) => [lon, lat] as [number, number]);
  const internalAnchors = requestedUrls.slice(2).map((url) => {
    const [lon, lat] = (url.searchParams.get("lonlats") ?? "").split("|")[0].split(",").map(Number);
    return [lon, lat] as [number, number];
  });
  assert.ok(internalAnchors.every((anchor) => distancePointToLineKm(anchor, corridor2d) < 0.5));
  assert.equal(route.routingProfileName, "trekking / Radwanderwege");
});

test("reports a clear error when a long routable corridor cannot be established", async () => {
  const fetcher = async () => new Response("routing engine unavailable", { status: 503 });

  await assert.rejects(
    () =>
      calculateRoadRoute(
        { start: "Hamburg", end: "Berlin", profile: "balanced" },
        { baseUrl: "https://routing.example.test/brouter", maxSegmentKm: 80, fetcher }
      ),
    /keine frei erzeugten Luftlinien-Hilfspunkte/
  );
});

test("combines routed BRouter segments without replacing them by straight lines", async () => {
  const replies = [
    brouterFeature(
      [
        [13.7373, 51.0504, 110],
        [13.66, 51.14, 145],
        [13.4775, 51.1616, 120]
      ],
      {
        "track-length": "18500",
        "filtered ascend": "120",
        "total-time": "3600",
        messages: [
          ["Distance", "WayTags"],
          [10000, "highway=cycleway route_bicycle_rcn=yes"],
          [8500, "highway=residential cycleway=no"]
        ]
      }
    ),
    brouterFeature(
      [
        [13.4775, 51.1616, 120],
        [12.8, 52.1, 90],
        [9.9937, 53.5511, 12]
      ],
      {
        "track-length": "410000",
        "filtered ascend": "800",
        "total-time": "72000",
        messages: [
          ["Distance", "WayTags"],
          [205000, "highway=path bicycle=yes route_bicycle_ncn=yes"],
          [205000, "highway=secondary cycleway=no"]
        ]
      }
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
  assert.equal(route.elevationSource, "provider");
  assert.equal(route.routingProfileName, "trekking / ausgewogen");
  assert.equal(route.distanceKm, 428.5);
  assert.equal(route.geometryGeoJson.coordinates.length, 5);
  assert.deepEqual(route.geometryGeoJson.coordinates[1], [13.66, 51.14]);
  assert.equal(route.waypoints[1].name, "Meissen");
  assert.deepEqual([route.waypoints[1].lon, route.waypoints[1].lat], [13.4775, 51.1616]);
  assert.ok(route.elevationProfile.length >= 2);
  assert.equal(route.cycleRouteCoverage?.dataAvailable, true);
  assert.equal(route.cycleRouteCoverage?.bicycleInfrastructureDistanceKm, 10);
  assert.equal(route.cycleRouteCoverage?.signedCycleRouteDistanceKm, 215);
  assert.equal(route.cycleRouteCoverage?.networkDistanceKm.ncn, 205);
});

test("marks BRouter elevation as estimated when route coordinates have no height values", async () => {
  const fetcher = async () =>
    new Response(
      JSON.stringify(
        brouterFeature(
          [
            [13.7373, 51.0504],
            [13.82, 51.01],
            [13.9407, 50.9625]
          ],
          { "track-length": "18000", "filtered ascend": "120", "total-time": "3600" }
        )
      ),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  const route = await calculateRoadRoute(
    { start: "Dresden", end: "Pirna", profile: "balanced" },
    { baseUrl: "https://routing.example.test/brouter", fetcher }
  );

  assert.equal(route.elevationSource, "estimated");
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

test("slices and rebases the real elevation profile for a trimmed working route", () => {
  const profile = [
    { distanceKm: 0, elevationM: 100 },
    { distanceKm: 10, elevationM: 200 },
    { distanceKm: 20, elevationM: 100 }
  ];

  assert.deepEqual(sliceElevationProfile(profile, 5, 15), [
    { distanceKm: 0, elevationM: 150 },
    { distanceKm: 5, elevationM: 200 },
    { distanceKm: 10, elevationM: 150 }
  ]);
  assert.deepEqual(elevationMetricsForRange(profile, 5, 15), {
    elevationUp: 50,
    elevationDown: 50,
    elevationProfile: [
      { distanceKm: 0, elevationM: 150 },
      { distanceKm: 5, elevationM: 200 },
      { distanceKm: 10, elevationM: 150 }
    ]
  });
});

test("uses real elevation values when cutting a stage from the route", () => {
  const geometry = createLinearRoute(100);
  const totalDistanceKm = routeDistanceKm(geometry.coordinates);
  const profile = [
    { distanceKm: 0, elevationM: 100 },
    { distanceKm: totalDistanceKm / 2, elevationM: 600 },
    { distanceKm: totalDistanceKm, elevationM: 200 }
  ];

  const stageSlice = createValidatedStageSliceFromBounds(
    geometry,
    totalDistanceKm * 0.25,
    totalDistanceKm * 0.75,
    0,
    profile
  );

  assert.equal(stageSlice.ok, true);
  if (stageSlice.ok) {
    assert.equal(stageSlice.elevationUp, 250);
    assert.equal(stageSlice.elevationDown, 200);
  }
});

test("plans shorter easy stages on a hilly route than on a flat route of equal length", () => {
  const geometry = createLinearRoute(240);
  const totalDistanceKm = routeDistanceKm(geometry.coordinates);
  const flatProfile = [
    { distanceKm: 0, elevationM: 100 },
    { distanceKm: totalDistanceKm, elevationM: 100 }
  ];
  const rollingProfile = createRollingElevationProfile(totalDistanceKm);

  const flatPlan = planStagesByDifficulty(geometry, flatProfile, "easy");
  const rollingPlan = planStagesByDifficulty(geometry, rollingProfile, "easy");

  assert.ok(rollingPlan.stages.length > flatPlan.stages.length);
  assert.ok(
    Math.max(...rollingPlan.stages.map((stage) => stage.distanceKm)) <
      Math.max(...flatPlan.stages.map((stage) => stage.distanceKm))
  );
  assert.equal(rollingPlan.targetMet, true);
  assert.ok(rollingPlan.stages.every((stage) => stage.difficulty.effortScore <= rollingPlan.maxScore));
});

test("keeps difficulty-planned stages contiguous and uses fewer stages for a higher target", () => {
  const geometry = createLinearRoute(300);
  const totalDistanceKm = routeDistanceKm(geometry.coordinates);
  const profile = createRollingElevationProfile(totalDistanceKm);
  const easyPlan = planStagesByDifficulty(geometry, profile, "easy");
  const moderatePlan = planStagesByDifficulty(geometry, profile, "moderate");

  assert.ok(moderatePlan.stages.length <= easyPlan.stages.length);
  assert.equal(easyPlan.stages[0].routeStartKm, 0);
  assert.ok(Math.abs(easyPlan.stages[easyPlan.stages.length - 1].routeEndKm - totalDistanceKm) < 0.2);
  for (let index = 1; index < easyPlan.stages.length; index += 1) {
    assert.equal(easyPlan.stages[index].routeStartKm, easyPlan.stages[index - 1].routeEndKm);
  }
});

test("falls back to estimated elevation with an explicit warning", () => {
  const plan = planStagesByDifficulty(
    createLinearRoute(120),
    [
      { distanceKm: 0, elevationM: 100 },
      { distanceKm: 20, elevationM: 200 }
    ],
    "moderate"
  );

  assert.equal(plan.usedEstimatedElevation, true);
  assert.ok(plan.stages.length > 0);
  assert.ok(plan.warnings.some((warning) => warning.includes("geschätzte Höhendaten")));
});

test("marks a complete synthetic profile as estimated when its source says so", () => {
  const geometry = createLinearRoute(120);
  const totalDistanceKm = routeDistanceKm(geometry.coordinates);
  const plan = planStagesByDifficulty(
    geometry,
    [
      { distanceKm: 0, elevationM: 100 },
      { distanceKm: totalDistanceKm, elevationM: 100 }
    ],
    "moderate",
    { elevationEstimated: true }
  );

  assert.equal(plan.usedEstimatedElevation, true);
  assert.ok(plan.warnings.some((warning) => warning.includes("geschätzte Höhendaten")));
});

test("validates and restores the selected difficulty planning mode", () => {
  const request = autoStageSchema.parse({
    targetDifficulty: "hard",
    elevationEstimated: true,
    elevationProfile: [
      { distanceKm: 0, elevationM: 100 },
      { distanceKm: 50, elevationM: 500 }
    ]
  });
  assert.equal(request.targetDifficulty, "hard");
  assert.equal(request.elevationEstimated, true);
  assert.equal(request.elevationProfile.length, 2);

  const stored = parseStoredTourState(
    JSON.stringify({
      route: { geometryGeoJson: routeGeometry },
      stages: [],
      pois: [],
      inputMode: "gpx",
      stageGenerationMode: "difficulty",
      difficultyTarget: "hard",
      updatedAt: "2026-07-20T12:00:00.000Z"
    })
  );

  assert.equal(stored?.stageGenerationMode, "difficulty");
  assert.equal(stored?.difficultyTarget, "hard");
});
