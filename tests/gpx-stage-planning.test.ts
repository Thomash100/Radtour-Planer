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
import { APP_NAVIGATION_ITEMS, activeNavigationId } from "../src/lib/app-navigation";
import { normalizeDirectRouteInput, normalizeRouteCalculationPayload, parseRouteExpression } from "../src/lib/direct-route-input";
import { replaceRouteAfterSuccessfulCalculation } from "../src/lib/direct-route-replacement";
import {
  calculateStageEnergyProjection,
  type StageEnergyProjectionInput
} from "../src/lib/ebike-energy";
import {
  EBIKE_ASSISTANCE_MODEL_VERSION,
  assistanceGradeBandFor,
  assistanceStrategyFromProfile,
  calculateStageAssistancePlan,
  type AssistanceModeDefinition,
  type StageAssistancePlanInput
} from "../src/lib/ebike-assistance";
import {
  buildTourChargingSegments,
  calculateChargingPlan,
  normalizeChargingPlanningState,
  serializeChargingPlanningState,
  type ChargingEnergySegment,
  type ChargingPoint
} from "../src/lib/ebike-charging";
import {
  EBIKE_RIDING_STRATEGY_MODEL_VERSION,
  calculateRidingStrategy,
  normalizeRidingStrategyState,
  ridingStrategyPlanSnapshot,
  serializeRidingStrategyState,
  type RidingStrategyInput,
  type RidingStrategySegmentInput
} from "../src/lib/ebike-riding-strategy";
import {
  createValidatedStageSliceFromBounds,
  distancePointToLineKm,
  elevationMetricsForRange,
  routeDistanceKm,
  sliceElevationProfile,
  type ElevationPoint,
  type LineStringGeoJson
} from "../src/lib/geo";
import { parseGpx } from "../src/lib/gpx";
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
  parseRiderBikeProfileValue,
  type RiderBikeProfile
} from "../src/lib/rider-bike-profile";
import {
  createTourExport,
  createTourLibraryEntry,
  parseTourExport
} from "../src/lib/tour-library";
import { calculateStageDifficulty } from "../src/lib/stage-difficulty";
import { planStagesByDifficulty } from "../src/lib/stage-planning";
import { parseStoredTourState } from "../src/lib/tour-state";
import {
  ROUTE_CONDITION_MODEL_VERSION,
  analyzeRouteCondition,
  analyzeRouteConditionSlice,
  classifySlope,
  classifySurface,
  classifyWayType,
  normalizeRouteConditionStoredState,
  parseBRouterConditionSegments,
  routeConditionStateSnapshot,
  serializeRouteConditionStoredState,
  smoothElevationProfile,
  type RouteConditionSourceSegment
} from "../src/lib/route-elevation-surface";
import { autoStageSchema, routeCalculateSchema } from "../src/lib/validators";
import {
  DEFAULT_ROUTE_OPTIMIZATION_CONSTRAINTS,
  DEFAULT_ROUTE_OPTIMIZATION_STATE,
  ROUTE_OPTIMIZATION_MODEL_VERSION,
  evaluateRouteOptimizationConstraints,
  normalizeRouteOptimizationStoredState,
  normalizeRouteOptimizationWeights,
  optimizeRouteCandidates,
  routeOptimizationObjectives,
  routeOptimizationPresets,
  routeOptimizationStateSnapshot,
  serializeRouteOptimizationStoredState,
  type RouteCandidate,
  type RouteOptimizationConstraints,
  type RouteOptimizationWeights
} from "../src/lib/route-optimizer";
import { buildRouteCandidateFromStoredTour } from "../src/lib/route-optimizer-candidate";
import { STAGE_COLOR_PALETTE, buildMiniElevationGeometry, stageColorForDay } from "../src/lib/stage-visuals";
import {
  DEFAULT_UI_PREFERENCES,
  normalizeUiPreferences,
  parseUiPreferences,
  serializeUiPreferences
} from "../src/lib/ui-preferences";

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

const elevationComparisonProfile: RiderBikeProfile = {
  ...riderBikeProfile,
  rider: {
    ...riderBikeProfile.rider,
    bodyWeightKg: 75
  },
  bike: {
    ...riderBikeProfile.bike,
    bikeWeightKg: 24,
    luggageWeightKg: 12,
    ebike: {
      ...riderBikeProfile.bike.ebike,
      batteryCapacityWh: 500,
      batteryCount: 1,
      usableBatteryCapacityPercent: 100,
      motorAssistancePercent: 100,
      referenceRangeKm: 80,
      desiredReservePercent: 20,
      personalRidingStyle: "balanced"
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

const constantGradeProfile = (distanceKm: number, gradePercent: number, stepKm = 0.25) =>
  Array.from({ length: Math.ceil(distanceKm / stepKm) + 1 }, (_, index) => {
    const pointDistanceKm = Math.min(index * stepKm, distanceKm);
    return {
      distanceKm: pointDistanceKm,
      elevationM: 100 + pointDistanceKm * 10 * gradePercent
    };
  }).filter((point, index, points) => index === 0 || point.distanceKm > points[index - 1].distanceKm);

function assistancePlan(overrides: Partial<StageAssistancePlanInput> = {}) {
  return calculateStageAssistancePlan({
    profile: riderBikeProfile,
    distanceKm: 12,
    elevationProfile: constantGradeProfile(12, 4),
    elevationDataStatus: "measured",
    strategy: "balanced",
    startingBatteryCapacityPercent: 100,
    remainingDistanceKm: 12,
    remainingElevationUpM: 480,
    ...overrides
  });
}

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

function elevationComparisonProjection(
  elevationUp: number,
  elevationDown = elevationUp,
  profile: RiderBikeProfile = elevationComparisonProfile
) {
  return calculateStageEnergyProjection({
    profile,
    distanceKm: 100,
    elevationUp,
    elevationDown,
    elevationProfile: [],
    elevationDataStatus: "missing"
  });
}

const chargingTestProfile = {
  ...riderBikeProfile,
  rider: {
    ...riderBikeProfile.rider,
    bodyWeightKg: 75
  },
  bike: {
    ...riderBikeProfile.bike,
    luggageWeightKg: 12,
    ebike: {
      ...riderBikeProfile.bike.ebike,
      batteryCapacityWh: 500,
      batteryCount: 1,
      usableBatteryCapacityPercent: 100,
      motorAssistancePercent: 100,
      referenceRangeKm: 80,
      desiredReservePercent: 20,
      chargerPowerW: 250,
      chargingLossPercent: 10,
      personalRidingStyle: "balanced" as const
    }
  }
};

function chargingSegment(id: string, startKm: number, endKm: number, energyWh: number, stageId = "stage-1"): ChargingEnergySegment {
  return {
    id,
    stageId,
    stageDayNumber: stageId === "stage-1" ? 1 : 2,
    startKm,
    endKm,
    energyWh,
    durationHours: (endKm - startKm) / 20
  };
}

function chargingPoint(id: string, routeKm: number, powerW: number | null = 500): ChargingPoint {
  return {
    id,
    name: `Ladepunkt ${id}`,
    coordinate: [13 + routeKm / 1000, 51],
    routeKm,
    stageId: routeKm <= 50 ? "stage-1" : "stage-2",
    connectorTypes: ["Schuko"],
    powerW,
    operator: null,
    openingHours: null,
    costInfo: null,
    availability: "available",
    source: "manual"
  };
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
  assert.equal(first.modelVersion, "biketriphub-energy-v2");
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
      (rolling.physicalRawBatteryEnergyWh ?? 0) -
        rolling.motorMechanicalEnergyWh -
        rolling.conversionLossWh
    ) <= 1
  );
  assert.ok((rolling.batteryEnergyWh ?? 0) > (rolling.physicalRawBatteryEnergyWh ?? 0));
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

test("kalibriert 80 km flache Referenzstrecke auf 100 Prozent nutzbare Akkukapazität", () => {
  const projection = energyProjection({
    profile: {
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: {
          ...riderBikeProfile.bike.ebike,
          batteryCapacityWh: 500,
          batteryCount: 1,
          usableBatteryCapacityPercent: 100,
          motorAssistancePercent: 100,
          referenceRangeKm: 80,
          desiredReservePercent: 0
        }
      }
    },
    distanceKm: 80,
    elevationProfile: measuredFlatProfile(80)
  });

  assert.ok(Math.abs((projection.batteryEnergyWh ?? 0) - 500) <= 1);
  assert.ok(Math.abs((projection.batteryConsumptionPercent ?? 0) - 100) <= 0.1);
  assert.equal(projection.remainingCapacityPercent, 0);
  assert.equal(projection.projectedTotalRangeKm, 80);
  assert.equal(projection.calibration?.referenceConsumptionWhPerKm, 6.25);
});

test("hält nach 64 von 80 Referenzkilometern die Reserve von 20 Prozent gerade ein", () => {
  const projection = energyProjection({
    profile: {
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: {
          ...riderBikeProfile.bike.ebike,
          batteryCapacityWh: 500,
          batteryCount: 1,
          usableBatteryCapacityPercent: 100,
          motorAssistancePercent: 100,
          referenceRangeKm: 80,
          desiredReservePercent: 20
        }
      }
    },
    distanceKm: 64,
    elevationProfile: measuredFlatProfile(64)
  });

  assert.ok(Math.abs((projection.batteryConsumptionPercent ?? 0) - 80) <= 0.1);
  assert.ok(Math.abs((projection.remainingCapacityPercent ?? 0) - 20) <= 0.1);
  assert.equal(projection.reserveStatus, "sufficient");
  assert.equal(projection.calibration?.safeRangeKm, 64);
});

test("kennzeichnet 100 km bei 80 km Referenzreichweite als nicht ohne Laden fahrbar", () => {
  const projection = energyProjection({
    profile: {
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: {
          ...riderBikeProfile.bike.ebike,
          batteryCapacityWh: 500,
          batteryCount: 1,
          usableBatteryCapacityPercent: 100,
          motorAssistancePercent: 100,
          referenceRangeKm: 80,
          desiredReservePercent: 20
        }
      }
    },
    distanceKm: 100,
    elevationProfile: measuredFlatProfile(100)
  });

  assert.ok((projection.energyNeedWh ?? 0) > 500);
  assert.ok((projection.batteryConsumptionPercent ?? 0) >= 125);
  assert.equal(projection.remainingCapacityPercent, 0);
  assert.equal(projection.reserveStatus, "depleted");
  assert.notEqual(projection.batteryConsumptionPercent, 20);
});

test("erhöht den Akkuverbrauch bei 100 km monoton mit 100, 1000 und 2000 positiven Höhenmetern", () => {
  const flat = elevationComparisonProjection(100);
  const medium = elevationComparisonProjection(1000);
  const mountainous = elevationComparisonProjection(2000);

  assert.ok(flat.energyNeedWh < medium.energyNeedWh);
  assert.ok(medium.energyNeedWh < mountainous.energyNeedWh);
  assert.deepEqual(
    [flat.energyNeedWh, medium.energyNeedWh, mountainous.energyNeedWh],
    [635, 722, 819]
  );
  assert.deepEqual(
    [flat.batteryConsumptionPercent, medium.batteryConsumptionPercent, mountainous.batteryConsumptionPercent],
    [126.9, 144.4, 163.8]
  );
  assert.deepEqual(
    [flat.energyBreakdown?.positiveElevationM, medium.energyBreakdown?.positiveElevationM, mountainous.energyBreakdown?.positiveElevationM],
    [100, 1000, 2000]
  );
});

test("kalibriert nur den flachen Grundverbrauch und addiert den physikalischen Steigungszuschlag separat", () => {
  const projection = elevationComparisonProjection(1000);
  const breakdown = projection.energyBreakdown;

  assert.ok(breakdown);
  assert.equal(breakdown?.calibratedFlatBaseWh, 625);
  assert.equal(breakdown?.climbSurchargeWh, 173);
  assert.equal(breakdown?.descentReliefWh, 76);
  assert.equal(breakdown?.batteryWhPer100ElevationM, 17.3);
  assert.equal(
    breakdown?.totalCalibratedBatteryEnergyWh,
    (breakdown?.calibratedFlatBaseWh ?? 0) +
      (breakdown?.climbSurchargeWh ?? 0) -
      (breakdown?.descentReliefWh ?? 0)
  );
});

test("höheres Gesamtgewicht erhöht den unkalibrierten Steigungszuschlag", () => {
  const light = elevationComparisonProjection(1000, 1000, {
    ...elevationComparisonProfile,
    rider: { ...elevationComparisonProfile.rider, bodyWeightKg: 55 },
    bike: { ...elevationComparisonProfile.bike, luggageWeightKg: 5 }
  });
  const heavy = elevationComparisonProjection(1000, 1000, {
    ...elevationComparisonProfile,
    rider: { ...elevationComparisonProfile.rider, bodyWeightKg: 105 },
    bike: { ...elevationComparisonProfile.bike, luggageWeightKg: 30 }
  });

  assert.ok((heavy.energyBreakdown?.climbSurchargeWh ?? 0) > (light.energyBreakdown?.climbSurchargeWh ?? 0));
});

test("höhere Motorunterstützung erhöht den Akkuanteil am Steigungszuschlag", () => {
  const lowSupport = elevationComparisonProjection(1000, 1000, {
    ...elevationComparisonProfile,
    bike: {
      ...elevationComparisonProfile.bike,
      ebike: { ...elevationComparisonProfile.bike.ebike, motorAssistancePercent: 50 }
    }
  });
  const highSupport = elevationComparisonProjection(1000, 1000, {
    ...elevationComparisonProfile,
    bike: {
      ...elevationComparisonProfile.bike,
      ebike: { ...elevationComparisonProfile.bike.ebike, motorAssistancePercent: 250 }
    }
  });

  assert.ok((highSupport.energyBreakdown?.climbSurchargeWh ?? 0) > (lowSupport.energyBreakdown?.climbSurchargeWh ?? 0));
});

test("begrenzt Gefälle auf Entlastung ohne negative Akkuenergie oder Rekuperation", () => {
  const descent = elevationComparisonProjection(0, 2000);

  assert.equal(descent.energyBreakdown?.climbSurchargeWh, 0);
  assert.ok((descent.energyBreakdown?.descentReliefWh ?? 0) > 0);
  assert.ok((descent.batteryEnergyWh ?? -1) >= 0);
  assert.ok(descent.terrain.descent.batteryEnergyWh >= 0);
  assert.ok(descent.terrain.descent.descentReliefWh <= descent.terrain.descent.calibratedFlatBaseWh);
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
    },
    distanceKm: 40,
    elevationUp: 600,
    elevationProfile: measuredClimbProfile(40, 600)
  });
  const highSupport = energyProjection({
    profile: {
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: { ...riderBikeProfile.bike.ebike, motorAssistancePercent: 250 }
      }
    },
    distanceKm: 40,
    elevationUp: 600,
    elevationProfile: measuredClimbProfile(40, 600)
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

test("bezieht die persönliche Referenzreichweite auf die konfigurierte Gesamtakkuanzahl", () => {
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

  assert.equal(twoBatteries.physicalRawBatteryEnergyWh, oneBattery.physicalRawBatteryEnergyWh);
  assert.ok((twoBatteries.batteryEnergyWh ?? 0) > (oneBattery.batteryEnergyWh ?? 0));
  assert.equal(twoBatteries.batteryConsumptionPercent, oneBattery.batteryConsumptionPercent);
  assert.equal(twoBatteries.projectedTotalRangeKm, oneBattery.projectedTotalRangeKm);
  assert.ok((twoBatteries.remainingEnergyWh ?? 0) > (oneBattery.remainingEnergyWh ?? 0));
});

test("behandelt eine Kapazitätsänderung bei unveränderter Gesamtreferenzreichweite eindeutig", () => {
  const projectionForCapacity = (batteryCapacityWh: number) =>
    energyProjection({
      profile: {
        ...riderBikeProfile,
        bike: {
          ...riderBikeProfile.bike,
          ebike: {
            ...riderBikeProfile.bike.ebike,
            batteryCapacityWh,
            batteryCount: 1,
            usableBatteryCapacityPercent: 100,
            motorAssistancePercent: 100,
            referenceRangeKm: 80
          }
        }
      },
      distanceKm: 40,
      elevationProfile: measuredFlatProfile(40)
    });
  const smaller = projectionForCapacity(500);
  const larger = projectionForCapacity(750);

  assert.equal(smaller.batteryConsumptionPercent, 50);
  assert.equal(larger.batteryConsumptionPercent, 50);
  assert.equal(smaller.projectedTotalRangeKm, 80);
  assert.equal(larger.projectedTotalRangeKm, 80);
  assert.ok((larger.batteryEnergyWh ?? 0) > (smaller.batteryEnergyWh ?? 0));
});

test("begrenzt extreme Kalibrierungsfaktoren und weist die Begrenzung transparent aus", () => {
  const projection = energyProjection({
    profile: {
      ...riderBikeProfile,
      bike: {
        ...riderBikeProfile.bike,
        ebike: {
          ...riderBikeProfile.bike.ebike,
          batteryCapacityWh: 2500,
          batteryCount: 6,
          usableBatteryCapacityPercent: 100,
          motorAssistancePercent: 100,
          referenceRangeKm: 10
        }
      }
    },
    distanceKm: 10,
    elevationProfile: measuredFlatProfile(10)
  });

  assert.equal(projection.calibration?.limitApplied, true);
  assert.equal(projection.calibration?.appliedFactor, projection.calibration?.maximumFactor);
  assert.ok(projection.calibration?.warning);
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

test("plant bei ausreichender Kapazität keinen Ladehalt und bleibt deterministisch", () => {
  const input = {
    profile: chargingTestProfile,
    segments: [
      chargingSegment("segment-1", 0, 25, 100),
      chargingSegment("segment-2", 25, 50, 100)
    ],
    chargingPoints: [chargingPoint("point-1", 25)]
  };
  const first = calculateChargingPlan(input);
  const second = calculateChargingPlan(input);

  assert.deepEqual(first, second);
  assert.equal(first.modelVersion, "biketriphub-charging-v1");
  assert.equal(first.status, "feasible");
  assert.equal(first.stops.length, 0);
  assert.equal(first.firstCriticalPoint, null);
  assert.equal(first.totalTravelDurationHours, first.totalDrivingDurationHours);
});

test("kennzeichnet die erste kritische Stelle und plant einen minimalen automatischen Ladehalt", () => {
  const plan = calculateChargingPlan({
    profile: chargingTestProfile,
    segments: [
      chargingSegment("segment-1", 0, 30, 180),
      chargingSegment("segment-2", 30, 60, 180, "stage-2"),
      chargingSegment("segment-3", 60, 90, 180, "stage-2")
    ],
    chargingPoints: [chargingPoint("point-60", 60)]
  });

  assert.equal(plan.status, "feasible");
  assert.equal(plan.stops.length, 1);
  assert.equal(plan.stops[0].mode, "automatic");
  assert.equal(plan.stops[0].point.id, "point-60");
  assert.equal(plan.stops[0].arrivalEnergyWh, 140);
  assert.equal(plan.stops[0].departureEnergyWh, 280);
  assert.equal(plan.stops[0].addedBatteryEnergyWh, 140);
  assert.equal(plan.firstCriticalPoint?.routeKm, 66.67);
  assert.ok(plan.totalTravelDurationHours > plan.totalDrivingDurationHours);
});

test("plant mehrere Ladehalte in stabiler Routenreihenfolge", () => {
  const plan = calculateChargingPlan({
    profile: chargingTestProfile,
    segments: [
      chargingSegment("segment-1", 0, 25, 300),
      chargingSegment("segment-2", 25, 50, 300),
      chargingSegment("segment-3", 50, 75, 300, "stage-2"),
      chargingSegment("segment-4", 75, 100, 300, "stage-2")
    ],
    chargingPoints: [chargingPoint("point-25", 25), chargingPoint("point-50", 50), chargingPoint("point-75", 75)]
  });

  assert.equal(plan.status, "feasible");
  assert.deepEqual(plan.stops.map((stop) => stop.point.routeKm), [25, 50, 75]);
  assert.ok(plan.stops.every((stop) => stop.mode === "automatic"));
  assert.equal(plan.stages.length, 2);
  assert.equal(plan.stages.reduce((sum, stage) => sum + stage.energyNeedWh, 0), 1200);
});

test("warnt deterministisch wenn vor der Reserve kein Ladepunkt erreichbar ist", () => {
  const plan = calculateChargingPlan({
    profile: chargingTestProfile,
    segments: [chargingSegment("segment-1", 0, 100, 700)],
    chargingPoints: []
  });

  assert.equal(plan.status, "infeasible");
  assert.ok(plan.warnings.some((warning) => warning.code === "no_reachable_station"));
  assert.ok(plan.warnings.some((warning) => warning.code === "reserve_below"));
  assert.equal(plan.firstCriticalPoint?.routeKm, 57.14);
});

test("berechnet manuellen Ladehalt, Ziel-Ladung, Verluste und Ladezeit", () => {
  const point = chargingPoint("manual-point", 50, 500);
  const plan = calculateChargingPlan({
    profile: chargingTestProfile,
    segments: [
      chargingSegment("segment-1", 0, 50, 300),
      chargingSegment("segment-2", 50, 100, 300, "stage-2")
    ],
    chargingPoints: [point],
    manualStops: [{ id: "manual-stop-1", chargingPointId: point.id, order: 1, targetChargePercent: 80 }]
  });

  assert.equal(plan.status, "feasible");
  assert.equal(plan.stops[0].mode, "manual");
  assert.equal(plan.stops[0].manualStopId, "manual-stop-1");
  assert.equal(plan.stops[0].arrivalCapacityPercent, 40);
  assert.equal(plan.stops[0].departureCapacityPercent, 80);
  assert.equal(plan.stops[0].addedBatteryEnergyWh, 200);
  assert.equal(plan.stops[0].chargingLossWh, 20);
  assert.equal(plan.stops[0].chargingDurationMinutes, 53);
});

test("weist unbekannte Ladeleistung aus und verwendet reproduzierbar die Ladegerätleistung", () => {
  const point = chargingPoint("unknown-power", 50, null);
  const plan = calculateChargingPlan({
    profile: chargingTestProfile,
    segments: [
      chargingSegment("segment-1", 0, 50, 300),
      chargingSegment("segment-2", 50, 100, 300, "stage-2")
    ],
    chargingPoints: [point],
    manualStops: [{ id: "manual-stop-unknown", chargingPointId: point.id, order: 1, targetChargePercent: 100 }]
  });

  assert.equal(plan.stops[0].effectivePowerW, chargingTestProfile.bike.ebike.chargerPowerW);
  assert.ok(plan.warnings.some((warning) => warning.code === "unknown_power"));
});

test("warnt bei nicht verfügbarem manuellem Ladepunkt", () => {
  const point = { ...chargingPoint("unavailable", 50), availability: "unavailable" as const };
  const plan = calculateChargingPlan({
    profile: chargingTestProfile,
    segments: [chargingSegment("segment-1", 0, 100, 600)],
    chargingPoints: [point],
    manualStops: [{ id: "manual-stop-unavailable", chargingPointId: point.id, order: 1, targetChargePercent: 100 }]
  });

  assert.equal(plan.status, "infeasible");
  assert.ok(plan.warnings.some((warning) => warning.code === "unavailable_point"));
});

test("warnt wenn eine manuelle Ziel-Ladung bis zum nächsten Ziel nicht ausreicht", () => {
  const point = chargingPoint("manual-low-target", 40);
  const plan = calculateChargingPlan({
    profile: chargingTestProfile,
    segments: [
      chargingSegment("segment-1", 0, 40, 200),
      chargingSegment("segment-2", 40, 100, 500, "stage-2")
    ],
    chargingPoints: [point],
    manualStops: [{ id: "manual-stop-low", chargingPointId: point.id, order: 1, targetChargePercent: 80 }]
  });

  assert.equal(plan.status, "infeasible");
  assert.ok(plan.warnings.some((warning) => warning.code === "insufficient_charge"));
  assert.ok(plan.warnings.some((warning) => warning.code === "no_reachable_station"));
});

test("weist eine manuelle Reihenfolge entgegen dem Routenverlauf zurück", () => {
  const early = chargingPoint("early", 30);
  const late = chargingPoint("late", 70);
  const plan = calculateChargingPlan({
    profile: chargingTestProfile,
    segments: [chargingSegment("segment-1", 0, 100, 300)],
    chargingPoints: [early, late],
    manualStops: [
      { id: "stop-late", chargingPointId: late.id, order: 1, targetChargePercent: 90 },
      { id: "stop-early", chargingPointId: early.id, order: 2, targetChargePercent: 90 }
    ]
  });

  assert.equal(plan.status, "infeasible");
  assert.ok(plan.warnings.some((warning) => warning.code === "invalid_stop_order"));
});

test("baut geordnete Energiesegmente ohne Änderung des Energie-Gesamtwerts", () => {
  const segments = buildTourChargingSegments(chargingTestProfile, [
    {
      id: "stage-1",
      dayNumber: 1,
      routeStartKm: 0,
      routeEndKm: 20,
      distanceKm: 20,
      elevationUp: 0,
      elevationDown: 0,
      elevationProfile: measuredFlatProfile(20),
      elevationDataStatus: "measured"
    }
  ]);
  const projection = calculateStageEnergyProjection({
    profile: chargingTestProfile,
    distanceKm: 20,
    elevationUp: 0,
    elevationDown: 0,
    elevationProfile: measuredFlatProfile(20),
    elevationDataStatus: "measured"
  });

  assert.ok(segments.length > 1);
  assert.equal(Number(segments.reduce((sum, segment) => sum + segment.energyWh, 0).toFixed(4)), projection.batteryEnergyWh);
  assert.ok(segments.every((segment, index) => index === 0 || segment.startKm === segments[index - 1].endKm));
});

test("plant für 100 flache Kilometer bei 80 Kilometern Referenzreichweite zwingend einen Ladehalt", () => {
  const stage = {
    id: "stage-reference-100",
    dayNumber: 1,
    routeStartKm: 0,
    routeEndKm: 100,
    distanceKm: 100,
    elevationUp: 0,
    elevationDown: 0,
    elevationProfile: measuredFlatProfile(100),
    elevationDataStatus: "measured" as const
  };
  const projection = calculateStageEnergyProjection({
    profile: chargingTestProfile,
    distanceKm: stage.distanceKm,
    elevationUp: stage.elevationUp,
    elevationDown: stage.elevationDown,
    elevationProfile: stage.elevationProfile,
    elevationDataStatus: stage.elevationDataStatus
  });
  const segments = buildTourChargingSegments(chargingTestProfile, [stage]);
  const plan = calculateChargingPlan({
    profile: chargingTestProfile,
    segments,
    chargingPoints: [chargingPoint("reference-stop-64", 64, 500)]
  });

  assert.equal(projection.batteryEnergyWh, 625);
  assert.equal(Number(segments.reduce((sum, segment) => sum + segment.energyWh, 0).toFixed(4)), 625);
  assert.equal(plan.totalEnergyNeedWh, 625);
  assert.equal(plan.status, "feasible");
  assert.equal(plan.firstCriticalPoint?.routeKm, 64);
  assert.equal(plan.stops.length, 1);
  assert.equal(plan.stops[0].point.routeKm, 64);
  assert.equal(plan.stops[0].arrivalEnergyWh, 100);
  assert.ok(plan.stages[0].endCapacityPercent >= 20);
});

test("kennzeichnet den kalibrierten 100-km-Referenzfall ohne Ladepunkt als nicht durchführbar", () => {
  const segments = buildTourChargingSegments(chargingTestProfile, [{
    id: "stage-reference-no-stop",
    dayNumber: 1,
    routeStartKm: 0,
    routeEndKm: 100,
    distanceKm: 100,
    elevationUp: 0,
    elevationDown: 0,
    elevationProfile: measuredFlatProfile(100),
    elevationDataStatus: "measured"
  }]);
  const plan = calculateChargingPlan({ profile: chargingTestProfile, segments, chargingPoints: [] });

  assert.equal(plan.totalEnergyNeedWh, 625);
  assert.equal(plan.status, "infeasible");
  assert.equal(plan.firstCriticalPoint?.routeKm, 64);
  assert.ok(plan.warnings.some((warning) => warning.code === "reserve_below"));
  assert.ok(plan.warnings.some((warning) => warning.code === "no_reachable_station"));
});

test("übernimmt monotone Höhenmeterverbräuche in die Ladeplanung", () => {
  const chargingPoints = [
    chargingPoint("elevation-25", 25, 500),
    chargingPoint("elevation-50", 50, 500),
    chargingPoint("elevation-75", 75, 500)
  ];
  const plans = [100, 1000, 2000].map((elevation) => {
    const segments = buildTourChargingSegments(chargingTestProfile, [{
      id: `stage-elevation-${elevation}`,
      dayNumber: 1,
      routeStartKm: 0,
      routeEndKm: 100,
      distanceKm: 100,
      elevationUp: elevation,
      elevationDown: elevation,
      elevationProfile: [],
      elevationDataStatus: "missing"
    }]);
    return calculateChargingPlan({ profile: chargingTestProfile, segments, chargingPoints });
  });

  assert.deepEqual(plans.map((plan) => plan.totalEnergyNeedWh), [635, 722, 819]);
  assert.ok(plans[0].totalChargingEnergyWh < plans[1].totalChargingEnergyWh);
  assert.ok(plans[1].totalChargingEnergyWh < plans[2].totalChargingEnergyWh);
  assert.ok(plans.every((plan) => plan.stops.length >= 1));
});

test("serialisiert Ladepunkte und manuelle Ladehalte versioniert und stabil", () => {
  const state = normalizeChargingPlanningState({
    schemaVersion: 99,
    customPoints: [chargingPoint("manual-b", 70), chargingPoint("manual-a", 30)],
    manualStops: [
      { id: "stop-b", chargingPointId: "manual-b", order: 2, targetChargePercent: 100 },
      { id: "stop-a", chargingPointId: "manual-a", order: 1, targetChargePercent: 80 }
    ]
  });
  const serialized = serializeChargingPlanningState(state);
  const repeated = serializeChargingPlanningState(normalizeChargingPlanningState(JSON.parse(serialized)));

  assert.equal(state.schemaVersion, 1);
  assert.deepEqual(state.customPoints.map((point) => point.id), ["manual-a", "manual-b"]);
  assert.equal(serialized, repeated);
  assert.deepEqual(state.manualStops.map((stop) => stop.order), [1, 2]);
});

test("bewahrt Ladeplanung im TourState und lädt ältere Touren mit leerem Modell", () => {
  const baseState = {
    route: { geometryGeoJson: { type: "LineString", coordinates: [[13, 51], [13.1, 51.1]] } },
    stages: [],
    pois: [],
    inputMode: "direct",
    riderBikeProfile,
    updatedAt: "2026-08-01T12:00:00.000Z"
  };
  const legacy = parseStoredTourState(JSON.stringify(baseState));
  const current = parseStoredTourState(JSON.stringify({
    ...baseState,
    chargingPlanning: {
      schemaVersion: 1,
      customPoints: [chargingPoint("manual-point", 20)],
      manualStops: [{ id: "manual-stop", chargingPointId: "manual-point", order: 1, targetChargePercent: 90 }]
    }
  }));

  assert.deepEqual(legacy?.chargingPlanning, { schemaVersion: 1, customPoints: [], manualStops: [] });
  assert.equal(current?.chargingPlanning?.customPoints[0].name, "Ladepunkt manual-point");
  assert.equal(current?.chargingPlanning?.manualStops[0].targetChargePercent, 90);
  assert.ok(current);
  const exported = createTourExport(
    createTourLibraryEntry(current, { id: "tour-charging-test", name: "Ladeplantest", now: "2026-08-01T12:00:00.000Z" }),
    "2026-08-01T12:05:00.000Z"
  );
  const imported = parseTourExport(JSON.stringify(exported));
  assert.equal(imported?.state.chargingPlanning?.customPoints[0].id, "manual-point");
  assert.equal(imported?.state.chargingPlanning?.manualStops[0].id, "manual-stop");
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

test("liefert nach Profil-JSON-Export und -Import dieselbe kalibrierte Energieprognose", () => {
  const before = energyProjection({
    distanceKm: 100,
    elevationUp: 700,
    elevationProfile: measuredClimbProfile(100, 700)
  });
  const exported = createRiderBikeProfileExport(riderBikeProfile, "2026-08-02T08:00:00.000Z");
  const restored = parseRiderBikeProfileExport(JSON.stringify(exported));

  assert.ok(restored);
  const after = energyProjection({
    profile: restored!,
    distanceKm: 100,
    elevationUp: 700,
    elevationProfile: measuredClimbProfile(100, 700)
  });
  assert.deepEqual(after, before);
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
          [10000, "highway=cycleway surface=asphalt route_bicycle_rcn=yes"],
          [8500, "highway=residential surface=paving_stones cycleway=no"]
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
          [205000, "highway=path surface=fine_gravel bicycle=yes route_bicycle_ncn=yes"],
          [205000, "highway=secondary surface=asphalt cycleway=no"]
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
  assert.equal(route.routeConditionSourceSegments?.length, 4);
  assert.equal(route.routeConditionSourceSegments?.[0].surface, "asphalt");
  assert.equal(route.routeConditionSourceSegments?.[2].surface, "fine_gravel");
  assert.ok((route.routeConditionSourceSegments?.[3].endKm ?? 0) > 428);
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

test("gliedert Steigungen nur für die Anzeige in die vereinbarten Klassen", () => {
  assert.equal(assistanceGradeBandFor(-6), "significant_descent");
  assert.equal(assistanceGradeBandFor(-2), "light_descent");
  assert.equal(assistanceGradeBandFor(0), "nearly_flat");
  assert.equal(assistanceGradeBandFor(1), "climb_0_5_2");
  assert.equal(assistanceGradeBandFor(3), "climb_2_4");
  assert.equal(assistanceGradeBandFor(5), "climb_4_6");
  assert.equal(assistanceGradeBandFor(7), "climb_6_8");
  assert.equal(assistanceGradeBandFor(9), "climb_8_10");
  assert.equal(assistanceGradeBandFor(11), "climb_10_12");
  assert.equal(assistanceGradeBandFor(13), "climb_12_15");
  assert.equal(assistanceGradeBandFor(16), "climb_over_15");
});

test("berechnet die kontinuierliche Unterstützungsstrategie deterministisch", () => {
  const first = assistancePlan();
  const second = assistancePlan();

  assert.deepEqual(first, second);
  assert.equal(first.modelVersion, EBIKE_ASSISTANCE_MODEL_VERSION);
  assert.equal(first.bicycleMode, "ebike");
  assert.ok(first.sections.length > 0);
  assert.ok(first.totalExpectedBatteryEnergyWh && first.totalExpectedBatteryEnergyWh > 0);
  assert.equal(first.assumptions.productEnergyModelUnchanged, true);
  assert.equal(first.assumptions.chargingStopsIncluded, false);
  assert.equal(first.sections[0].recommendedMode.source, "generic");
  assert.ok(
    first.sections[0].recommendedMotorAssistancePercent.minimum <=
      first.sections[0].recommendedMotorAssistancePercent.maximum
  );
});

test("springt die Berechnung nicht an den sichtbaren Steigungsgrenzen", () => {
  const below = assistancePlan({
    distanceKm: 4,
    elevationProfile: constantGradeProfile(4, 3.99),
    remainingDistanceKm: 4,
    remainingElevationUpM: 159.6
  });
  const above = assistancePlan({
    distanceKm: 4,
    elevationProfile: constantGradeProfile(4, 4.01),
    remainingDistanceKm: 4,
    remainingElevationUpM: 160.4
  });

  assert.equal(below.sections[0].gradeBand, "climb_2_4");
  assert.equal(above.sections[0].gradeBand, "climb_4_6");
  assert.ok(
    Math.abs(below.sections[0].recommendedMotorRatio - above.sections[0].recommendedMotorRatio) < 0.03
  );
});

test("erhöht die empfohlene Unterstützung kontinuierlich mit Steigung und Gewicht", () => {
  const gentle = assistancePlan({
    distanceKm: 3,
    elevationProfile: constantGradeProfile(3, 2),
    remainingDistanceKm: 3,
    remainingElevationUpM: 60
  });
  const medium = assistancePlan({
    distanceKm: 3,
    elevationProfile: constantGradeProfile(3, 6),
    remainingDistanceKm: 3,
    remainingElevationUpM: 180
  });
  const steep = assistancePlan({
    distanceKm: 3,
    elevationProfile: constantGradeProfile(3, 10),
    remainingDistanceKm: 3,
    remainingElevationUpM: 300
  });
  const heavierProfile: RiderBikeProfile = {
    ...riderBikeProfile,
    rider: { ...riderBikeProfile.rider, bodyWeightKg: riderBikeProfile.rider.bodyWeightKg + 35 }
  };
  const heavier = assistancePlan({
    profile: heavierProfile,
    distanceKm: 3,
    elevationProfile: constantGradeProfile(3, 6),
    remainingDistanceKm: 3,
    remainingElevationUpM: 180
  });

  assert.ok(gentle.sections[0].recommendedMotorRatio < medium.sections[0].recommendedMotorRatio);
  assert.ok(medium.sections[0].recommendedMotorRatio < steep.sections[0].recommendedMotorRatio);
  assert.ok(heavier.sections[0].recommendedMotorRatio > medium.sections[0].recommendedMotorRatio);
});

test("unterscheidet kurze Rampen, mittlere und lange zusammenhängende Anstiege", () => {
  const short = assistancePlan({
    distanceKm: 0.3,
    elevationProfile: constantGradeProfile(0.3, 6, 0.1),
    remainingDistanceKm: 0.3,
    remainingElevationUpM: 18
  });
  const medium = assistancePlan({
    distanceKm: 1.5,
    elevationProfile: constantGradeProfile(1.5, 6),
    remainingDistanceKm: 1.5,
    remainingElevationUpM: 90
  });
  const long = assistancePlan({
    distanceKm: 5,
    elevationProfile: constantGradeProfile(5, 6),
    remainingDistanceKm: 5,
    remainingElevationUpM: 300
  });

  assert.equal(short.sections[0].climbDuration, "short");
  assert.equal(medium.sections[0].climbDuration, "medium");
  assert.equal(long.sections[0].climbDuration, "long");
  assert.ok(short.sections[0].continuousClimbDurationMinutes < medium.sections[0].continuousClimbDurationMinutes);
  assert.ok(medium.sections[0].continuousClimbDurationMinutes < long.sections[0].continuousClimbDurationMinutes);
});

test("berücksichtigt Strategie und Reserve ohne automatische Touränderung", () => {
  const economical = assistancePlan({ strategy: "energy_saving" });
  const comfort = assistancePlan({ strategy: "comfort" });
  const fullBattery = assistancePlan({
    distanceKm: 20,
    elevationProfile: constantGradeProfile(20, 0),
    remainingDistanceKm: 20,
    remainingElevationUpM: 0,
    startingBatteryCapacityPercent: 100
  });
  const lowBattery = assistancePlan({
    distanceKm: 20,
    elevationProfile: constantGradeProfile(20, 0),
    remainingDistanceKm: 20,
    remainingElevationUpM: 0,
    startingBatteryCapacityPercent: 40
  });

  assert.equal(assistanceStrategyFromProfile(riderBikeProfile), "energy_saving");
  assert.ok(
    economical.sections[0].recommendedMotorRatio < comfort.sections[0].recommendedMotorRatio
  );
  assert.ok(lowBattery.sections[0].targetSpeedKmh < fullBattery.sections[0].targetSpeedKmh);
  assert.equal(lowBattery.assumptions.productEnergyModelUnchanged, true);
});

test("ordnet belegte Fahrradmodi zu und weist unvollständige benutzerdefinierte Strategien zurück", () => {
  const manufacturerModes: AssistanceModeDefinition[] = [
    {
      id: "manufacturer-auto",
      label: "Hersteller Auto",
      minimumRatio: 0,
      maximumRatio: 4,
      source: "manufacturer",
      quality: "high"
    }
  ];
  const mapped = assistancePlan({ availableModes: manufacturerModes });
  const incomplete = assistancePlan({ strategy: "custom", customStrategy: undefined });

  assert.ok(mapped.sections.every((section) => section.recommendedMode.id === "manufacturer-auto"));
  assert.equal(mapped.assumptions.modeMappingSource, "manufacturer");
  assert.equal(incomplete.status, "incomplete");
  assert.equal(incomplete.sections.length, 0);
  assert.match(incomplete.warnings[0], /benutzerdefinierte Strategie/i);
});

test("kennzeichnet klassische Fahrräder und fehlende Höhenprofile ohne erfundene Abschnitte", () => {
  const classicProfile: RiderBikeProfile = {
    ...riderBikeProfile,
    bike: { ...riderBikeProfile.bike, type: "trekking" }
  };
  const classic = assistancePlan({ profile: classicProfile });
  const missing = assistancePlan({ elevationProfile: [], elevationDataStatus: "missing" });

  assert.equal(classic.status, "not_applicable");
  assert.equal(classic.sections.length, 0);
  assert.equal(classic.totalExpectedBatteryEnergyWh, null);
  assert.equal(missing.status, "incomplete");
  assert.equal(missing.sections.length, 0);
  assert.match(missing.warnings[0], /Höhenprofil/i);
});

test("verändert die Unterstützungssimulation den produktiven Energie-Core nicht", () => {
  const input: StageEnergyProjectionInput = {
    profile: riderBikeProfile,
    distanceKm: 12,
    elevationUp: 480,
    elevationDown: 0,
    elevationProfile: constantGradeProfile(12, 4),
    elevationDataStatus: "measured"
  };
  const before = calculateStageEnergyProjection(input);
  assistancePlan();
  const after = calculateStageEnergyProjection(input);

  assert.deepEqual(after, before);
});

test("begrenzt Extremanstiege transparent und erzeugt keine negativen Akkuwerte", () => {
  const limitedProfile: RiderBikeProfile = {
    ...riderBikeProfile,
    bike: {
      ...riderBikeProfile.bike,
      ebike: { ...riderBikeProfile.bike.ebike, motorPowerW: 100 }
    }
  };
  const plan = assistancePlan({
    profile: limitedProfile,
    distanceKm: 2,
    elevationProfile: constantGradeProfile(2, 16),
    remainingDistanceKm: 2,
    remainingElevationUpM: 320
  });

  assert.ok(plan.sections.some((section) => section.gradeBand === "climb_over_15"));
  assert.ok(plan.warnings.some((warning) => warning.includes("Motorleistungsgrenze")));
  assert.ok(plan.warnings.some((warning) => warning.includes("Grenzbereich")));
  assert.ok(plan.sections.every((section) => section.expectedBatteryEnergyWh >= 0));
  assert.ok(plan.sections.every((section) => section.batteryCapacityPercentAtEnd >= 0));
});

test("liefert nach Save-/Load-ähnlichem JSON-Roundtrip identische Unterstützung", () => {
  const input: StageAssistancePlanInput = {
    profile: riderBikeProfile,
    distanceKm: 12,
    elevationProfile: constantGradeProfile(12, 4),
    elevationDataStatus: "measured",
    strategy: "balanced",
    startingBatteryCapacityPercent: 100,
    remainingDistanceKm: 12,
    remainingElevationUpM: 480
  };
  const before = calculateStageAssistancePlan(input);
  const restored = JSON.parse(JSON.stringify(input)) as StageAssistancePlanInput;
  const after = calculateStageAssistancePlan(restored);

  assert.deepEqual(after, before);
});

test("integriert die Unterstützung nur als klar gekennzeichnete responsive Simulation", () => {
  const source = readFileSync("src/components/AssistanceStrategyPanel.tsx", "utf8");

  assert.match(source, /data-assistance-plan/);
  assert.match(source, />Simulation</);
  assert.match(source, /Motoranteil/);
  assert.match(source, /Max\. Steigung/);
  assert.match(source, /Akku Ende/);
  assert.match(source, /lg:grid-cols-2/);
  assert.match(source, /ohne Fahrradsteuerung/);
  assert.match(source, /unveränderten produktiven/);
});

const ridingStrategyProfile: RiderBikeProfile = {
  ...riderBikeProfile,
  bike: {
    ...riderBikeProfile.bike,
    type: "ebike",
    ebike: {
      ...riderBikeProfile.bike.ebike,
      batteryCapacityWh: 500,
      batteryCount: 1,
      usableBatteryCapacityPercent: 100,
      desiredReservePercent: 20
    }
  }
};

function ridingStrategySegments(
  grades: number[] = [1, 3, 6, 2],
  energyWh = 120,
  minimumAssistanceRatio = 0.4
): RidingStrategySegmentInput[] {
  return grades.map((grade, index) => ({
    id: `strategy-segment-${index + 1}`,
    stageId: index < 2 ? "strategy-stage-1" : "strategy-stage-2",
    stageDayNumber: index < 2 ? 1 : 2,
    startKm: index * 10,
    endKm: (index + 1) * 10,
    distanceKm: 10,
    averageGradePercent: grade,
    maximumGradePercent: grade + 1,
    continuousClimbDurationMinutes: grade >= 4 ? 18 : 4,
    baseAssistanceRatio: 1,
    minimumAssistanceRatio,
    maximumAssistanceRatio: 1.6,
    baseExpectedBatteryEnergyWh: energyWh,
    quality: "high"
  }));
}

function ridingStrategy(overrides: Partial<RidingStrategyInput> = {}) {
  return calculateRidingStrategy({
    profile: ridingStrategyProfile,
    mode: "balanced",
    segments: ridingStrategySegments(),
    chargingStops: [],
    stageOverrides: [],
    startingBatteryCapacityPercent: 100,
    ...overrides
  });
}

test("berechnet die adaptive Fahrstrategie tourweit und deterministisch", () => {
  const first = ridingStrategy();
  const second = ridingStrategy();

  assert.deepEqual(first, second);
  assert.equal(first.modelVersion, EBIKE_RIDING_STRATEGY_MODEL_VERSION);
  assert.equal(first.bicycleMode, "ebike");
  assert.equal(first.stages.length, 2);
  assert.equal(first.assumptions.deterministic, true);
  assert.equal(first.assumptions.offline, true);
  assert.equal(first.assumptions.existingCoresUnchanged, true);
});

test("kennzeichnet klassische Fahrräder ohne erfundene Akkustrategie", () => {
  const classicProfile: RiderBikeProfile = {
    ...ridingStrategyProfile,
    bike: { ...ridingStrategyProfile.bike, type: "touring" }
  };
  const plan = ridingStrategy({ profile: classicProfile });

  assert.equal(plan.status, "not_applicable");
  assert.equal(plan.segments.length, 0);
  assert.equal(plan.usableBatteryEnergyWh, null);
});

test("weist fehlende Segmente und niedrige Prognosequalität transparent aus", () => {
  const missing = ridingStrategy({ segments: [] });
  const lowQuality = ridingStrategy({
    segments: ridingStrategySegments().map((segment) => ({ ...segment, quality: "low" as const }))
  });

  assert.equal(missing.status, "incomplete");
  assert.ok(missing.warnings.some((warning) => warning.code === "invalid_input"));
  assert.equal(lowQuality.status, "warning");
  assert.ok(lowQuality.warnings.some((warning) => warning.code === "low_quality"));
  assert.ok(lowQuality.segments.every((segment) => segment.safetyStatus === "caution"));
});

test("berücksichtigt einen und zwei Akkus als gemeinsame Kapazität", () => {
  const oneBattery = ridingStrategy();
  const twoBatteryProfile: RiderBikeProfile = {
    ...ridingStrategyProfile,
    bike: {
      ...ridingStrategyProfile.bike,
      ebike: { ...ridingStrategyProfile.bike.ebike, batteryCount: 2 }
    }
  };
  const twoBatteries = ridingStrategy({ profile: twoBatteryProfile });

  assert.equal(oneBattery.usableBatteryEnergyWh, 500);
  assert.equal(twoBatteries.usableBatteryEnergyWh, 1000);
  assert.ok((twoBatteries.endingBatteryCapacityPercent ?? 0) > (oneBattery.endingBatteryCapacityPercent ?? 0));
});

test("unterscheidet Reichweite, Ausgewogen und Komfort nachvollziehbar", () => {
  const range = ridingStrategy({ mode: "range" });
  const balanced = ridingStrategy({ mode: "balanced" });
  const comfort = ridingStrategy({ mode: "comfort" });

  assert.ok(range.totalExpectedBatteryEnergyWh < balanced.totalExpectedBatteryEnergyWh);
  assert.ok(balanced.totalExpectedBatteryEnergyWh <= comfort.totalExpectedBatteryEnergyWh);
  assert.ok((range.strategyReservePercent ?? 0) > (balanced.strategyReservePercent ?? 0));
  assert.ok((comfort.strategyReservePercent ?? 0) < (balanced.strategyReservePercent ?? 0));
});

test("hält auf einer kurzen Tour eine hohe Reichweitenreserve ein", () => {
  const plan = ridingStrategy({
    mode: "range",
    segments: ridingStrategySegments([1], 45, 0.2)
  });

  assert.equal(plan.status, "complete");
  assert.ok((plan.endingBatteryCapacityPercent ?? 0) >= (plan.strategyReservePercent ?? 0));
});

test("bezieht automatische und manuelle Ladehalte in den Tourakku ein", () => {
  const withoutStop = ridingStrategy();
  const automatic = ridingStrategy({
    chargingStops: [{
      id: "strategy-auto-stop",
      stageId: "strategy-stage-1",
      routeKm: 20,
      addedBatteryEnergyWh: 200,
      chargingDurationMinutes: 48,
      mode: "automatic"
    }]
  });
  const manual = ridingStrategy({
    chargingStops: [{
      id: "strategy-manual-stop",
      stageId: "strategy-stage-1",
      routeKm: 20,
      addedBatteryEnergyWh: 200,
      chargingDurationMinutes: 48,
      mode: "manual"
    }]
  });

  assert.equal(automatic.chargingStops[0].mode, "automatic");
  assert.equal(manual.chargingStops[0].mode, "manual");
  assert.ok((automatic.endingBatteryCapacityPercent ?? 0) > (withoutStop.endingBatteryCapacityPercent ?? 0));
  assert.ok((manual.endingBatteryCapacityPercent ?? 0) > (withoutStop.endingBatteryCapacityPercent ?? 0));
});

test("bewahrt Energie für starke spätere Steigungen auf", () => {
  const plan = ridingStrategy({
    segments: ridingStrategySegments([1, 1, 10, 12], 190, 0.25),
    startingBatteryCapacityPercent: 70
  });
  const flatRecommendation = plan.segments.find((segment) => segment.id === "strategy-segment-1");
  const lateClimbRecommendation = plan.segments.find((segment) => segment.id === "strategy-segment-4");

  assert.ok(flatRecommendation);
  assert.ok(lateClimbRecommendation);
  assert.ok(lateClimbRecommendation.recommendedAssistancePercent > flatRecommendation.recommendedAssistancePercent);
  assert.ok(flatRecommendation.rationale.some((reason) => reason.includes("spätere Abschnitte")));
});

test("gewichtet starke Steigungen am Anfang ebenfalls höher als flache Folgeabschnitte", () => {
  const plan = ridingStrategy({
    segments: ridingStrategySegments([12, 10, 1, 1], 190, 0.25),
    startingBatteryCapacityPercent: 70
  });

  assert.ok(plan.segments[0].recommendedAssistancePercent > plan.segments[3].recommendedAssistancePercent);
});

test("übernimmt und kennzeichnet manuelle Etappenvorgaben ohne Überschreibung", () => {
  const plan = ridingStrategy({
    mode: "balanced",
    stageOverrides: [{ stageId: "strategy-stage-1", assistancePercent: 135 }]
  });
  const overridden = plan.segments.filter((segment) => segment.stageId === "strategy-stage-1");

  assert.ok(overridden.every((segment) => segment.recommendedAssistancePercent === 135));
  assert.ok(overridden.every((segment) => segment.source === "manual"));
  assert.equal(plan.stages[0].source, "manual");
});

test("lässt im manuellen Modus bestehende kontinuierliche Werte unverändert", () => {
  const plan = ridingStrategy({ mode: "manual" });

  assert.ok(plan.segments.every((segment) => segment.recommendedAssistancePercent === 100));
  assert.ok(plan.segments.every((segment) => segment.source === "baseline"));
});

test("erkennt eine nicht erreichbare Mindeststrategie", () => {
  const plan = ridingStrategy({
    segments: ridingStrategySegments([4, 5, 6, 7], 400, 0.8)
  });

  assert.equal(plan.status, "infeasible");
  assert.ok(plan.warnings.some((warning) => warning.code === "minimum_strategy_infeasible"));
});

test("warnt wenn ein geplanter Ladehalt für die Folgeetappe nicht ausreicht", () => {
  const plan = ridingStrategy({
    segments: ridingStrategySegments([4, 5, 6, 7], 320, 0.8),
    chargingStops: [{
      id: "weak-charge",
      stageId: "strategy-stage-1",
      routeKm: 20,
      addedBatteryEnergyWh: 10,
      chargingDurationMinutes: 5,
      mode: "manual"
    }]
  });

  assert.equal(plan.status, "infeasible");
  assert.ok(plan.warnings.some((warning) => warning.code === "insufficient_charge"));
});

test("erkennt eine unsichere manuelle Vorgabe", () => {
  const plan = ridingStrategy({
    mode: "manual",
    stageOverrides: [{ stageId: "strategy-stage-1", assistancePercent: 400 }]
  });

  assert.equal(plan.status, "infeasible");
  assert.ok(plan.warnings.some((warning) => warning.code === "manual_override_unsafe"));
});

test("speichert Fahrstrategie versioniert und ergänzt ältere TourStates", () => {
  const plan = ridingStrategy({ stageOverrides: [{ stageId: "strategy-stage-1", assistancePercent: 85 }] });
  const state = normalizeRidingStrategyState({
    schemaVersion: 99,
    mode: "range",
    stageOverrides: [
      { stageId: "strategy-stage-2", assistancePercent: 90 },
      { stageId: "strategy-stage-1", assistancePercent: 85 }
    ],
    lastCalculation: ridingStrategyPlanSnapshot(plan)
  });
  const serialized = serializeRidingStrategyState(state);
  const repeated = serializeRidingStrategyState(normalizeRidingStrategyState(JSON.parse(serialized)));
  const legacyTour = parseStoredTourState(JSON.stringify({
    route: { geometryGeoJson: routeGeometry },
    stages: [],
    pois: [],
    inputMode: "gpx",
    updatedAt: "2026-08-03T12:00:00.000Z"
  }));

  assert.equal(state.schemaVersion, 1);
  assert.deepEqual(state.stageOverrides.map((override) => override.stageId), ["strategy-stage-1", "strategy-stage-2"]);
  assert.equal(repeated, serialized);
  assert.deepEqual(legacyTour?.ridingStrategy, { schemaVersion: 1, mode: "balanced", stageOverrides: [] });
});

test("liefert nach JSON-Reload dieselbe Fahrstrategie und Berechnungsgrundlage", () => {
  const input: RidingStrategyInput = {
    profile: ridingStrategyProfile,
    mode: "comfort",
    segments: ridingStrategySegments(),
    chargingStops: [{
      id: "reload-charge",
      stageId: "strategy-stage-1",
      routeKm: 20,
      addedBatteryEnergyWh: 180,
      chargingDurationMinutes: 45,
      mode: "automatic"
    }],
    stageOverrides: [{ stageId: "strategy-stage-2", assistancePercent: 110 }],
    startingBatteryCapacityPercent: 100
  };
  const first = calculateRidingStrategy(input);
  const afterReload = calculateRidingStrategy(JSON.parse(JSON.stringify(input)) as RidingStrategyInput);

  assert.deepEqual(afterReload, first);
  assert.equal(afterReload.inputFingerprint, first.inputFingerprint);
});

test("integriert die Fahrstrategie responsiv und kennzeichnet automatisch sowie manuell", () => {
  const source = readFileSync("src/components/RidingStrategyPanel.tsx", "utf8");
  const planner = readFileSync("src/components/PlannerClient.tsx", "utf8");

  assert.match(source, /data-riding-strategy-tour/);
  assert.match(source, /data-stage-riding-strategy/);
  assert.match(source, /min-w-0/);
  assert.match(source, /sm:grid-cols-2/);
  assert.match(source, /automatisch/);
  assert.match(source, /manuell/);
  assert.match(source, /Neu berechnen/);
  assert.match(planner, /ridingStrategyPlanSnapshot/);
  assert.match(planner, /StageRidingStrategyPanel/);
});

const routeConditionGeometry: LineStringGeoJson = {
  type: "LineString",
  coordinates: [[13, 52], [13.1, 52], [13.2, 52]]
};
const routeConditionDistanceKm = routeDistanceKm(routeConditionGeometry.coordinates);

function conditionProfile(elevations: number[]) {
  return elevations.map((elevationM, index) => ({
    distanceKm: (routeConditionDistanceKm / Math.max(1, elevations.length - 1)) * index,
    elevationM
  }));
}

function conditionSources(
  entries: Array<{ from: number; to: number; surface?: string; highway?: string; tags?: Record<string, string> }>
): RouteConditionSourceSegment[] {
  return entries.map((entry, index) => ({
    id: `condition-source-${index + 1}`,
    startKm: routeConditionDistanceKm * entry.from,
    endKm: routeConditionDistanceKm * entry.to,
    surface: entry.surface,
    wayType: entry.highway,
    tags: { ...(entry.tags ?? {}), ...(entry.surface ? { surface: entry.surface } : {}), ...(entry.highway ? { highway: entry.highway } : {}) },
    dataSource: "brouter"
  }));
}

test("analysiert eine vollständig ebene Strecke deterministisch", () => {
  const input = {
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 100, 100]),
    elevationSource: "gpx" as const,
    sourceSegments: conditionSources([{ from: 0, to: 1, surface: "asphalt", highway: "cycleway" }])
  };
  const first = analyzeRouteCondition(input);
  const second = analyzeRouteCondition(input);

  assert.deepEqual(second, first);
  assert.equal(first.modelVersion, ROUTE_CONDITION_MODEL_VERSION);
  assert.equal(first.elevationUpM, 0);
  assert.equal(first.elevationDownM, 0);
  assert.equal(first.maximumGradePercent, 0);
  assert.ok(first.segments.every((segment) => segment.slopeClass === "nearly_flat"));
  assert.equal(first.existingCalculationsChanged, false);
});

test("unterscheidet gleichmäßige Steigung und gleichmäßiges Gefälle", () => {
  const climb = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 300, 500]),
    elevationSource: "provider"
  });
  const descent = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([500, 300, 100]),
    elevationSource: "provider"
  });

  assert.equal(climb.elevationUpM, 400);
  assert.equal(climb.elevationDownM, 0);
  assert.equal(descent.elevationUpM, 0);
  assert.equal(descent.elevationDownM, 400);
  assert.ok(climb.segments.every((segment) => (segment.averageGradePercent ?? 0) > 0));
  assert.ok(descent.segments.every((segment) => (segment.averageGradePercent ?? 0) < 0));
});

test("summiert ein wechselndes Höhenprofil getrennt bergauf und bergab", () => {
  const analysis = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 250, 150, 350, 200]),
    elevationSource: "gpx"
  });

  assert.ok(analysis.elevationUpM > 0);
  assert.ok(analysis.elevationDownM > 0);
  assert.ok(analysis.segments.some((segment) => (segment.averageGradePercent ?? 0) > 0));
  assert.ok(analysis.segments.some((segment) => (segment.averageGradePercent ?? 0) < 0));
});

test("kennzeichnet sehr kurze Segmente ohne scheinbare Sicherheit", () => {
  const analysis = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 100]),
    elevationSource: "gpx",
    sourceSegments: [
      { id: "tiny", startKm: 0, endKm: 0.01, surface: "asphalt", wayType: "cycleway", dataSource: "manual" },
      { id: "rest", startKm: 0.01, endKm: routeConditionDistanceKm, surface: "asphalt", wayType: "cycleway", dataSource: "manual" }
    ]
  });

  assert.ok(analysis.warnings.some((warning) => warning.code === "segment_too_short"));
});

test("weist fehlende und teilweise fehlende Höhendaten transparent aus", () => {
  const missing = analyzeRouteCondition({ geometry: routeConditionGeometry, elevationPoints: [], elevationSource: "unknown" });
  const partial = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: [
      { distanceKm: 1, elevationM: 100 },
      { distanceKm: routeConditionDistanceKm - 1, elevationM: 160 }
    ],
    elevationSource: "gpx"
  });

  assert.equal(missing.maximumGradePercent, null);
  assert.ok(missing.warnings.some((warning) => warning.code === "elevation_missing" && warning.severity === "critical"));
  assert.ok(partial.warnings.some((warning) => warning.code === "elevation_incomplete"));
  assert.equal(partial.quality.metrics.interpolationRequired, true);
  assert.equal(partial.segments[0].startElevationM, null);
});

test("glättet einen einzelnen Messfehler deterministisch und bewahrt Rohdaten", () => {
  const raw = [
    { distanceKm: 0, elevationM: 100 },
    { distanceKm: 0.5, elevationM: 700 },
    { distanceKm: 1, elevationM: 100 }
  ];
  const smoothed = smoothElevationProfile(raw);
  const analysis = analyzeRouteCondition({ geometry: routeConditionGeometry, elevationPoints: raw, elevationSource: "gpx" });

  assert.equal(raw[1].elevationM, 700);
  assert.equal(smoothed[1].elevationM, 100);
  assert.equal(analysis.rawElevationPoints[1].elevationM, 700);
  assert.equal(analysis.smoothedElevationPoints[1].elevationM, 100);
  assert.ok(analysis.warnings.some((warning) => warning.code === "noisy_elevation_profile"));
});

test("erkennt einen unplausiblen Höhensprung", () => {
  const analysis = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: [
      { distanceKm: 0, elevationM: 100 },
      { distanceKm: 0.01, elevationM: 600 }
    ],
    elevationSource: "gpx"
  });

  assert.ok(analysis.warnings.some((warning) => warning.code === "implausible_elevation_jump" && warning.severity === "critical"));
});

test("klassifiziert Asphalt, gemischte Oberflächen und unbekannte Daten", () => {
  const asphalt = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 100]),
    elevationSource: "provider",
    sourceSegments: conditionSources([{ from: 0, to: 1, surface: "asphalt", highway: "cycleway" }])
  });
  const mixed = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 100]),
    elevationSource: "provider",
    sourceSegments: conditionSources([
      { from: 0, to: 0.5, surface: "asphalt", highway: "cycleway" },
      { from: 0.5, to: 1, surface: "gravel", highway: "track" }
    ])
  });
  const unknown = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 100]),
    elevationSource: "gpx"
  });

  assert.equal(asphalt.pavedPercent, 100);
  assert.equal(asphalt.unknownSurfacePercent, 0);
  assert.ok(mixed.pavedPercent > 40 && mixed.unpavedPercent > 40);
  assert.equal(unknown.unknownSurfacePercent, 100);
  assert.ok(unknown.warnings.some((warning) => warning.code === "surface_unknown"));
});

test("bewertet Schotter, Waldweg, Treppen und Schiebestrecke", () => {
  assert.equal(classifySurface("gravel"), "coarse_gravel");
  assert.equal(classifySurface("woodchips"), "forest");
  assert.equal(classifyWayType("track", { highway: "track", landuse: "forest" }), "forest");
  const analysis = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 120, 140]),
    elevationSource: "provider",
    sourceSegments: conditionSources([
      { from: 0, to: 0.5, surface: "gravel", highway: "track" },
      { from: 0.5, to: 0.75, surface: "woodchips", highway: "track", tags: { landuse: "forest" } },
      { from: 0.75, to: 1, surface: "paving_stones", highway: "steps", tags: { bicycle: "dismount" } }
    ])
  });

  assert.ok(analysis.warnings.some((warning) => warning.code === "possibly_unsuitable"));
  assert.ok(analysis.warnings.some((warning) => warning.code === "pushing_or_steps" && warning.severity === "critical"));
  assert.ok(analysis.segments.some((segment) => segment.resistance.energyDemandFactor > 1.2));
});

test("verwendet zentral dokumentierte monotone Steigungsklassen", () => {
  const grades = [-12, -3, 0, 2, 5, 9, 14];
  assert.deepEqual(grades.map(classifySlope), [
    "strong_descent",
    "light_descent",
    "nearly_flat",
    "light_climb",
    "medium_climb",
    "strong_climb",
    "very_strong_climb"
  ]);
});

test("liest GPX-Höhenwerte und verweigert erfundene Werte ohne GPX-Höhe", () => {
  const withElevation = parseGpx(`<?xml version="1.0"?><gpx><trk><trkseg>
    <trkpt lat="52" lon="13"><ele>100</ele></trkpt>
    <trkpt lat="52" lon="13.1"><ele>150</ele></trkpt>
  </trkseg></trk></gpx>`);
  const withoutElevation = parseGpx(`<?xml version="1.0"?><gpx><trk><trkseg>
    <trkpt lat="52" lon="13"/><trkpt lat="52" lon="13.1"/>
  </trkseg></trk></gpx>`);
  const measured = analyzeRouteCondition({
    geometry: { type: "LineString", coordinates: withElevation.coordinates },
    elevationPoints: withElevation.elevationProfile,
    elevationSource: "gpx"
  });
  const missing = analyzeRouteCondition({
    geometry: { type: "LineString", coordinates: withoutElevation.coordinates },
    elevationPoints: withoutElevation.elevationProfile,
    elevationSource: "unknown"
  });

  assert.equal(withElevation.hasElevation, true);
  assert.equal(measured.elevationUpM, 50);
  assert.equal(withoutElevation.hasElevation, false);
  assert.equal(missing.elevationUpM, 0);
  assert.ok(missing.warnings.some((warning) => warning.code === "elevation_missing"));
});

test("übernimmt BRouter-WayTags als geordnete Streckenquellen", () => {
  const sources = parseBRouterConditionSegments(
    [
      ["Distance", "WayTags"],
      [4000, "highway=cycleway surface=asphalt bicycle=designated"],
      [6000, "highway=track surface=gravel"]
    ],
    10
  );

  assert.equal(sources.length, 2);
  assert.deepEqual(sources.map((source) => [source.startKm, source.endKm]), [[0, 4], [4, 10]]);
  assert.equal(sources[0].surface, "asphalt");
  assert.equal(sources[1].wayType, "track");
});

test("schneidet Etappenanalyse, Oberfläche und Höhenwerte gemeinsam", () => {
  const sources = conditionSources([
    { from: 0, to: 0.5, surface: "asphalt", highway: "cycleway" },
    { from: 0.5, to: 1, surface: "gravel", highway: "track" }
  ]);
  const stage = analyzeRouteConditionSlice(
    {
      geometry: routeConditionGeometry,
      elevationPoints: conditionProfile([100, 200, 300]),
      elevationSource: "gpx",
      sourceSegments: sources
    },
    routeConditionDistanceKm / 2,
    routeConditionDistanceKm
  );

  assert.ok(stage.totalDistanceKm > routeConditionDistanceKm * 0.49);
  assert.equal(stage.surfaceDistribution[0].classification, "coarse_gravel");
  assert.ok(stage.elevationUpM > 0);
});

test("speichert RouteCondition versioniert und lädt alte Touren rückwärtskompatibel", () => {
  const analysis = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 150, 100]),
    elevationSource: "gpx",
    sourceSegments: conditionSources([{ from: 0, to: 1, surface: "asphalt", highway: "cycleway" }])
  });
  const state = routeConditionStateSnapshot(conditionSources([{ from: 0, to: 1, surface: "asphalt", highway: "cycleway" }]), analysis);
  const serialized = serializeRouteConditionStoredState(state);
  const repeated = serializeRouteConditionStoredState(normalizeRouteConditionStoredState(JSON.parse(serialized)));
  const legacy = parseStoredTourState(JSON.stringify({
    route: { geometryGeoJson: routeConditionGeometry },
    stages: [],
    pois: [],
    inputMode: "gpx",
    updatedAt: "2026-08-03T12:00:00.000Z"
  }));

  assert.equal(repeated, serialized);
  assert.equal(JSON.parse(serialized).modelVersion, ROUTE_CONDITION_MODEL_VERSION);
  assert.deepEqual(legacy?.routeCondition?.sourceSegments, []);
  assert.deepEqual(legacy?.route?.routeConditionSourceSegments, []);
});

test("liefert nach JSON-Reload identische RouteCondition-Ergebnisse", () => {
  const input = {
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 180, 130, 240]),
    elevationSource: "gpx" as const,
    sourceSegments: conditionSources([
      { from: 0, to: 0.4, surface: "asphalt", highway: "cycleway" },
      { from: 0.4, to: 1, surface: "fine_gravel", highway: "track" }
    ])
  };
  const before = analyzeRouteCondition(input);
  const after = analyzeRouteCondition(JSON.parse(JSON.stringify(input)));

  assert.deepEqual(after, before);
  assert.equal(after.inputFingerprint, before.inputFingerprint);
});

test("integriert die RouteCondition-Ansicht responsiv ohne Fachlogik in React", () => {
  const panel = readFileSync("src/components/RouteConditionPanel.tsx", "utf8");
  const profile = readFileSync("src/components/ElevationProfile.tsx", "utf8");
  const planner = readFileSync("src/components/PlannerClient.tsx", "utf8");
  const core = readFileSync("src/lib/route-elevation-surface.ts", "utf8");

  assert.match(panel, /data-route-condition-overview/);
  assert.match(panel, /data-stage-route-condition/);
  assert.match(panel, /min-w-0/);
  assert.match(panel, /sm:grid-cols-2/);
  assert.match(profile, /preserveAspectRatio="none"/);
  assert.match(profile, /w-full/);
  assert.match(planner, /RouteConditionOverview/);
  assert.match(planner, /StageRouteConditionPanel/);
  assert.match(core, /existingCalculationsChanged: false/);
  assert.doesNotMatch(panel, /Math\.random|Date\.now|fetch\(/);
});

test("verändert die additive Streckenanalyse den produktiven Energie-Core nicht", () => {
  const energyInput: StageEnergyProjectionInput = {
    profile: elevationComparisonProfile,
    distanceKm: 40,
    elevationUp: 500,
    elevationDown: 300,
    elevationProfile: measuredClimbProfile(40, 500),
    elevationDataStatus: "measured"
  };
  const before = calculateStageEnergyProjection(energyInput);
  const analysis = analyzeRouteCondition({
    geometry: routeConditionGeometry,
    elevationPoints: conditionProfile([100, 250, 180]),
    elevationSource: "gpx",
    sourceSegments: conditionSources([{ from: 0, to: 1, surface: "gravel", highway: "track" }])
  });
  const after = calculateStageEnergyProjection(energyInput);

  assert.deepEqual(after, before);
  assert.equal(analysis.existingCalculationsChanged, false);
  assert.ok(analysis.segments.some((segment) => segment.resistance.energyDemandFactor > 1));
});

function optimizerCandidate(id: string, overrides: Partial<RouteCandidate> = {}): RouteCandidate {
  return {
    id,
    name: `Alternative ${id.toUpperCase()}`,
    source: {
      kind: "saved",
      label: "Gespeicherte Route",
      detail: "Unveränderte Testgeometrie",
      existingCandidateOfflineAvailable: true,
      newCandidateGeneration: "not_available"
    },
    geometry: {
      type: "LineString",
      coordinates: [[8 + id.length * 0.001, 50], [8.5 + id.length * 0.001, 50.3]]
    },
    geometryFingerprint: `geometry-${id}`,
    distanceKm: 80,
    travelTimeHours: 4,
    elevationUpM: 500,
    elevationDownM: 480,
    maximumGradePercent: 8,
    energyNeedWh: 420,
    destinationBatteryPercent: 32,
    minimumReservePercent: 24,
    chargingStops: 1,
    chargingTimeMinutes: 45,
    surfaceDistribution: [],
    asphaltPercent: 80,
    unpavedPercent: 15,
    unknownSurfacePercent: 5,
    comfortScore: 75,
    dataQualityLevel: "high",
    dataQualityScore: 90,
    warnings: [],
    modelVersions: { energy: "test-energy", charging: "test-charging" },
    ...overrides
  };
}

function optimizerWeights(overrides: Partial<RouteOptimizationWeights> = {}): RouteOptimizationWeights {
  return { ...routeOptimizationPresets.balanced.weights, ...overrides };
}

function optimizerConstraints(overrides: Partial<RouteOptimizationConstraints> = {}): RouteOptimizationConstraints {
  return { ...structuredClone(DEFAULT_ROUTE_OPTIMIZATION_CONSTRAINTS), ...overrides };
}

function optimizerResult(
  candidates: RouteCandidate[],
  weights = optimizerWeights(),
  constraints = optimizerConstraints()
) {
  return optimizeRouteCandidates({ candidates, weights, constraints, presetId: "custom", manualCandidateId: null });
}

test("bewertet ein, zwei und mehrere vorhandene Routenkandidaten ohne Geometrieänderung", () => {
  const candidates = [
    optimizerCandidate("a"),
    optimizerCandidate("b", { travelTimeHours: 3.5, energyNeedWh: 460 }),
    optimizerCandidate("c", { comfortScore: 88, asphaltPercent: 92 })
  ];
  const geometriesBefore = JSON.stringify(candidates.map((candidate) => candidate.geometry));

  assert.equal(optimizerResult(candidates.slice(0, 1)).evaluations.length, 1);
  assert.equal(optimizerResult(candidates.slice(0, 2)).evaluations.length, 2);
  assert.equal(optimizerResult(candidates).evaluations.length, 3);
  assert.equal(JSON.stringify(candidates.map((candidate) => candidate.geometry)), geometriesBefore);
});

test("liefert bei gleicher Eingabe unabhängig von Eingabereihenfolge exakt dasselbe Ergebnis", () => {
  const candidates = [
    optimizerCandidate("a", { travelTimeHours: 3.8 }),
    optimizerCandidate("b", { energyNeedWh: 350 }),
    optimizerCandidate("c", { comfortScore: 92 })
  ];
  const first = optimizerResult(candidates);
  const repeated = optimizerResult(candidates);
  const reordered = optimizerResult([candidates[2], candidates[0], candidates[1]]);

  assert.deepEqual(repeated, first);
  assert.deepEqual(reordered, first);
  assert.equal(first.inputFingerprint, repeated.inputFingerprint);
});

test("kennzeichnet identische Kandidaten als gleichwertig und nutzt nur einen stabilen technischen Tie-Breaker", () => {
  const left = optimizerCandidate("a");
  const right = optimizerCandidate("b", { geometry: left.geometry, geometryFingerprint: left.geometryFingerprint });
  const result = optimizerResult([right, left]);

  assert.equal(result.recommendation.candidateId, "a");
  assert.deepEqual(result.recommendation.equivalentCandidateIds, ["b"]);
  assert.equal(result.recommendation.technicalTieBreak, true);
  assert.equal(result.evaluations.filter((evaluation) => evaluation.recommended).length, 1);
});

test("prüft jede harte Grenze und mehrere gleichzeitige Verletzungen transparent", () => {
  const candidate = optimizerCandidate("limits");
  const violating: RouteOptimizationConstraints = {
    minimumDestinationReservePercent: { enabled: true, value: 40 },
    minimumAlongRouteReservePercent: { enabled: true, value: 30 },
    maximumChargingTimeMinutes: { enabled: true, value: 30 },
    maximumChargingStops: { enabled: true, value: 0 },
    maximumUnknownSurfacePercent: { enabled: true, value: 4 },
    maximumUnpavedPercent: { enabled: true, value: 10 },
    maximumGradePercent: { enabled: true, value: 7 },
    minimumDataQualityScore: { enabled: true, value: 95 }
  };
  const violations = evaluateRouteOptimizationConstraints(candidate, violating);

  assert.equal(violations.length, 8);
  assert.equal(new Set(violations.map((violation) => violation.constraint)).size, 8);
  assert.ok(violations.every((violation) => violation.message.includes(candidate.name)));
});

test("schließt bei unbekanntem Pflichtwert aus und empfiehlt nichts, wenn alle Grenzen verletzen", () => {
  const missing = optimizerCandidate("missing", { destinationBatteryPercent: null });
  const low = optimizerCandidate("low", { destinationBatteryPercent: 5 });
  const constraints = optimizerConstraints({ minimumDestinationReservePercent: { enabled: true, value: 20 } });
  const result = optimizerResult([missing, low], optimizerWeights(), constraints);

  assert.equal(result.status, "all_excluded");
  assert.equal(result.recommendation.candidateId, null);
  assert.ok(result.evaluations.some((evaluation) => evaluation.constraintViolations.some((violation) => violation.code === "unknown_required_value")));
});

test("normalisiert Gewichte deterministisch und weist Nullsumme sowie negative Werte ab", () => {
  const large = normalizeRouteOptimizationWeights(optimizerWeights({ travelTime: 1_000_000, energy: 500_000 }));
  const zero = normalizeRouteOptimizationWeights(Object.fromEntries(routeOptimizationObjectives.map((objective) => [objective, 0])) as RouteOptimizationWeights);
  const negative = normalizeRouteOptimizationWeights(optimizerWeights({ energy: -1 }));

  assert.equal(large.valid, true);
  assert.ok(Math.abs(routeOptimizationObjectives.reduce((sum, objective) => sum + large.normalizedWeights[objective], 0) - 1) < 1e-9);
  assert.equal(zero.valid, false);
  assert.equal(negative.valid, false);
});

test("weist ungültige harte Grenzen vor der Bewertung ab", () => {
  const invalid = optimizerResult(
    [optimizerCandidate("a")],
    optimizerWeights(),
    optimizerConstraints({
      maximumChargingStops: { enabled: true, value: 1.5 },
      minimumDestinationReservePercent: { enabled: true, value: 120 }
    })
  );

  assert.equal(invalid.status, "invalid");
  assert.ok(invalid.validationErrors.some((message) => message.includes("ganze Zahl")));
  assert.ok(invalid.validationErrors.some((message) => message.includes("100 Prozent")));
});

test("liefert für alle vordefinierten Strategien gültige reproduzierbare Bewertungen", () => {
  const candidates = [optimizerCandidate("a"), optimizerCandidate("b", { travelTimeHours: 3, energyNeedWh: 520 })];
  Object.entries(routeOptimizationPresets).forEach(([presetId, preset]) => {
    const first = optimizeRouteCandidates({ candidates, weights: preset.weights, constraints: optimizerConstraints(), presetId: presetId as keyof typeof routeOptimizationPresets });
    const repeated = optimizeRouteCandidates({ candidates, weights: preset.weights, constraints: optimizerConstraints(), presetId: presetId as keyof typeof routeOptimizationPresets });
    assert.equal(first.status, "ok");
    assert.deepEqual(repeated, first);
  });
});

test("behandelt identische Werte, Ausreißer und fehlende Werte ohne Division durch null", () => {
  const candidates = [
    optimizerCandidate("a", { travelTimeHours: 4, energyNeedWh: null }),
    optimizerCandidate("b", { travelTimeHours: 4, energyNeedWh: 400 }),
    optimizerCandidate("c", { travelTimeHours: 4, energyNeedWh: 410 }),
    optimizerCandidate("d", { travelTimeHours: 4, energyNeedWh: 10_000 })
  ];
  const result = optimizerResult(candidates);
  const missing = result.evaluations.find((evaluation) => evaluation.candidateId === "a")!;

  assert.equal(result.normalization.travelTime.method, "identical");
  assert.ok(["median-mad-clipped", "min-max"].includes(result.normalization.energy.method));
  assert.equal(missing.normalizedScores.energy, null);
  assert.ok(result.evaluations.every((evaluation) => Number.isFinite(evaluation.totalScore)));
  assert.equal(missing.paretoStatus, "not_comparable");
  assert.ok(missing.objectiveCoverage < 1);
});

test("bildet Dominanz, Zielkonflikte und mehrere Kandidaten auf der Pareto-Front korrekt ab", () => {
  const best = optimizerCandidate("best", { travelTimeHours: 3, energyNeedWh: 300 });
  const dominated = optimizerCandidate("dominated", { travelTimeHours: 5, energyNeedWh: 500 });
  const fast = optimizerCandidate("fast", { travelTimeHours: 2, energyNeedWh: 650 });
  const efficient = optimizerCandidate("efficient", { travelTimeHours: 6, energyNeedWh: 250 });
  const weights = Object.fromEntries(routeOptimizationObjectives.map((objective) => [objective, ["travelTime", "energy"].includes(objective) ? 1 : 0])) as RouteOptimizationWeights;
  const result = optimizerResult([dominated, fast, efficient, best], weights);

  assert.equal(result.evaluations.find((entry) => entry.candidateId === "dominated")?.paretoStatus, "dominated");
  assert.equal(result.evaluations.find((entry) => entry.candidateId === "best")?.paretoStatus, "front");
  assert.equal(result.evaluations.find((entry) => entry.candidateId === "fast")?.paretoStatus, "front");
  assert.equal(result.evaluations.find((entry) => entry.candidateId === "efficient")?.paretoStatus, "front");
  assert.ok(result.paretoRelations.some((relation) => relation.relation === "tradeoff"));
});

test("niedrige Datenqualität und unbekannte Oberflächen bleiben als eingeschränkte Empfehlung sichtbar", () => {
  const incomplete = optimizerCandidate("incomplete", {
    dataQualityLevel: "low",
    dataQualityScore: 20,
    asphaltPercent: null,
    unpavedPercent: null,
    unknownSurfacePercent: 100,
    comfortScore: null,
    warnings: ["Oberflächenquelle fehlt."]
  });
  const result = optimizerResult([incomplete]);
  const evaluation = result.evaluations[0];

  assert.equal(result.recommendation.limited, true);
  assert.equal(evaluation.recommendationLimited, true);
  assert.ok(evaluation.uncertainties.some((message) => message.includes("Oberflächen")));
});

test("speichert Vergleichszustand versioniert und liefert nach JSON-Reload dasselbe Ergebnis", () => {
  const candidates = [optimizerCandidate("a"), optimizerCandidate("b", { energyNeedWh: 340 })];
  const result = optimizerResult(candidates);
  const snapshot = routeOptimizationStateSnapshot(
    { ...DEFAULT_ROUTE_OPTIMIZATION_STATE, presetId: "custom" },
    candidates,
    result
  );
  const serialized = serializeRouteOptimizationStoredState(snapshot);
  const restored = normalizeRouteOptimizationStoredState(JSON.parse(serialized));
  const afterReload = optimizeRouteCandidates({
    candidates: JSON.parse(JSON.stringify(candidates)),
    weights: restored.weights,
    constraints: restored.constraints,
    presetId: restored.presetId,
    manualCandidateId: restored.manualCandidateId
  });

  assert.equal(restored.modelVersion, ROUTE_OPTIMIZATION_MODEL_VERSION);
  assert.deepEqual(afterReload, result);
  assert.equal(serializeRouteOptimizationStoredState(restored), serialized);
});

test("lädt alte TourStates ohne Optimierungsdaten abwärtskompatibel", () => {
  const legacy = parseStoredTourState(JSON.stringify({
    inputMode: "gpx",
    route: {
      name: "Legacy",
      startName: "Start",
      endName: "Ziel",
      profile: "balanced",
      distanceKm: 1,
      elevationUp: 0,
      elevationDown: 0,
      durationHours: 0.1,
      geometryGeoJson: { type: "LineString", coordinates: [[8, 50], [8.01, 50.01]] },
      elevationProfile: [],
      waypoints: []
    },
    stages: [],
    pois: [],
    updatedAt: "2026-08-04T12:00:00.000Z"
  }));

  assert.equal(legacy?.routeOptimization?.modelVersion, ROUTE_OPTIMIZATION_MODEL_VERSION);
  assert.equal(legacy?.routeOptimization?.presetId, "balanced");
});

test("adaptiert eine gespeicherte Tour mit echten Modellwerten ohne die Geometrie zu mutieren", () => {
  const geometry: LineStringGeoJson = { type: "LineString", coordinates: [[8, 50], [8.3, 50.2], [8.6, 50.35]] };
  const before = JSON.stringify(geometry);
  const distanceKm = routeDistanceKm(geometry.coordinates);
  const state = parseStoredTourState(JSON.stringify({
    libraryTourId: "optimizer-test",
    inputMode: "gpx",
    route: {
      name: "GPX-Alternative",
      startName: "Start",
      endName: "Ziel",
      profile: "balanced",
      distanceKm,
      elevationUp: 400,
      elevationDown: 300,
      durationHours: 4,
      geometryGeoJson: geometry,
      elevationSource: "gpx",
      elevationProfile: [
        { distanceKm: 0, elevationM: 100 },
        { distanceKm: distanceKm / 2, elevationM: 500 },
        { distanceKm, elevationM: 200 }
      ],
      waypoints: []
    },
    stages: [],
    pois: [],
    riderBikeProfile,
    updatedAt: "2026-08-04T12:00:00.000Z"
  }))!;
  const candidate = buildRouteCandidateFromStoredTour({ id: "tour:optimizer-test", name: "GPX-Alternative", state });

  assert.ok(candidate);
  assert.ok((candidate?.energyNeedWh ?? 0) > 0);
  assert.equal(candidate?.source.kind, "gpx");
  assert.equal(JSON.stringify(geometry), before);
  assert.equal(JSON.stringify(state.route?.geometryGeoJson), before);
});

test("integriert den Routenvergleich responsiv und hält die Fachlogik aus React heraus", () => {
  const page = readFileSync("src/app/planer/optimierung/page.tsx", "utf8");
  const client = readFileSync("src/components/RouteOptimizerClient.tsx", "utf8");
  const map = readFileSync("src/components/RouteMap.tsx", "utf8");
  const library = readFileSync("src/components/TourLibraryClient.tsx", "utf8");
  const core = readFileSync("src/lib/route-optimizer.ts", "utf8");

  assert.match(page, /RouteOptimizerClient/);
  assert.match(client, /sm:grid-cols-2/);
  assert.match(client, /xl:grid-cols/);
  assert.match(client, /overflow-x-auto/);
  assert.match(client, /vollständig offline bewertbar/);
  assert.match(map, /comparison-routes/);
  assert.match(library, /\/planer\/optimierung/);
  assert.doesNotMatch(core, /React|fetch\(|Math\.random|Date\.now/);
});

test("ordnet die fünf Hauptbereiche eindeutig und mit stabilem aktivem Zustand zu", () => {
  assert.deepEqual(APP_NAVIGATION_ITEMS.map((item) => item.label), ["Start", "Route", "Etappen", "Unterkünfte", "Reiseplan"]);
  assert.equal(activeNavigationId("/"), "start");
  assert.equal(activeNavigationId("/planer/route"), "route");
  assert.equal(activeNavigationId("/planer/etappen"), "stages");
  assert.equal(activeNavigationId("/planer/unterkuenfte"), "accommodations");
  assert.equal(activeNavigationId("/reiseplan"), "travel-plan");
  assert.equal(activeNavigationId("/einstellungen"), null);
});

test("vergibt Etappenfarben deterministisch und erweitert die Referenzpalette stabil", () => {
  assert.equal(stageColorForDay(1), STAGE_COLOR_PALETTE[0]);
  assert.equal(stageColorForDay(STAGE_COLOR_PALETTE.length), STAGE_COLOR_PALETTE.at(-1));
  assert.equal(stageColorForDay(12), stageColorForDay(12));
  assert.notEqual(stageColorForDay(9), stageColorForDay(10));
  assert.match(stageColorForDay(12), /^hsl\(/);
});

test("erzeugt Mini-Höhenprofile ausschließlich aus realen Punkten und hält fehlende Daten leer", () => {
  assert.equal(buildMiniElevationGeometry([]), null);
  assert.equal(buildMiniElevationGeometry([{ distanceKm: 0, elevationM: 120 }]), null);

  const geometry = buildMiniElevationGeometry([
    { distanceKm: 4, elevationM: 120 },
    { distanceKm: 8, elevationM: 260 },
    { distanceKm: 12, elevationM: 170 }
  ]);
  assert.ok(geometry);
  assert.equal(geometry?.minElevationM, 120);
  assert.equal(geometry?.maxElevationM, 260);
  assert.match(geometry?.linePath ?? "", /^M 4 /);
  assert.match(geometry?.areaPath ?? "", / Z$/);
});

test("speichert Darstellungsoptionen versioniert und normalisiert alte oder defekte Werte", () => {
  const changed = { ...DEFAULT_UI_PREFERENCES, showMiniElevationProfiles: false, mapStyle: "cycle" as const };
  assert.deepEqual(parseUiPreferences(serializeUiPreferences(changed)), changed);
  assert.deepEqual(parseUiPreferences("kein-json"), DEFAULT_UI_PREFERENCES);
  assert.deepEqual(normalizeUiPreferences({ showStageColors: false }), {
    ...DEFAULT_UI_PREFERENCES,
    showStageColors: false
  });
});

test("verwendet eine gemeinsame responsive Navigation und funktionale Darstellungsoptionen", () => {
  const shell = readFileSync("src/components/ShellNav.tsx", "utf8");
  const settings = readFileSync("src/components/SettingsClient.tsx", "utf8");
  const planner = readFileSync("src/components/PlannerClient.tsx", "utf8");
  const miniProfile = readFileSync("src/components/StageMiniElevationProfile.tsx", "utf8");

  assert.match(shell, /data-app-navigation="desktop"/);
  assert.match(shell, /data-app-navigation="bottom"/);
  assert.match(shell, /desktop:hidden/);
  assert.match(settings, /showMiniElevationProfiles/);
  assert.match(settings, /showStageColors/);
  assert.match(planner, /preferences\.showMiniElevationProfiles/);
  assert.match(planner, /preferences\.showPois/);
  assert.match(miniProfile, /data-mini-elevation-empty/);
});
